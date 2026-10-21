"""Tạo bài tập giấy của từng buổi (HTML để in) rồi gọi print.js xuất PDF.

Chạy:  python3 src/chuyen-anh-14-ngay/pdf/gen_pdf.py
Cần:   Node + Playwright (npx playwright). Kết quả: chuyen-anh-14-ngay/pdf/buoi-01.pdf … buoi-14.pdf
Nội dung lấy từ content/dayNN.json (phần lý thuyết + paper), không kèm đáp án.
"""
import html, json, pathlib, re, subprocess, sys, os

here = pathlib.Path(__file__).parent
src = here.parent
repo = src.parent.parent
tmp = here / "_html"
tmp.mkdir(exist_ok=True)
out = repo / "chuyen-anh-14-ngay" / "pdf"
out.mkdir(parents=True, exist_ok=True)

E = lambda s: html.escape(str(s or ""))
def gap(s):
    return re.sub(r"_{2,}", '<span class="gap"></span>', E(s))

CSS = """
@page{size:A4;margin:14mm 14mm 16mm}
*{box-sizing:border-box}
body{margin:0;font:10.5pt/1.5 "Plus Jakarta Sans",system-ui,sans-serif;color:#151521;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3{font-family:"Bricolage Grotesque","Plus Jakarta Sans",sans-serif;margin:0;line-height:1.15}
.top{display:flex;align-items:center;gap:14px;background:#2638C4;color:#fff;border-radius:12px;padding:12px 16px;margin-bottom:10px}
.badge{flex:none;width:54px;height:54px;border-radius:50%;background:#FCC539;color:#151521;border:2.5px solid #151521;display:grid;place-items:center;font:800 18pt "Bricolage Grotesque",sans-serif}
.top h1{font-size:19pt}.top p{margin:2px 0 0;font-size:9.5pt;opacity:.9}
.meta{display:flex;gap:16px;font-size:9pt;color:#4A4C53;margin:0 0 8px}
.meta span b{color:#151521}
h2{font-size:13pt;color:#2638C4;margin:14px 0 6px;padding-bottom:3px;border-bottom:2px solid #E1E7F4;break-after:avoid}
h3{font-size:11pt;margin:10px 0 4px;break-after:avoid}
.ins{font-size:9.5pt;color:#4A4C53;margin:0 0 6px}
table{border-collapse:collapse;width:100%;font-size:9pt}
th,td{border:1px solid #D6DCEA;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#EEF1FA}
td.w{font-weight:700;white-space:nowrap}td.ipa{white-space:nowrap}
.rule{margin:0 0 4px;padding-left:14px}
.rule li{margin:2px 0}
.ex{font-style:italic;color:#333}
.mist{background:#FFF4D1;border-radius:8px;padding:6px 10px;font-size:9.5pt;margin:6px 0}
.wf{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:9.5pt}
.bank{border:1.5px dashed #B7BFD5;border-radius:8px;padding:6px 10px;margin:4px 0 8px;font-weight:600;word-spacing:6px}
ol.items{margin:0;padding-left:22px}
ol.items li{margin:0 0 7px;break-inside:avoid}
.gap{display:inline-block;min-width:34mm;border-bottom:1px dotted #151521;margin:0 2px;transform:translateY(-2px)}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:1px 14px;margin-top:2px}
.opts.long{grid-template-columns:1fr}
.passage{border-left:4px solid #2638C4;background:#F6F8FD;padding:8px 12px;border-radius:6px;white-space:pre-wrap;margin:4px 0 8px;font-size:10pt;line-height:1.55}
.tf{float:right;font-weight:700;letter-spacing:2px}
.lines div{height:9mm;border-bottom:1px solid #B7BFD5}
.check{list-style:none;padding:0;margin:6px 0}
.check li::before{content:"☐  ";font-size:11pt}
.sec{break-inside:auto}
.end{margin-top:12px;padding:8px 12px;border:2px solid #2638C4;border-radius:10px;font-size:9.5pt}
.name{display:flex;gap:18px;font-size:9.5pt;margin-bottom:8px}.name span{flex:1;border-bottom:1px dotted #151521}
"""

def mcq(items, start=1):
    o = []
    for i, it in enumerate(items, start):
        opts = it.get("options") or []
        long = any(len(str(x)) > 28 for x in opts)
        o.append(f'<li>{gap(it["q"])}' + (f'<div class="opts{" long" if long else ""}">' + "".join(f"<span>{'ABCD'[j]}. {E(x)}</span>" for j, x in enumerate(opts)) + "</div>" if opts else "") + "</li>")
    return f'<ol class="items" start="{start}">' + "".join(o) + "</ol>"

def gaps(items):
    return '<ol class="items">' + "".join(f"<li>{gap(it['q'])}</li>" for it in items) + "</ol>"

def reading(R):
    h = f'<h3>{E(R.get("title",""))}</h3><div class="passage">{E(R["text"].strip())}</div>'
    tf = [it for it in R["items"] if it.get("kind") == "tfng"]
    mc = [it for it in R["items"] if it.get("kind") != "tfng"]
    if tf:
        h += '<p class="ins">Đúng (True), Sai (False) hay Không có thông tin (Not Given)? Khoanh T / F / NG.</p><ol class="items">' + "".join(f'<li>{E(it["q"])} <span class="tf">T  F  NG</span></li>' for it in tf) + "</ol>"
    if mc:
        h += '<p class="ins">Chọn đáp án đúng.</p>' + mcq(mc, len(tf) + 1)
    return h

def writing(F):
    n = 10 if F.get("min_words", 50) >= 80 else 8
    return (f'<p>{E(F.get("task_vi",""))}</p><p class="ex">{E(F.get("task_en",""))} (ít nhất {F.get("min_words",50)} từ)</p>'
            + '<div class="lines">' + "<div></div>" * n + '</div><p class="ins" style="margin-top:6px">Tự kiểm trước khi xem đoạn mẫu trên web:</p><ul class="check">'
            + "".join(f"<li>{E(c)}</li>" for c in F.get("checklist_vi", [])) + "</ul>")

def head(d):
    n = d["day"]
    return (f'<div class="top"><div class="badge">{n:02d}</div><div><h1>Buổi {n} · {E(d["theme_vi"])}</h1><p>Chuyên Anh 14 Ngày · {E(d.get("theme_en",""))} · khoảng {d.get("minutes",30)} phút làm trên giấy</p></div></div>'
            '<div class="name"><span>Họ tên: </span><span>Ngày làm: </span><span>Thời gian làm: ……… phút</span></div>'
            f'<p class="ins">{E(d.get("goal_vi",""))}</p>')

def normal(d):
    P = d["paper"]; h = head(d)
    h += '<h2>1. Từ mới</h2><table><tr><th>Từ</th><th>Phát âm</th><th>Nghĩa</th><th>Họ từ</th><th>Ví dụ</th></tr>'
    for v in d["vocab"]:
        h += f'<tr><td class="w">{E(v["word"])} <small>({E(v.get("pos",""))})</small></td><td class="ipa">{E(v.get("ipa",""))}</td><td>{E(v["meaning_vi"])}</td><td>{E(v.get("family",""))}</td><td class="ex">{E(v["example"])}</td></tr>'
    h += "</table><h3>Cụm động từ</h3><ul class='rule'>" + "".join(f'<li><b>{E(p["phrase"])}</b>: {E(p["meaning_vi"])}. <span class="ex">{E(p["example"])}</span></li>' for p in d.get("phrasal", [])) + "</ul>"
    g = d["grammar"]
    h += f'<h2>2. Ngữ pháp: {E(g["title"])}</h2><ul class="rule">' + "".join(f"<li>{E(b)}</li>" for b in g["rule_vi"]) + "</ul>"
    h += '<p class="ex">' + " · ".join(E(e) for e in g.get("examples", [])) + "</p>"
    if g.get("common_mistake_vi"): h += f'<div class="mist">Lỗi hay gặp: {E(g["common_mistake_vi"])}</div>'
    w = d["wordform"]
    h += f'<h2>3. Cấu tạo từ: {E(w["focus"])}</h2><p>{E(w["rule_vi"])}</p><div class="wf">' + "".join(f"<span>{E(a)} → <b>{E(b)}</b></span>" for a, b in w["examples"]) + "</div>"
    h += "<h2>4. Bài tập</h2>"
    A = P["A_vocab"]; h += f'<h3>A. Từ vựng</h3><p class="ins">{E(A["instruction_vi"])}</p>'
    if A.get("bank"): h += '<div class="bank">' + "   ·   ".join(E(x) for x in A["bank"]) + "</div>"
    h += gaps(A["items"])
    B = P["B_grammar"]; h += f'<h3>B. Ngữ pháp</h3><p class="ins">{E(B["instruction_vi"])}</p>' + gaps(B["items"])
    Cc = P["C_wordform"]; h += f'<h3>C. Cấu tạo từ</h3><p class="ins">{E(Cc["instruction_vi"])}</p>' + gaps(Cc["items"])
    D = P["D_exam"]; h += f'<h3>D. Dạng bài thi chuyên</h3><p class="ins">{E(D["instruction_vi"])}</p>'
    if D.get("text"): h += f'<div class="passage">{gap(D["text"])}</div>'
    h += mcq(D["items"])
    h += "<h3>E. Đọc hiểu</h3>" + reading(P["E_reading"])
    h += "<h3>F. Viết</h3>" + writing(P["F_writing"])
    G = P.get("G_review")
    if G: h += f'<h3>G. Ôn xoắn ốc</h3><p class="ins">{E(G["instruction_vi"])}</p>' + gaps(G["items"])
    h += f'<div class="end">Xong bài giấy: mở web, buổi {d["day"]}, làm <b>Kiểm tra nhanh cuối buổi</b>, rồi chụp bài này gửi chấm (hoặc tự chấm bằng đáp án trên web).</div>'
    return h

def review(d):
    P = d["paper"]; h = head(d)
    names = {"R1_vocab": "R1. Từ vựng", "R2_grammar": "R2. Ngữ pháp", "R3_wordform": "R3. Cấu tạo từ", "R4_exam": "R4. Dạng bài thi chuyên"}
    for k, t in names.items():
        S = P[k]; h += f'<h3>{t}</h3><p class="ins">{E(S["instruction_vi"])}</p>' + (mcq(S["items"]) if k == "R4_exam" else gaps(S["items"]))
    h += "<h3>E. Đọc hiểu</h3>" + reading(P["E_reading"])
    h += "<h3>F. Viết</h3>" + writing(P["F_writing"])
    h += "<h3>Tự đánh giá</h3><ul class='check'>" + "".join(f"<li>{E(s)}</li>" for s in P.get("self_check_vi", [])) + "</ul>"
    h += f'<div class="end">Xong bài giấy: mở web, buổi {d["day"]}, làm <b>Kiểm tra nhanh cuối buổi</b>' + (", rồi làm <b>Bài kiểm tra sau 2 tuần</b> ở mục Tiến bộ." if d["day"] == 14 else ".") + "</div>"
    return h

FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap">'
jobs = []
for n in range(1, 15):
    d = json.load(open(src / f"content/day{n:02d}.json", encoding="utf-8"))
    body = review(d) if d["type"] == "review" else normal(d)
    page = f'<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Buổi {n} · {E(d["theme_vi"])}</title>{FONT}<style>{CSS}</style></head><body>{body}</body></html>'
    hp = tmp / f"buoi-{n:02d}.html"; hp.write_text(page, encoding="utf-8")
    jobs.append([str(hp), str(out / f"buoi-{n:02d}.pdf"), f"Buổi {n} · {d['theme_vi']}"])
(tmp / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
r = subprocess.run(["node", str(here / "print.js"), str(tmp / "jobs.json")], cwd=os.environ.get("PW_CWD", str(here)))
sys.exit(r.returncode)
