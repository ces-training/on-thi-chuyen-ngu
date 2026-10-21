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
blob = json.dumps({"days": days, "tests": tests}, ensure_ascii=False).replace("</", "<\\/")
cfg = json.load(open(here / "config.json", encoding="utf-8"))
api = json.dumps(os.environ.get("API_URL_OVERRIDE", cfg.get("apiUrl", "")))

sj = json.load(open(here / "schools.json", encoding="utf-8"))
school_js = (here / "school.js").read_text(encoding="utf-8").replace("__SCHOOLS__", json.dumps(sj["options"], ensure_ascii=False)).replace("__EXAMS__", json.dumps(sj["exams"], ensure_ascii=False))
brand = (repo / "src" / "brand" / "brand.css").read_text(encoding="utf-8")
body = (here / "template.html").read_text(encoding="utf-8").replace("/*__BRAND_CSS__*/", brand).replace("__CONTENT__", blob).replace("/*__SCHOOL_JS__*/", school_js).replace("/*__CLOUD_JS__*/", (here / "cloud.js").read_text(encoding="utf-8")).replace("__API_URL__", api)
page = (
    "<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    + body
    + "\n</html>\n"
)
out = repo / "chuyen-anh-14-ngay" / "index.html"
out.write_text(page, encoding="utf-8")
print("built", out, len(page.encode()), "bytes")

# ---- trang của cô ----
themes = json.dumps([{"day": d["day"], "theme": d.get("theme_vi", "")} for d in days], ensure_ascii=False)
co_tpl = (here.parent / "co" / "template.html").read_text(encoding="utf-8")
co = co_tpl.replace("/*__BRAND_CSS__*/", brand).replace("__API_URL__", api).replace("__THEMES__", themes)
(repo / "co").mkdir(exist_ok=True)
(repo / "co" / "index.html").write_text(co, encoding="utf-8")
print("built", repo / "co" / "index.html")

# ---- trang viết tay (trang chủ, tuyển sinh): làm mới khối CSS dùng chung giữa hai dấu /*BRAND*/ … /*/BRAND*/ ----
for f in [repo / "index.html", repo / "tuyen-sinh" / "index.html"]:
    t = f.read_text(encoding="utf-8")
    t2 = re.sub(r"/\*BRAND\*/.*?/\*/BRAND\*/", lambda m: "/*BRAND*/\n" + brand + "/*/BRAND*/", t, flags=re.S)
    if t2 != t:
        f.write_text(t2, encoding="utf-8"); print("brand css ->", f)

# ---- đáp án cho máy chủ chấm bài ----
SECTION_NAMES = {"A_vocab": "A · Từ vựng", "B_grammar": "B · Ngữ pháp", "C_wordform": "C · Cấu tạo từ", "D_exam": "D · Dạng bài thi chuyên",
                 "E_reading": "E · Đọc hiểu", "G_review": "G · Ôn xoắn ốc", "R1_vocab": "R1 · Từ vựng", "R2_grammar": "R2 · Ngữ pháp",
                 "R3_wordform": "R3 · Cấu tạo từ", "R4_exam": "R4 · Dạng bài thi chuyên"}
def label(i):
    s = re.sub(r"^d\d+", "", i)
    return re.sub(r"^([A-Z]\d?)_?(\d+)$", r"\1.\2", s)
keys = {}
for d in days:
    P = d["paper"]; secs = []
    order = ["A_vocab", "B_grammar", "C_wordform", "D_exam", "E_reading", "G_review"] if "A_vocab" in P else ["R1_vocab", "R2_grammar", "R3_wordform", "R4_exam", "E_reading"]
    for k in order:
        if k not in P: continue
        items = []
        for it in P[k].get("items", []):
            x = {"id": it["id"], "label": label(it["id"]), "q": it["q"], "answer": it["answer"]}
            if it.get("accept"): x["accept"] = it["accept"]
            if it.get("options"): x["options"] = it["options"]
            items.append(x)
        secs.append({"key": k, "name": SECTION_NAMES[k], "items": items})
    F = P.get("F_writing")
    keys[str(d["day"])] = {"day": d["day"], "sections": secs,
                           "writing": {"task": F.get("task_en", ""), "min_words": F.get("min_words", 50), "checklist": F.get("checklist_vi", [])} if F else None}
js = "/* Tạo tự động bởi build.py từ nội dung 14 buổi. Không sửa tay: sửa content/ rồi chạy lại build. */\nvar PAPER_KEYS = " + json.dumps(keys, ensure_ascii=False, indent=1) + ";\n"
(repo / "apps-script").mkdir(exist_ok=True)
(repo / "apps-script" / "Keys.gs").write_text(js, encoding="utf-8")
print("built", repo / "apps-script" / "Keys.gs", sum(len(s["items"]) for k in keys.values() for s in k["sections"]), "câu")
