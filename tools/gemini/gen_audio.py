#!/usr/bin/env python3
"""Tạo file nghe (mp3) cho phần Luyện nghe bằng Gemini TTS.

Nguồn: src/chuyen-anh-14-ngay/content/web/dayNN.json → listening.{nen,chuan,nang}.{part1,part2}
Kết quả: chuyen-anh-14-ngay/audio/dNN-<track>-p1.mp3 / -p2.mp3 và chuyen-anh-14-ngay/audio/manifest.json

  python3 tools/gemini/gen_audio.py --dry-run                         # xem trước, đếm ký tự, ước tính giây & tiền
  python3 tools/gemini/gen_audio.py --direct --only day05:chuan:part1  # thử nhanh 1 bài (gọi thẳng)
  python3 tools/gemini/gen_audio.py --batch                            # cả khoá qua Batch API (rẻ một nửa)
  python3 tools/gemini/gen_audio.py --list-voices                      # liệt kê giọng en-GB trong thư viện giọng

Chạy lại bao nhiêu lần cũng được: file mp3 đã có thì bỏ qua; lô đang chờ thì tiếp tục chờ lô đó.
"""
import argparse, io, json, pathlib, re, shutil, subprocess, sys, urllib.parse, wave

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gemini_api as G

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
SRC = REPO / "src/chuyen-anh-14-ngay/content/web"
OUT = REPO / "chuyen-anh-14-ngay/audio"
WORK = HERE / "work/audio"
MANIFEST = OUT / "manifest.json"
CFG = json.loads((HERE / "voices.json").read_text(encoding="utf-8"))
MODEL = CFG.get("model", "gemini-3.8-flash-tts")
TRACKS = ("nen", "chuan", "nang")
PARTS = ("part1", "part2")

# 30 giọng có sẵn (tài liệu speech-generation, 10/2026). Giới tính theo danh mục giọng Chirp 3 HD cùng tên của Google.
PREBUILT = {
    "Zephyr": "f", "Puck": "m", "Charon": "m", "Kore": "f", "Fenrir": "m", "Leda": "f", "Orus": "m", "Aoede": "f",
    "Callirrhoe": "f", "Autonoe": "f", "Enceladus": "m", "Iapetus": "m", "Umbriel": "m", "Algieba": "m", "Despina": "f",
    "Erinome": "f", "Algenib": "m", "Rasalgethi": "m", "Laomedeia": "f", "Achernar": "f", "Alnilam": "m", "Schedar": "m",
    "Gacrux": "f", "Pulcherrima": "f", "Achird": "m", "Zubenelgenubi": "m", "Vindemiatrix": "f", "Sadachbia": "m",
    "Sadaltager": "m", "Sulafat": "f",
}
# Giá (USD / 1 triệu token) theo trang pricing, áp dụng đến 31/12/2026. 25 token audio = 1 giây.
PRICE = {"direct": (0.50, 9.00), "batch": (0.25, 4.50)}
TOK_PER_SEC = 25
CPS = {"nen": 12.5, "chuan": 14.0, "nang": 15.0}  # ký tự/giây để ước tính độ dài

FEMALE_NAMES = {"mai", "linh", "lan", "hoa", "anna", "lucy", "emma"}
MALE_NAMES = {"nam", "tom", "ben", "minh", "brown"}


def narrator_gender(day, track, script):
    ov = CFG.get("narrator_gender", {}).get(f"{day:02d}/{track}") or CFG.get("narrator_gender", {}).get(f"{day}/{track}")
    if ov:
        return ov
    m = re.search(r"(?i:my name is|I'm|I am|this is)\s+(?:(Mr|Mrs|Ms|Miss|Doctor|Dr)\.?\s+)?([A-Z][a-z]+)", script)
    if m:
        t, n = (m.group(1) or "").lower(), m.group(2).lower()
        if t in ("mrs", "ms", "miss"):
            return "female"
        if t == "mr":
            return "male"
        if n in FEMALE_NAMES:
            return "female"
        if n in MALE_NAMES:
            return "male"
    return "female" if (day + TRACKS.index(track)) % 2 else "male"


def speaker_voice(sp):
    v = CFG.get("by_name", {}).get(sp["name"])
    return v or CFG["default"]["male" if sp.get("voice") == "male" else "female"]


def voice_cfg(v, shape):
    # Tài liệu 3.8 (generateContent, một giọng): "voiceConfig": {"voice": "Kore"}; dạng cũ: prebuiltVoiceConfig.voiceName.
    if shape == "legacy" and v in PREBUILT:
        return {"prebuiltVoiceConfig": {"voiceName": v}}
    return {"voice": v}


def single_request(text, style, voice, shape):
    return {"contents": [{"role": "user", "parts": [{"text": text, "speech_metadata": {"style": style}}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": voice_cfg(voice, shape)}}}


def jobs():
    """Mỗi job = 1 file mp3; gồm 1 hoặc nhiều đoạn (segment) = 1 yêu cầu API mỗi đoạn."""
    out = []
    for day in range(1, 15):
        L = json.loads((SRC / f"day{day:02d}.json").read_text(encoding="utf-8")).get("listening") or {}
        for tr in TRACKS:
            for pt in PARTS:
                P = (L.get(tr) or {}).get(pt)
                if not P:
                    continue
                key = f"{day:02d}/{tr}/{pt}"
                fname = f"d{day:02d}-{tr}-p{pt[-1]}.mp3"
                style = CFG["style"][tr]
                if isinstance(P["script"], list):  # hội thoại 2 giọng
                    sps = P["speakers"]
                    names = [s["name"] for s in sps]
                    voices = [speaker_voice(s) for s in sps]
                    lines = [(names[x["s"]], x["t"]) for x in P["script"]]
                    chars = sum(len(t) for _, t in lines)
                    if len(sps) <= 2 and all(v in PREBUILT for v in voices):
                        req = {"contents": [{"role": "user", "parts": [
                                   {"text": t, "speech_metadata": {"speaker": n, "style": style}} for n, t in lines]}],
                               "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"multiSpeakerVoiceConfig": {
                                   "speakerVoiceConfigs": [{"speaker": n, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v}}}
                                                           for n, v in zip(names, voices)]}}}}
                        segs = [(key, req)]
                    else:  # giọng ngoài 30 giọng có sẵn: đọc từng lượt rồi ghép (tài liệu: multi-speaker chỉ nhận giọng có sẵn)
                        vmap = dict(zip(names, voices))
                        segs = [(f"{key}#{i:02d}", ("turn", t, vmap[n])) for i, (n, t) in enumerate(lines)]
                    who = " + ".join(f"{n}={v}" for n, v in zip(names, voices))
                else:  # độc thoại 1 giọng
                    g = narrator_gender(day, tr, P["script"])
                    v = CFG["narrator"][g]
                    chars = len(P["script"])
                    segs = [(key, ("turn", P["script"], v))]
                    who = f"narrator({g})={v}"
                est = chars / CPS[tr] + (len(P["script"]) * 0.4 if isinstance(P["script"], list) else 0)
                out.append({"key": key, "file": fname, "segs": segs, "chars": chars, "est": est, "who": who,
                            "style": style, "track": tr, "nturns": len(P["script"]) if isinstance(P["script"], list) else 1})
    return out


def materialize(seg, style, shape):
    k, r = seg
    if isinstance(r, tuple):
        _, text, v = r
        return k, single_request(text, style, v, shape)
    return k, r


def select(all_jobs, only):
    if not only:
        return all_jobs
    pats = [p.strip() for o in only for p in o.split(",") if p.strip()]
    sel = []
    for j in all_jobs:
        d, tr, pt = j["key"].split("/")
        for p in pats:
            bits = p.lower().replace("day", "").split(":")
            if bits[0] and int(bits[0]) != int(d):
                continue
            if len(bits) > 1 and bits[1] and bits[1] != tr:
                continue
            if len(bits) > 2 and bits[2] and "part" + bits[2].lstrip("part") != pt:
                continue
            sel.append(j)
            break
    return sel


# ------------------------------------------------------------------ âm thanh
def ffmpeg_bin():
    b = shutil.which("ffmpeg")
    if b:
        return b
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("Cần ffmpeg: cài bằng  pip install --break-system-packages imageio-ffmpeg  (hoặc apt install ffmpeg).")


def to_pcm(mime, data):
    """Trả về (pcm16 mono bytes, sample_rate). Gemini 3.8 trả WAV; model cũ trả L16 thô (audio/L16;rate=24000)."""
    if data[:4] == b"RIFF":
        with wave.open(io.BytesIO(data)) as w:
            if w.getsampwidth() != 2 or w.getnchannels() != 1:
                raise ValueError(f"WAV không phải 16-bit mono: {w.getparams()}")
            return w.readframes(w.getnframes()), w.getframerate()
    m = re.search(r"rate=(\d+)", mime or "")
    return data, int(m.group(1)) if m else 24000


def write_wav(path, pcm, rate):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)


def encode_mp3(wav, mp3):
    """WAV → mp3 mono 48 kbps 24 kHz (iPhone Safari phát được), chuẩn hoá âm lượng, thêm 0,3 s lặng ở đầu."""
    mp3.parent.mkdir(parents=True, exist_ok=True)
    tmp = mp3.with_suffix(".tmp.mp3")
    subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                    "-af", "adelay=300:all=1,loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "24000",
                    "-c:a", "libmp3lame", "-b:a", "48k", str(tmp)], check=True)
    tmp.replace(mp3)


def duration(path):
    ff = ffmpeg_bin()
    probe = shutil.which("ffprobe")
    if probe:
        r = subprocess.run([probe, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
                           capture_output=True, text=True)
        try:
            return round(float(r.stdout.strip()), 1)
        except ValueError:
            pass
    r = subprocess.run([ff, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)), 1) if m else None


def update_manifest():
    """Ghi lại manifest từ các file mp3 đang có (giữ số giây đã đo)."""
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    man = {}
    for j in jobs():
        p = OUT / j["file"]
        if p.exists():
            sec = (old.get(j["key"]) or {}).get("seconds") if (old.get(j["key"]) or {}).get("file") == "audio/" + j["file"] else None
            man[j["key"]] = {"file": "audio/" + j["file"], "seconds": sec or duration(p)}
    if man:
        OUT.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    return man


def finish(job, seg_audio):
    """seg_audio: key -> (mime, bytes). Ghép, lưu WAV vào work/, mã hoá mp3."""
    pcms, rate = [], None
    gap = CFG.get("pause_between_turns", {}).get(job["track"], 0.4)
    for k, _ in job["segs"]:
        mime, data = seg_audio[k]
        pcm, r = to_pcm(mime, data)
        if rate and r != rate:
            raise ValueError("Các đoạn khác sample rate")
        rate = r
        if pcms and len(job["segs"]) > 1:
            pcms.append(b"\0\0" * int(rate * gap))
        pcms.append(pcm)
    wav = WORK / "wav" / job["file"].replace(".mp3", ".wav")
    write_wav(wav, b"".join(pcms), rate)
    encode_mp3(wav, OUT / job["file"])
    print(f"  ✓ {job['file']}  {duration(OUT / job['file'])} s")


def audio_from(resp):
    parts = G.inline_parts(resp)
    if not parts:
        raise ValueError("không có audio: " + G.why_empty(resp))
    return parts[-1]


# ------------------------------------------------------------------ main
def cost(js, shape):
    tin = sum(len(json.dumps(materialize(s, j["style"], shape)[1]["contents"])) / 4 for j in js for s in j["segs"])
    sec = sum(j["est"] for j in js)
    tout = sec * TOK_PER_SEC
    return tin, sec, tout, {m: tin / 1e6 * p[0] + tout / 1e6 * p[1] for m, p in PRICE.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    m = ap.add_mutually_exclusive_group(required=True)
    m.add_argument("--dry-run", action="store_true", help="in yêu cầu, đếm ký tự, ước tính giây và chi phí (không gọi API)")
    m.add_argument("--batch", action="store_true", help="gửi qua Batch API (giá một nửa), chờ, tải và giải mã")
    m.add_argument("--direct", action="store_true", help="gọi thẳng từng yêu cầu (để thử nhanh)")
    m.add_argument("--list-voices", action="store_true", help="liệt kê giọng en-GB / British trong thư viện giọng")
    m.add_argument("--manifest", action="store_true", help="chỉ ghi lại manifest.json từ các mp3 đang có")
    ap.add_argument("--only", action="append", help="vd day05:chuan:part1 hoặc day05 hoặc day05:nang (lặp lại được)")
    ap.add_argument("--no-wait", action="store_true", help="--batch: gửi lô rồi thoát; chạy lại lệnh sau để lấy kết quả")
    ap.add_argument("--voice-shape", choices=["new", "legacy"], default="new",
                    help="dạng voiceConfig cho 1 giọng: new = {voice: X} (tài liệu 3.8), legacy = prebuiltVoiceConfig.voiceName")
    ap.add_argument("--show", type=int, default=1, help="--dry-run: số yêu cầu mẫu in đầy đủ (mặc định 1)")
    a = ap.parse_args()

    if a.list_voices:
        q = urllib.parse.urlencode([("language_code", "en-GB"), ("page_size", "100")])
        r = G.http("GET", f"{G.BASE}/v1beta/voices?{q}")
        for v in r.get("voices", []):
            print(f"{v.get('id', ''):32} {v.get('display_name') or v.get('displayName', ''):28} {v.get('gender', ''):7} "
                  f"{v.get('accent', '')} {v.get('language_code') or v.get('languageCode', '')} — {(v.get('description') or '')[:70]}")
        if r.get("nextPageToken") or r.get("next_page_token"):
            print("(còn trang sau)")
        return
    if a.manifest:
        print(len(update_manifest()), "mục trong", MANIFEST)
        return

    all_jobs = select(jobs(), a.only)
    if not all_jobs:
        sys.exit("Không có bài nào khớp --only")
    todo = [j for j in all_jobs if not (OUT / j["file"]).exists()]
    # đã có WAV trong work/ (đã trả tiền) nhưng chưa có mp3 → chỉ mã hoá lại
    for j in list(todo):
        wav = WORK / "wav" / j["file"].replace(".mp3", ".wav")
        if wav.exists() and not a.dry_run:
            encode_mp3(wav, OUT / j["file"]); todo.remove(j); print("  mã hoá lại từ WAV:", j["file"])

    if a.dry_run:
        print(f"Model: {MODEL}   voice-shape: {a.voice_shape}")
        print(f"{'key':18} {'file':20} {'ký tự':>6} {'~giây':>6} {'yêu cầu':>7}  giọng")
        for j in all_jobs:
            mark = "" if j in todo else "  (đã có, bỏ qua)"
            print(f"{j['key']:18} {j['file']:20} {j['chars']:6d} {j['est']:6.0f} {len(j['segs']):7d}  {j['who']}{mark}")
        for j in todo[:a.show]:
            k, req = materialize(j["segs"][0], j["style"], a.voice_shape)
            print(f"\n--- Yêu cầu mẫu ({k}) → POST {G.BASE}/v1beta/models/{MODEL}:generateContent")
            print(json.dumps(req, ensure_ascii=False, indent=1)[:3000])
        tin, sec, tout, usd = cost(todo, a.voice_shape)
        n = sum(len(j["segs"]) for j in todo)
        print(f"\nCần tạo: {len(todo)} file / {len(all_jobs)} ({n} yêu cầu API), {sum(j['chars'] for j in todo)} ký tự")
        print(f"Ước tính: ~{sec / 60:.0f} phút audio = {tout:,.0f} token ra; ~{tin:,.0f} token vào")
        print(f"Chi phí ước tính:  Batch ${usd['batch']:.2f}   |   gọi thẳng ${usd['direct']:.2f}   (giá đến 31/12/2026; free tier gọi thẳng: $0)")
        return

    if not todo:
        print("Tất cả file đã có.")
        update_manifest()
        return

    if a.direct:
        for j in todo:
            print(j["key"], "→", j["file"], j["who"])
            got = {}
            for s in j["segs"]:
                k, req = materialize(s, j["style"], a.voice_shape)
                got[k] = audio_from(G.generate(MODEL, req))
            finish(j, got)
            update_manifest()
    else:
        B = G.Batch(MODEL, WORK / "batch-state.json", WORK)
        if not B.pending():
            items = [materialize(s, j["style"], a.voice_shape) for j in todo for s in j["segs"]]
            tin, sec, tout, usd = cost(todo, a.voice_shape)
            print(f"Gửi lô {len(items)} yêu cầu ({len(todo)} file), ước tính ${usd['batch']:.2f}")
            B.submit(items, "ca14-audio")
        else:
            print("Đang có lô chưa xong, tiếp tục chờ:", B.pending()["name"])
        job = B.wait(no_wait=a.no_wait)
        if job is None:
            print("Lô chưa xong. Chạy lại đúng lệnh này sau để lấy kết quả.")
            return
        res = B.results(job)
        ok = bad = 0
        for j in todo:
            try:
                got = {}
                for k, _ in j["segs"]:
                    r = res.get(k)
                    if r is None or "error" in r and "candidates" not in r:
                        raise ValueError(f"lỗi {k}: {json.dumps(r)[:300] if r else 'không có kết quả'}")
                    got[k] = audio_from(r)
                finish(j, got); ok += 1
            except Exception as e:
                bad += 1; print("  ✗", j["key"], e)
        B.done()
        print(f"Xong lô: {ok} file mới, {bad} lỗi" + (" (chạy lại lệnh để gửi lại những bài lỗi)" if bad else ""))
    man = update_manifest()
    print(len(man), "mục trong", MANIFEST, "→ chạy  python3 src/chuyen-anh-14-ngay/build.py")


if __name__ == "__main__":
    main()
