"""Dựng trang Chuyên Anh 14 Ngày từ nội dung trong content/.

Chạy:  python3 src/chuyen-anh-14-ngay/build.py
Kết quả:
  chuyen-anh-14-ngay/index.html  — trang học sinh (GitHub Pages)
  co/index.html                  — trang theo dõi của cô
  apps-script/Keys.gs            — đáp án bài giấy cho máy chủ chấm bài (dán vào Apps Script)
"""
import json, pathlib, re, os

here = pathlib.Path(__file__).parent
repo = here.parent.parent

days = [json.load(open(here / f"content/day{n:02d}.json", encoding="utf-8")) for n in range(1, 15)]
tests = json.load(open(here / "content/tests.json", encoding="utf-8"))
web = {}
for n in range(1, 15):
    p = here / f"content/web/day{n:02d}.json"
    if p.exists():
        w = json.load(open(p, encoding="utf-8")); web[n] = {k: w[k] for k in ("grammar_games", "exam", "exam_easy", "exam_plus", "paper_plus", "listening") if k in w}
mp = here / "content/web/media.json"
media = json.load(open(mp, encoding="utf-8")) if mp.exists() else {}
ml = here / "content/web/media_listen.json"
media_listen = json.load(open(ml, encoding="utf-8")) if ml.exists() else {}
mv = here / "content/web/media_vi.json"
media_vi = json.load(open(mv, encoding="utf-8")) if mv.exists() else {}
# file nghe do tools/gemini/gen_audio.py tạo: "NN/track/partN" -> {file, seconds}; chưa có thì trang dùng giọng đọc của trình duyệt
au = repo / "chuyen-anh-14-ngay" / "audio" / "manifest.json"
audio = json.load(open(au, encoding="utf-8")) if au.exists() else None
C = {"days": days, "tests": tests, "web": web, "media": media, "media_vi": media_vi, "media_listen": media_listen}
tl = here / "content/test_local.json"
if tl.exists():
    C["test_local"] = json.load(open(tl, encoding="utf-8"))
C["local_pack"] = {k: v for k, v in json.load(open(here / "content/web/local_pack.json", encoding="utf-8")).items() if not k.startswith("_")}
# bài nghe thu âm thật (YouTube nhúng) + câu hỏi riêng theo mức: content/web/real_listen_<mức>.json
real_listen = {}
for tr in ("nen", "chuan", "nang"):
    f = here / f"content/web/real_listen_{tr}.json"
    if f.exists():
        real_listen[tr] = json.load(open(f, encoding="utf-8"))
if real_listen:
    C["real_listen"] = real_listen
if audio:
    C["audio"] = audio
blob = json.dumps(C, ensure_ascii=False).replace("</", "<\\/")
cfg = json.load(open(here / "config.json", encoding="utf-8"))
api = json.dumps(os.environ.get("API_URL_OVERRIDE", cfg.get("apiUrl", "")))

# vùng tuyển sinh: regions/<slug>.json (đã chuẩn hoá); _list.json là 34 tỉnh/thành mới
rdir = here / "regions"
REG = {p.stem: json.load(open(p, encoding="utf-8")) for p in sorted(rdir.glob("*.json")) if not p.name.startswith("_")}
CALC_KEYS = ["slug", "name", "merged_from", "edition", "exam_md", "papers", "formulas", "m3_label", "exams", "nv2_exam", "nv_rule", "options", "goals", "goal_default", "formula_note"]
# độ khớp giữa dạng bài trong đề của sở và chương trình 14 buổi (+ gói dạng riêng content/web/local_pack.json)
FMT_VI = {"sentence_completion": "Trắc nghiệm ngữ pháp, từ vựng", "dialogue_completion": "Hoàn thành hội thoại", "synonym": "Đồng nghĩa", "antonym": "Trái nghĩa",
  "closest_meaning": "Câu gần nghĩa nhất", "pronunciation": "Phát âm", "stress": "Trọng âm", "cloze": "Đọc điền từ trắc nghiệm", "error_id": "Tìm lỗi sai",
  "sentence_combining": "Kết hợp câu", "transformation": "Viết lại câu", "open_cloze": "Điền một từ vào đoạn văn", "word_formation": "Cấu tạo từ",
  "reading_mcq": "Đọc hiểu trắc nghiệm", "matching_headings": "Nối tiêu đề, nối thông tin", "dialogue_order": "Sắp xếp câu, hội thoại", "listening": "Nghe",
  "key_word": "Viết lại câu với từ cho sẵn", "gap_text": "Điền câu vào bài đọc", "true_false": "Đọc hiểu Đúng/Sai/Không có thông tin",
  "essay": "Bài luận", "paragraph_writing": "Viết đoạn văn", "guided_writing": "Viết thư, email", "speaking": "Thi nói", "other": "Dạng khác"}
COV_FULL = {"sentence_completion", "dialogue_completion", "synonym", "antonym", "closest_meaning", "pronunciation", "stress", "cloze", "sentence_combining",
  "transformation", "word_formation", "reading_mcq", "dialogue_order", "listening"}
PACK_OF = {"essay": "essay", "paragraph_writing": "essay", "guided_writing": "essay", "gap_text": "gap_text", "true_false": "true_false",
  "open_cloze": "open_cloze", "key_word": "key_word", "matching_headings": "matching_headings", "speaking": "speaking"}
PACK_HN = ["essay", "open_cloze", "key_word", "matching_headings"]
# sở chưa rõ đề: 4 dạng gặp nhiều nhất trong đề 21 sở đã có cấu trúc (viết 21/21, điền một từ 17, viết lại câu với từ cho sẵn 15, nối tiêu đề 9)
PACK_DEFAULT = ["essay", "open_cloze", "key_word", "matching_headings"]
def sec_kind(x):
    f, n = x.get("format") or "other", (x.get("note") or "").lower()
    if f == "other" and re.search(r"speaking|thi nói|nói trực tiếp", n): return "speaking"
    if f != "listening" and re.search(r"listening|\bnghe\b|bài nói", n): return "listening"
    return f
def coverage(r):
    secs = (r.get("paper") or {}).get("sections") or []
    # quá ít phần (chỉ biết "có nghe", "có viết") thì coi như chưa rõ cấu trúc
    if len({x.get("format") for x in secs if x.get("format") != "other"}) < 3: return None
    rows, seen = [], {}
    for x in secs:
        k = sec_kind(x)
        if k in seen and k != "other":
            rows[seen[k]]["items"] = (rows[seen[k]]["items"] or 0) + (x.get("items") or 0) or None; continue
        n = (x.get("note") or "").lower()
        if k in COV_FULL: st, why = "full", ""
        elif k == "error_id": st, why = ("part", "14 buổi luyện tìm lỗi trắc nghiệm; đề sở yêu cầu tự sửa lỗi") if "sửa" in n else ("full", "")
        elif k in PACK_OF: st, why = "pack", ""
        else: st, why = "part", "Luyện gián tiếp qua phần ngữ pháp, từ vựng"
        if k == "paragraph_writing": why = "14 buổi viết đoạn ngắn; gói riêng có bài 150–250 từ"
        if k == "guided_writing": why = "Luyện qua bài viết trong gói riêng; chưa có bài thư mẫu"
        if k == "other" and re.search(r"viết|writing", n): why = "Luyện qua bài luận trong gói riêng"
        lab = FMT_VI.get(k, k)
        if k == "other":
            lab = re.split(r"[(:;.,—]", re.sub(r"^[^:]{0,40}:\s*", "", x.get("note") or "") or "Dạng khác")[0].strip()[:48] or "Dạng khác"
            lab = lab[0].upper() + lab[1:]
        seen[k] = len(rows); rows.append({"k": k, "label": lab, "items": x.get("items"), "st": st, "why": why})
    return rows
def pack_for(r):
    if r.get("slug") == "ha-noi": return PACK_HN
    rows = coverage(r)
    if not rows:
        # chưa rõ khung đề nhưng văn bản sở xác nhận có thi nói (Lào Cai)
        return PACK_DEFAULT + (["speaking"] if ((r.get("paper") or {}).get("predicted") or {}).get("speaking") else [])
    pri = lambda row: (0 if PACK_OF[row["k"]] == "essay" else 1, -(row["items"] or 0))
    out = []
    for row in sorted([x for x in rows if x["k"] in PACK_OF], key=pri):
        if PACK_OF[row["k"]] not in out: out.append(PACK_OF[row["k"]])
    return out or PACK_DEFAULT
def calc_view(r):
    v = {k: r[k] for k in CALC_KEYS if k in r}
    v["pack"] = pack_for(r)
    pr = (r.get("paper") or {}).get("predicted")
    if pr and pr.get("used"): v["pred"] = {"confidence": pr.get("confidence")}
    cov = coverage(r)
    if cov: v["cov"] = cov
    hl = (r.get("paper") or {}).get("has_listening")
    if hl is False or (cov and not any(x["k"] == "listening" for x in cov)): v["no_listen"] = True
    v["papers"] = {k: {kk: pv[kk] for kk in ("map", "label", "ac_add", "ac_cap", "ac_label") if kk in pv} for k, pv in r.get("papers", {}).items()}
    if r.get("paper"):
        v["paper"] = {"sections": [{"format": x.get("format"), "items": x.get("items")} for x in r["paper"].get("sections") or []]}
    return v
RLIST = [dict(r, has=r["slug"] in REG) for r in json.load(open(rdir / "_list.json", encoding="utf-8"))]
school_js = (here / "school.js").read_text(encoding="utf-8").replace("__REGIONS__", json.dumps({k: calc_view(v) for k, v in REG.items()}, ensure_ascii=False)).replace("__REGION_LIST__", json.dumps(RLIST, ensure_ascii=False))
brand = (repo / "src" / "brand" / "brand.css").read_text(encoding="utf-8")
APPLOOK = (here.parent / "brand" / "app-look.css").read_text(encoding="utf-8")
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Mali:wght@600;700&family=Patrick+Hand&family=JetBrains+Mono:wght@500;700&display=swap">'
def app_look(t):
    """chèn (hoặc làm mới) khối giao diện chung + phông chữ của trang học sinh vào một trang phụ"""
    if "/*APPLOOK*/" in t:
        t = re.sub(r"/\*APPLOOK\*/.*?/\*/APPLOOK\*/", lambda m: "/*APPLOOK*/\n" + APPLOOK + "/*/APPLOOK*/", t, flags=re.S)
    else:
        t = t.replace("</style>", "/*APPLOOK*/\n" + APPLOOK + "/*/APPLOOK*/\n</style>", 1)
    if "family=Mali" not in t:
        t = t.replace("</head>", FONTS + "\n</head>", 1)
    return t
body = (here / "template.html").read_text(encoding="utf-8").replace("/*__BRAND_CSS__*/", brand).replace("__CONTENT__", blob).replace("/*__SCHOOL_JS__*/", school_js).replace("/*__COURSE_JS__*/", (here / "course.js").read_text(encoding="utf-8")).replace("/*__MAP_JS__*/", (here / "map.js").read_text(encoding="utf-8")).replace("/*__INFO_JS__*/", (here / "info.js").read_text(encoding="utf-8")).replace("/*__REPORT_JS__*/", (here / "report.js").read_text(encoding="utf-8")).replace("/*__SALES_JS__*/", (here / "sales.js").read_text(encoding="utf-8")).replace("/*__CLOUD_JS__*/", (here / "cloud.js").read_text(encoding="utf-8")).replace("/*__GAMES_JS__*/", (here / "games.js").read_text(encoding="utf-8") + "\n" + (here / "games2.js").read_text(encoding="utf-8")).replace("/*__EXAM_JS__*/", (here / "exam.js").read_text(encoding="utf-8")).replace("/*__LOCAL_JS__*/", (here / "local.js").read_text(encoding="utf-8")).replace("/*__TESTX_JS__*/", (here / "testx.js").read_text(encoding="utf-8")).replace("__API_URL__", api)
page = (
    "<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    + body
    + "\n</html>\n"
)
out = repo / "chuyen-anh-14-ngay" / "index.html"
out.write_text(page, encoding="utf-8")
print("built", out, len(page.encode()), "bytes")

# ---- bản xem trước cho giáo viên: cùng trang, mở khoá, có thanh tình huống và mục Toàn bộ nội dung ----
pv = (page.replace("/*__PREVIEW__*/false", "true", 1)
        .replace("/*__PREVIEW_JS__*/", (here / "preview.js").read_text(encoding="utf-8"), 1)
        .replace("<meta charset=\"utf-8\">", "<meta charset=\"utf-8\">\n<meta name=\"robots\" content=\"noindex\">", 1))
pv = re.sub(r"<title>(.*?)</title>", r"<title>Xem trước cho giáo viên · \1</title>", pv, count=1)
(repo / "chuyen-anh-14-ngay" / "xem-truoc.html").write_text(pv, encoding="utf-8")
print("built", repo / "chuyen-anh-14-ngay" / "xem-truoc.html")

# ---- bảng "Đề dự đoán" cho giáo viên: độ tin cậy, lý do, nguồn (học sinh chỉ thấy nhãn "Đề dự đoán") ----
def pred_html():
    from html import escape as E
    rows = []
    for slug, r in REG.items():
        items = [(r.get("name", slug), (r.get("paper") or {}).get("predicted"))] + [(u.get("name"), (u.get("paper") or {}).get("predicted")) for u in r.get("uni") or []]
        for name, Q in items:
            if not Q: continue
            st = "Theo thông báo của sở" if Q.get("used") and Q.get("confidence") == "cao" else "Đề dự đoán" if Q.get("used") else "Chưa có đề, dùng gói chung"
            src = " · ".join(f'<a href="{E(e["url"])}" target="_blank" rel="noopener">{E(" ".join(str(x) for x in [e.get("loai"), e.get("tinh_cu"), e.get("nam")] if x))}</a>' for e in Q.get("evidence") or [])
            gaps = "".join(f"<li>{E(g)}</li>" for g in Q.get("gaps") or [])
            rank = {"cao": 0, "trung bình": 1, "thấp": 2}.get(Q.get("confidence"), 3)
            rows.append((0 if Q.get("used") else 1, rank, name, f'<tr><td><b>{E(name)}</b><br><span class="pd-st">{st}</span></td><td><b>{E(Q.get("confidence") or "—")}</b></td>'
                        f'<td>{E(Q.get("basis") or "")}{f"<details><summary>Còn thiếu, cần mở tay</summary><ul>{gaps}</ul></details>" if gaps else ""}</td><td class="pd-src">{src}</td></tr>'))
    rows.sort(key=lambda x: x[:3])
    return ('<p>Học sinh và phụ huynh chỉ thấy nhãn <b>"Đề dự đoán"</b> (hoặc "Theo thông báo của sở", "Chưa có đề"). Độ tin cậy và lý do chỉ hiện ở đây.</p>'
            '<ul class="small"><li><b>cao</b>: văn bản cấu trúc đề hoặc đề chính thức của sở mới.</li><li><b>trung bình</b>: đề, văn bản của chính sở các năm gần, nhưng chưa đọc được đủ số câu từng phần.</li>'
            '<li><b>thấp</b>: chỉ có đề của một tỉnh cũ (không phải tỉnh đặt trụ sở sở mới) hoặc chỉ có văn bản chung. Khi không có đề thật nào, trang không dựng bảng dạng bài mà dùng gói chung.</li></ul>'
            '<div class="tbl-wrap"><table class="pd-tbl"><thead><tr><th>Nơi</th><th>Độ tin cậy</th><th>Vì sao</th><th>Nguồn đã đọc</th></tr></thead><tbody>'
            + "".join(x[3] for x in rows) + '</tbody></table></div>')
PRED_HTML = pred_html()

# ---- trang của cô ----
themes = json.dumps([{"day": d["day"], "theme": d.get("theme_vi", "")} for d in days], ensure_ascii=False)
co_tpl = (here.parent / "co" / "template.html").read_text(encoding="utf-8")
co = co_tpl.replace("<!--__PRED__-->", PRED_HTML).replace("/*__BRAND_CSS__*/", brand).replace("__API_URL__", api).replace("__THEMES__", themes)
(repo / "co").mkdir(exist_ok=True)
(repo / "co" / "index.html").write_text(app_look(co), encoding="utf-8")
print("built", repo / "co" / "index.html")

# ---- bảng quản trị phân quyền (quản lý, giáo viên, sale) ----
ql = (here.parent / "quan-ly" / "template.html").read_text(encoding="utf-8").replace("/*__BRAND_CSS__*/", brand).replace("__API_URL__", api)
(repo / "quan-ly").mkdir(exist_ok=True)
(repo / "quan-ly" / "index.html").write_text(app_look(ql), encoding="utf-8")
print("built", repo / "quan-ly" / "index.html")

# ---- trang viết tay (trang chủ, tuyển sinh): làm mới khối CSS dùng chung giữa hai dấu /*BRAND*/ … /*/BRAND*/ ----
for f in [repo / "tuyen-sinh" / "index.html"]:
    t = f.read_text(encoding="utf-8")
    t2 = app_look(re.sub(r"/\*BRAND\*/.*?/\*/BRAND\*/", lambda m: "/*BRAND*/\n" + brand + "/*/BRAND*/", t, flags=re.S))
    if t2 != t:
        f.write_text(t2, encoding="utf-8"); print("brand css ->", f)

# ---- đáp án cho máy chủ chấm bài ----
SECTION_NAMES = {"A_vocab": "A · Từ vựng", "B_grammar": "B · Ngữ pháp", "C_wordform": "C · Cấu tạo từ", "D_exam": "D · Dạng bài thi chuyên",
                 "E_reading": "E · Đọc hiểu", "G_review": "G · Ôn xoắn ốc", "H_plus": "H · Thử thách nâng cao (chỉ học sinh mức Nâng cao)", "R1_vocab": "R1 · Từ vựng", "R2_grammar": "R2 · Ngữ pháp",
                 "R3_wordform": "R3 · Cấu tạo từ", "R4_exam": "R4 · Dạng bài thi chuyên"}
def label(i):
    s = re.sub(r"^d\d+", "", i)
    return re.sub(r"^([A-Z]\d?)_?(\d+)$", r"\1.\2", s)
keys = {}
for d in days:
    P = d["paper"]; secs = []
    order = ["A_vocab", "B_grammar", "C_wordform", "D_exam", "E_reading", "G_review"] if "A_vocab" in P else ["R1_vocab", "R2_grammar", "R3_wordform", "R4_exam", "E_reading"]
    PP = web.get(d["day"], {}).get("paper_plus")
    if PP: P = dict(P, H_plus=PP); order = order + ["H_plus"]
    for k in order:
        if k not in P: continue
        items = []
        for it in P[k].get("items", []):
            x = {"id": it["id"], "label": label(it["id"]), "q": it["q"], "answer": it["answer"]}
            if it.get("accept"): x["accept"] = it["accept"]
            if it.get("options"): x["options"] = it["options"]
            items.append(x)
        secs.append({"key": k, "name": SECTION_NAMES[k], "items": items, **({"track": "nang"} if k == "H_plus" else {})})
    F = P.get("F_writing")
    keys[str(d["day"])] = {"day": d["day"], "sections": secs,
                           "writing": {"task": F.get("task_en", ""), "min_words": F.get("min_words", 50), "checklist": F.get("checklist_vi", [])} if F else None}
js = "/* Tạo tự động bởi build.py từ nội dung 14 buổi. Không sửa tay: sửa content/ rồi chạy lại build. */\nvar PAPER_KEYS = " + json.dumps(keys, ensure_ascii=False, indent=1) + ";\n"
(repo / "apps-script").mkdir(exist_ok=True)
(repo / "apps-script" / "Keys.gs").write_text(js, encoding="utf-8")
print("built", repo / "apps-script" / "Keys.gs", sum(len(s["items"]) for k in keys.values() for s in k["sections"]), "câu")

# ---- trang Chuyên Anh 34 tỉnh, thành (tinh/index.html): đọc toàn bộ regions/<slug>.json ----
import datetime
FMT = {"listening": "Nghe", "pronunciation": "Phát âm", "stress": "Trọng âm", "sentence_completion": "Hoàn thành câu", "synonym": "Đồng nghĩa", "antonym": "Trái nghĩa",
       "dialogue_completion": "Hoàn thành hội thoại", "error_id": "Tìm lỗi sai", "sentence_combining": "Kết hợp câu", "closest_meaning": "Câu gần nghĩa nhất", "reading_mcq": "Đọc hiểu (trắc nghiệm)",
       "cloze": "Điền từ vào đoạn văn (có lựa chọn)", "open_cloze": "Điền từ tự do", "word_formation": "Cấu tạo từ", "transformation": "Viết lại câu", "key_word": "Viết lại câu với từ cho sẵn",
       "matching_headings": "Nối tiêu đề với đoạn", "dialogue_order": "Sắp xếp hội thoại", "essay": "Viết bài luận", "paragraph_writing": "Viết đoạn văn", "guided_writing": "Viết theo gợi ý",
       "translation": "Dịch", "true_false": "Đúng / Sai", "gap_text": "Điền câu vào đoạn", "other": "Dạng khác"}
TINH_KEYS = ["exam_2026", "plan_2027", "formula_raw", "nv_rule", "schools_raw", "paper", "prep_tips", "stories", "uni", "gaps", "sources", "confidence"]
# kinh nghiệm chung toàn quốc: bỏ phần ghi chú nội bộ (nhãn nguồn, mục chỉ có tiêu đề, lỗ hổng)
import markdown
def national_html():
    f = here.parent / "tinh" / "kinh-nghiem-raw.md"
    if not f.exists():
        return ""
    t = f.read_text(encoding="utf-8")
    t = t[t.index("## A."):] if "## A." in t else t
    t = t.split("## Lỗ hổng")[0]
    blocks = re.split(r"(?=^### )", t, flags=re.M)
    blocks = [b for b in blocks if "chỉ có tiêu đề" not in b]
    t = "".join(blocks)
    t = re.sub(r"\s*\[(?:đã mở|file sở|trang HN[^\]]*)\]", "", t)
    t = re.sub(r"[Tt]heo trang HN,?\s*", "", t).replace("trang HN", "trang Tuyển sinh chuyên ngữ Hà Nội")
    t = re.sub(r"^### \d+\. ", "### ", t, flags=re.M)
    t = "\n".join(("|" + "|".join(l.strip().strip("|").split("|")[:2]) + "|") if l.startswith("|") else l for l in t.split("\n"))
    t = re.sub(r"(\. )([a-zà-ỹđ])", lambda m: m.group(1) + m.group(2).upper(), t)
    h = markdown.markdown(t, extensions=["tables"])
    return re.sub(r"(https?://[^\s<]+)", r'<a href="\1" target="_blank" rel="noopener">Đọc bài gốc</a>', h).replace("<strong>URL:</strong>", "<strong>Nguồn:</strong>")
tdata = {"national": national_html(), "list": RLIST, "fmt": FMT, "updated": datetime.date.today().strftime("%d/%m/%Y"),
         "regions": {k: {kk: v.get(kk) for kk in TINH_KEYS} for k, v in REG.items() if k != "ha-noi"}, "pred_html": PRED_HTML}
# thông tin chi tiết từng sở cho tab "Thông tin thi" của trang học sinh (tải khi cần)
(repo / "chuyen-anh-14-ngay" / "regions-info.json").write_text(json.dumps(tdata, ensure_ascii=False), encoding="utf-8")
print("built regions-info.json", len(REG) - 1, "sở có dữ liệu")
# trang cũ tinh/ và trang chủ: chuyển thẳng vào trang học sinh (mọi thông tin nằm trong tab Thông tin thi, cùng một giao diện)
REDIR = """<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ôn thi chuyên ngữ</title>
<style>html{background:#4AA3B6 url("ASSETS/assets/bg/khoi-cat.svg") center/cover no-repeat fixed}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif}a{background:#FFD23F;color:#14303A;border:3px solid #14303A;border-radius:12px;padding:12px 18px;font-weight:700;text-decoration:none;box-shadow:4px 5px 0 rgba(10,40,48,.35)}</style>
<script>(function(){var h=(location.hash||"").slice(1);var q=location.search?location.search.slice(1)+"&":"";location.replace("TARGET?"+q+(h&&h!=="kinh-nghiem"?"so="+encodeURIComponent(h)+"&v=exam":"v=exam"))})();</script>
</head><body><a href="TARGET?v=exam">Vào trang Ôn thi chuyên ngữ</a></body></html>
"""
(repo / "tinh").mkdir(exist_ok=True)
(repo / "tinh" / "index.html").write_text(REDIR.replace("TARGET", "../chuyen-anh-14-ngay/").replace("ASSETS/", "../"), encoding="utf-8")
(repo / "index.html").write_text(REDIR.replace("TARGET", "chuyen-anh-14-ngay/").replace("ASSETS/", ""), encoding="utf-8")
print("built redirects: tinh/, index.html")
