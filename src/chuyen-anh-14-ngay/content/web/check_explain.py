"""Kiểm tra giải thích đáp án theo EXPLAIN.md.
Chạy: python3 check_explain.py ../day03.json day03.json   (hoặc ../tests.json)"""
import json, re, sys

MARK = re.compile(r"(\*\*[^*]+?\*\*|==[^=]+?==|__[^_]+?__)")

def check_text(s, where, errs, need_tip=False):
    if not isinstance(s, str) or not s.strip():
        errs.append(f"{where}: thiếu giải thích"); return
    kinds = set()
    if re.search(r"\*\*[^*]+?\*\*", s): kinds.add("b")
    if re.search(r"==[^=]+?==", s): kinds.add("h")
    if re.search(r"__[^_]+?__", s): kinds.add("u")
    if "b" not in kinds: errs.append(f"{where}: thiếu **…** (đáp án/quy tắc)")
    if len(kinds) < 2: errs.append(f"{where}: cần ít nhất 2 kiểu đánh dấu")
    rest = MARK.sub("", s)
    if re.search(r"\*\*|==|__", rest) or rest.count("*") or re.search(r"(?<![=\w])=(?![=\w])", rest):
        errs.append(f"{where}: dấu đánh dấu lẻ/không đóng")
    if len(MARK.sub(lambda m: m.group(0)[2:-2], s).split()) > 75:
        errs.append(f"{where}: quá dài")

def items_of(sec):
    return sec.get("items", []) if isinstance(sec, dict) else []

def check_day(d, path, errs, stats):
    for i, it in enumerate(d.get("web_check", [])):
        check_text(it.get("explain_vi"), f"{path} web_check[{i}]", errs); stats[0] += 1
    for k, sec in d.get("paper", {}).items():
        for i, it in enumerate(items_of(sec)):
            check_text(it.get("explain_vi"), f"{path} paper.{k}[{i}]", errs); stats[0] += 1

def check_web(w, path, errs, stats):
    for key in ("exam", "exam_easy", "exam_plus"):
        for b in w.get(key, []):
            if b.get("kind") in ("matching", "order"):
                check_text(b.get("explain_vi"), f"{path} {key}.{b.get('format')}", errs); stats[0] += 1
            else:
                for i, it in enumerate(b.get("items", [])):
                    check_text(it.get("explain_vi"), f"{path} {key}.{b.get('format')}[{i}]", errs); stats[0] += 1
    for lv, L in (w.get("listening") or {}).items():
        for part in ("part1", "part2"):
            for i, it in enumerate(L.get(part, {}).get("items", [])):
                check_text(it.get("explain_vi"), f"{path} listening.{lv}.{part}[{i}]", errs); stats[0] += 1
    for i, it in enumerate((w.get("paper_plus") or {}).get("items", [])):
        check_text(it.get("explain_vi"), f"{path} paper_plus[{i}]", errs); stats[0] += 1
    g = w.get("grammar_games", {})
    for i, gr in enumerate(g.get("sort", {}).get("groups", [])):
        check_text(gr.get("rule_vi"), f"{path} sort.groups[{i}].rule_vi", errs); stats[0] += 1
    for i, u in enumerate(g.get("unjumble", [])):
        check_text(u.get("why_vi"), f"{path} unjumble[{i}].why_vi", errs); stats[0] += 1
    for i, t in enumerate(g.get("truefalse", [])):
        check_text(t.get("why_vi"), f"{path} truefalse[{i}].why_vi", errs); stats[0] += 1

def main(paths):
    errs, stats = [], [0]
    for p in paths:
        d = json.load(open(p, encoding="utf-8"))
        if "diagnostic" in d:
            for k in ("diagnostic", "final"):
                for i, it in enumerate(d[k]["items"]):
                    check_text(it.get("explain_vi"), f"{p} {k}[{i}]", errs); stats[0] += 1
        elif "paper" in d:
            check_day(d, p, errs, stats)
        else:
            check_web(d, p, errs, stats)
    for e in errs[:60]: print(e)
    print(f"{stats[0]} giải thích, {len(errs)} lỗi" + (" — OK" if not errs else ""))
    return 1 if errs else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
