"""Gọi Gemini API bằng thư viện chuẩn của Python (không cần cài SDK).

Khoá API lấy từ biến môi trường GEMINI_API_KEY. Không bao giờ ghi khoá vào file.

- generate(model, request)            : gọi thẳng models/{model}:generateContent (1 yêu cầu).
- Batch(...)                          : gửi lô qua Batch API (rẻ một nửa): tải file JSONL lên,
                                        tạo lô, chờ, tải kết quả. Lưu tên lô vào file trạng thái
                                        để chạy lại thì tiếp tục chờ lô cũ, không gửi lại (không tốn thêm).

Hình dạng yêu cầu theo tài liệu chính thức (10/2026):
  https://ai.google.dev/gemini-api/docs/batch-mode
  https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
  https://ai.google.dev/gemini-api/docs/generate-content/image-generation
"""
import base64, json, os, pathlib, sys, time, urllib.error, urllib.request

BASE = "https://generativelanguage.googleapis.com"


def key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k:
        sys.exit("Thiếu khoá: chạy  export GEMINI_API_KEY=...  rồi chạy lại.")
    return k


class ApiError(Exception):
    def __init__(self, code, body):
        super().__init__(f"HTTP {code}: {body[:800]}")
        self.code, self.body = code, body


def http(method, url, body=None, headers=None, raw=False, timeout=600):
    h = {"x-goog-api-key": key()}
    h.update(headers or {})
    data = None
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            data = bytes(body)
        else:
            data = json.dumps(body).encode()
            h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = r.read()
            if raw:
                return payload, dict(r.headers)
            return json.loads(payload or b"{}")
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read().decode("utf-8", "replace"))


def generate(model, request, retries=4):
    """Một lời gọi generateContent, thử lại khi gặp 429/5xx."""
    url = f"{BASE}/v1beta/models/{model}:generateContent"
    for i in range(retries + 1):
        try:
            return http("POST", url, request)
        except ApiError as e:
            if e.code in (429, 500, 502, 503, 504) and i < retries:
                wait = 20 * (i + 1)
                print(f"  … {e.code}, đợi {wait}s rồi thử lại", file=sys.stderr)
                time.sleep(wait)
                continue
            raise


def inline_parts(response):
    """Trả về danh sách (mime, bytes) của mọi phần inlineData trong một GenerateContentResponse."""
    out = []
    for c in (response or {}).get("candidates", []) or []:
        for p in ((c.get("content") or {}).get("parts") or []):
            d = p.get("inlineData") or p.get("inline_data")
            if d and d.get("data"):
                out.append((d.get("mimeType") or d.get("mime_type") or "", base64.b64decode(d["data"])))
    return out


def why_empty(response):
    c = ((response or {}).get("candidates") or [{}])[0]
    fb = (response or {}).get("promptFeedback") or {}
    return f"finishReason={c.get('finishReason')} promptFeedback={json.dumps(fb)[:300]}"


# ------------------------------------------------------------------ Batch API
def _upload_jsonl(path, display):
    size = path.stat().st_size
    _, hdr = http("POST", f"{BASE}/upload/v1beta/files", {"file": {"display_name": display}}, headers={
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(size),
        "X-Goog-Upload-Header-Content-Type": "application/jsonl",
    }, raw=True)
    up = {k.lower(): v for k, v in hdr.items()}.get("x-goog-upload-url")
    if not up:
        raise RuntimeError("Không nhận được x-goog-upload-url")
    res = http("POST", up, path.read_bytes(), headers={
        "Content-Length": str(size), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize"})
    return res["file"]["name"]


def _find(obj, names):
    """Tìm giá trị đầu tiên có khoá thuộc names ở bất kỳ độ sâu nào (phản hồi REST của Batch có vài dạng)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in names and isinstance(v, str):
                return v
        for v in obj.values():
            r = _find(v, names)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _find(v, names)
            if r:
                return r
    return None


def _find_obj(obj, name):
    if isinstance(obj, dict):
        if isinstance(obj.get(name), dict):
            return obj[name]
        for v in obj.values():
            r = _find_obj(v, name)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _find_obj(v, name)
            if r:
                return r
    return None


class Batch:
    """Một lô Batch API, có file trạng thái để tiếp tục khi chạy lại."""

    DONE_OK = {"JOB_STATE_SUCCEEDED", "BATCH_STATE_SUCCEEDED"}
    DONE_BAD = {"JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED",
                "BATCH_STATE_FAILED", "BATCH_STATE_CANCELLED", "BATCH_STATE_EXPIRED"}

    def __init__(self, model, state_file, workdir):
        self.model, self.state_file, self.workdir = model, pathlib.Path(state_file), pathlib.Path(workdir)

    def pending(self):
        if self.state_file.exists():
            return json.loads(self.state_file.read_text())
        return None

    def submit(self, items, display):
        """items: list of (key, request). Trả về tên lô (batches/...)."""
        self.workdir.mkdir(parents=True, exist_ok=True)
        src = self.workdir / f"{display}-input.jsonl"
        with open(src, "w", encoding="utf-8") as f:
            for k, req in items:
                f.write(json.dumps({"key": k, "request": req}, ensure_ascii=False) + "\n")
        mb = src.stat().st_size / 1e6
        print(f"Tải lên {src.name} ({len(items)} yêu cầu, {mb:.1f} MB)…")
        fname = _upload_jsonl(src, display)
        job = http("POST", f"{BASE}/v1beta/models/{self.model}:batchGenerateContent",
                   {"batch": {"display_name": display, "input_config": {"file_name": fname}}})
        name = job.get("name") or _find(job, {"name"})
        self.state_file.write_text(json.dumps({"name": name, "model": self.model, "keys": [k for k, _ in items],
                                               "submitted": time.strftime("%Y-%m-%d %H:%M")}, indent=1))
        print("Đã tạo lô:", name)
        return name

    def wait(self, every=60, no_wait=False):
        st = self.pending()
        name = st["name"]
        while True:
            job = http("GET", f"{BASE}/v1beta/{name}")
            state = _find(job, {"state"}) or "?"
            print(time.strftime("%H:%M:%S"), name, state, flush=True)
            if state in self.DONE_OK:
                return job
            if state in self.DONE_BAD:
                self.state_file.unlink()
                raise RuntimeError(f"Lô kết thúc với trạng thái {state}: {json.dumps(job)[:800]}")
            if no_wait:
                return None
            time.sleep(every)

    def results(self, job):
        """Tải file kết quả; trả về dict key -> response (hoặc {'error': ...})."""
        fname = _find(job, {"responsesFile", "responses_file"})
        if not fname:  # một số ví dụ đọc .dest.fileName / .output...; tuyệt đối không lấy inputConfig.fileName
            for sub in ("dest", "output"):
                o = _find_obj(job, sub)
                fname = fname or (o and _find(o, {"fileName", "file_name"}))
        out = {}
        if fname and fname.startswith("files/"):
            raw, _ = http("GET", f"{BASE}/download/v1beta/{fname}:download?alt=media", raw=True)
            dst = self.workdir / (pathlib.Path(self.state_file).stem + "-output.jsonl")
            dst.write_bytes(raw)
            for line in raw.decode("utf-8").splitlines():
                if not line.strip():
                    continue
                o = json.loads(line)
                k = o.get("key") or (o.get("metadata") or {}).get("key")
                out[k] = o.get("response") if "response" in o else {"error": o.get("error") or o.get("status") or o}
        else:  # kết quả trả về trực tiếp (inlinedResponses)
            def walk(x):
                if isinstance(x, dict):
                    if "response" in x and isinstance(x.get("metadata"), dict) and "key" in x["metadata"]:
                        out[x["metadata"]["key"]] = x["response"]
                    for v in x.values():
                        walk(v)
                elif isinstance(x, list):
                    for v in x:
                        walk(v)
            walk(job)
        return out

    def done(self):
        if self.state_file.exists():
            self.state_file.unlink()
