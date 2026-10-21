"""Dựng trang Chuyên Anh 14 Ngày từ nội dung trong content/.

Chạy:  python3 src/chuyen-anh-14-ngay/build.py
Kết quả: chuyen-anh-14-ngay/index.html (trang mà GitHub Pages hiển thị).
"""
import json, pathlib

here = pathlib.Path(__file__).parent
repo = here.parent.parent

days = [json.load(open(here / f"content/day{n:02d}.json", encoding="utf-8")) for n in range(1, 15)]
tests = json.load(open(here / "content/tests.json", encoding="utf-8"))
blob = json.dumps({"days": days, "tests": tests}, ensure_ascii=False).replace("</", "<\\/")

schools = json.dumps(json.load(open(here / "schools.json", encoding="utf-8"))["options"], ensure_ascii=False)
school_js = (here / "school.js").read_text(encoding="utf-8").replace("__SCHOOLS__", schools)
body = (here / "template.html").read_text(encoding="utf-8").replace("__CONTENT__", blob).replace("/*__SCHOOL_JS__*/", school_js)
page = (
    "<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    + body
    + "\n</html>\n"
)
out = repo / "chuyen-anh-14-ngay" / "index.html"
out.write_text(page, encoding="utf-8")
print("built", out, len(page.encode()), "bytes")
