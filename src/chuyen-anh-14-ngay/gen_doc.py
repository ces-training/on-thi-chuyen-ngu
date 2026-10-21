import json, pathlib, re, sys
root = pathlib.Path(__file__).parent
out = root / "doc"
out.mkdir(exist_ok=True)

def blank(s):
    s = re.sub(r"_{2,}", "…………", str(s))
    return s.replace("|", "/")

def cell(s):
    return blank(s).replace("\n", " ")

LETTERS = "ABCD"

def mcq(items, start=1):
    lines = []
    for i, it in enumerate(items, start):
        lines.append(f"{i}. {blank(it['q'])}")
        opts = it.get("options") or []
        if opts:
            lines.append("    " + "    ".join(f"{LETTERS[j]}. {cell(o)}" for j, o in enumerate(opts)))
    return "\n".join(lines)

def gaps(items, start=1):
    return "\n".join(f"{i}. {blank(it['q'])}" for i, it in enumerate(items, start))

def reading(E):
    lines = [f"**{blank(E.get('title',''))}**", "", re.sub(r"\n+", "\n\n", blank(E["text"]).strip()), ""]
    tf = [it for it in E["items"] if it.get("kind") == "tfng"]
    mc = [it for it in E["items"] if it.get("kind") != "tfng"]
    n = 1
    if tf:
        lines.append("Đúng (True), Sai (False) hay Không có thông tin (Not Given)? Khoanh T / F / NG.")
        lines.append("")
        for it in tf:
            lines.append(f"{n}. {blank(it['q'])}    T / F / NG")
            n += 1
        lines.append("")
    if mc:
        lines.append("Chọn đáp án đúng.")
        lines.append("")
        lines.append(mcq(mc, n))
    return "\n".join(lines)

WRITE_LINE = "………………………………………………………………………………………………"

def writing(F):
    lines = [f"{blank(F.get('task_vi',''))}", "", f"*{blank(F.get('task_en',''))}* (ít nhất {F.get('min_words',50)} từ)", ""]
    n_lines = 8 if F.get("min_words", 50) >= 80 else 6
    for _ in range(n_lines):
        lines += [WRITE_LINE, ""]
    lines.append("")
    lines.append("Tự kiểm trước khi đọc đoạn mẫu trên web:")
    lines.append("")
    lines += [f"- [ ] {blank(c)}" for c in F.get("checklist_vi", [])]
    return "\n".join(lines)

def normal_day(d):
    n = d["day"]; P = d["paper"]
    L = [f"## Buổi {n} · {d['theme_vi']} ({d['theme_en']})", "",
         f"{blank(d.get('goal_vi',''))} Thời gian khoảng {d.get('minutes',30)} phút, sau đó mở web, chọn **Buổi {n}**.", "",
         "### 1. Từ mới", "",
         "| Từ | Loại từ | Phát âm | Nghĩa | Họ từ | Ví dụ |", "| --- | --- | --- | --- | --- | --- |"]
    for v in d["vocab"]:
        L.append(f"| **{cell(v['word'])}** | {cell(v.get('pos',''))} | {cell(v.get('ipa',''))} | {cell(v['meaning_vi'])} | {cell(v.get('family',''))} | {cell(v['example'])} |")
    L += ["", "**Cụm động từ**", ""]
    for p in d.get("phrasal", []):
        L.append(f"- **{blank(p['phrase'])}**: {blank(p['meaning_vi'])}. *{blank(p['example'])}*")
    g = d["grammar"]
    L += ["", f"### 2. Ngữ pháp: {blank(g['title'])}", ""]
    L += [f"- {blank(b)}" for b in g["rule_vi"]]
    L += ["", "Ví dụ:", ""] + [f"- *{blank(e)}*" for e in g.get("examples", [])]
    if g.get("common_mistake_vi"):
        L += ["", f"Lỗi hay gặp: {blank(g['common_mistake_vi'])}"]
    w = d["wordform"]
    L += ["", f"### 3. Cấu tạo từ: {blank(w['focus'])}", "", blank(w["rule_vi"]), "",
          "  ·  ".join(f"{a} → **{b}**" for a, b in w["examples"]), "",
          "### 4. Bài tập", ""]
    A = P["A_vocab"]
    L += [f"**A. Từ vựng.** {blank(A['instruction_vi'])}", ""]
    if A.get("bank"):
        L += ["Từ cho sẵn: " + "  ·  ".join(blank(x) for x in A["bank"]), ""]
    L += [gaps(A["items"]), ""]
    B = P["B_grammar"]; L += [f"**B. Ngữ pháp.** {blank(B['instruction_vi'])}", "", gaps(B["items"]), ""]
    Cc = P["C_wordform"]; L += [f"**C. Cấu tạo từ.** {blank(Cc['instruction_vi'])}", "", gaps(Cc["items"]), ""]
    D = P["D_exam"]; L += [f"**D. Dạng bài thi chuyên.** {blank(D['instruction_vi'])}", ""]
    if D.get("text"):
        L += [re.sub(r"\n+", "\n\n", blank(D["text"]).strip()), ""]
    L += [mcq(D["items"]), ""]
    L += ["**E. Đọc hiểu.**", "", reading(P["E_reading"]), ""]
    L += ["**F. Viết.**", "", writing(P["F_writing"]), ""]
    G = P.get("G_review")
    if G:
        L += [f"**G. Ôn xoắn ốc.** {blank(G['instruction_vi'])}", "", gaps(G["items"]), ""]
    L += [f"Xong giấy rồi: gấp tập lại, mở web và làm **Kiểm tra buổi {n}**, sau đó chữa bài giấy bằng đáp án trên web."]
    return "\n".join(L)

def review_day(d):
    n = d["day"]; P = d["paper"]
    L = [f"## Buổi {n} · {d['theme_vi']}", "", f"{blank(d.get('goal_vi',''))} Thời gian khoảng {d.get('minutes',35)} phút.", ""]
    names = {"R1_vocab": "R1. Từ vựng", "R2_grammar": "R2. Ngữ pháp", "R3_wordform": "R3. Cấu tạo từ", "R4_exam": "R4. Dạng bài thi chuyên"}
    for k, title in names.items():
        S = P[k]; L += [f"**{title}.** {blank(S['instruction_vi'])}", ""]
        L += [mcq(S["items"]) if k == "R4_exam" else gaps(S["items"]), ""]
    L += ["**E. Đọc hiểu.**", "", reading(P["E_reading"]), ""]
    L += ["**F. Viết.**", "", writing(P["F_writing"]), ""]
    L += ["**Tự đánh giá.** Đánh dấu những điều em đã làm được:", ""] + [f"- [ ] {blank(s)}" for s in P.get("self_check_vi", [])]
    L += ["", f"Xong giấy rồi: mở web và làm **Kiểm tra buổi {n}**." + (" Sau đó làm **Bài kiểm tra sau 2 tuần** ở mục Tiến bộ." if n == 14 else "")]
    return "\n".join(L)

for n in range(1, 15):
    p = root / f"content/day{n:02d}.json"
    if not p.exists():
        print("missing", n); continue
    d = json.load(open(p, encoding="utf-8"))
    md = review_day(d) if d["type"] == "review" else normal_day(d)
    (out / f"day{n:02d}.md").write_text(md, encoding="utf-8")
    print(n, len(md))
