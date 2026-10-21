"""Kiểm tra tệp content/web/dayNN.json theo SPEC.md. Chạy: python3 check_web.py day03.json [day04.json ...]"""
import json, re, sys

def err(f, m):
    print(f"{f}: {m}"); return 1

def check(path):
    bad = 0
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        return err(path, f"JSON lỗi: {e}")
    n = d.get("day")
    if not isinstance(n, int) or not 1 <= n <= 14: bad += err(path, "thiếu 'day' 1–14")
    g = d.get("grammar_games", {})
    s = g.get("sort", {})
    groups = s.get("groups", [])
    if not 2 <= len(groups) <= 3: bad += err(path, "sort: cần 2–3 nhóm")
    tot = sum(len(x.get("items", [])) for x in groups)
    if not 8 <= tot <= 10: bad += err(path, f"sort: cần 8–10 mục, đang có {tot}")
    if len(g.get("unjumble", [])) != 5: bad += err(path, "unjumble: cần 5 câu")
    for u in g.get("unjumble", []):
        w = len(u.get("sentence", "").split())
        if not 5 <= w <= 13: bad += err(path, f"unjumble: câu {w} từ: {u.get('sentence')}")
    tf = g.get("truefalse", [])
    if len(tf) != 8: bad += err(path, "truefalse: cần 8 câu")
    for t in tf:
        if not isinstance(t.get("ok"), bool) or not t.get("s") or not t.get("fix") or not t.get("why_vi"):
            bad += err(path, f"truefalse thiếu trường: {t}")
    ex = d.get("exam", [])
    if not ex: bad += err(path, "thiếu exam")
    for e in ex:
        k = e.get("kind"); f = e.get("format")
        for key in ("format", "title_vi", "intro_vi", "tip_vi", "kind"):
            if not e.get(key): bad += err(path, f"exam {f}: thiếu {key}")
        if k == "mcq":
            want = 10 if f == "mixed" else 5
            if len(e.get("items", [])) != want: bad += err(path, f"exam {f}: cần {want} câu")
            for it in e.get("items", []):
                o = it.get("options", [])
                if len(o) != 4 or len(set(o)) != 4: bad += err(path, f"{f}: cần 4 lựa chọn khác nhau: {it.get('q')}")
                if it.get("answer") not in (0, 1, 2, 3): bad += err(path, f"{f}: answer phải là 0–3")
                if not it.get("explain_vi"): bad += err(path, f"{f}: thiếu explain_vi")
                if f == "pronunciation" and not all("[[" in x and "]]" in x for x in o): bad += err(path, "pronunciation: thiếu [[ ]]")
                if f == "error_id":
                    q = it.get("q", ""); pos = -1
                    for x in o:
                        p = q.find(x, pos + 1)
                        if p < 0: bad += err(path, f"error_id: '{x}' không có trong câu theo thứ tự"); break
                        pos = p
        elif k in ("cloze_mcq", "gap_text"):
            items = e.get("items", []); text = e.get("text", "")
            if len(items) != 5: bad += err(path, f"{f}: cần 5 chỗ trống")
            for i in range(1, len(items) + 1):
                if f"[{i}]" not in text: bad += err(path, f"{f}: text thiếu [{i}]")
            if k == "cloze_mcq":
                for it in items:
                    if len(it.get("options", [])) != 4 or it.get("answer") not in (0, 1, 2, 3): bad += err(path, f"{f}: lựa chọn/đáp án sai")
            else:
                for it in items:
                    if not it.get("answer"): bad += err(path, f"{f}: thiếu answer")
                    if f == "word_formation" and not it.get("base"): bad += err(path, "word_formation: thiếu base")
                if f == "listening" and len(e.get("script", "").split()) < 80: bad += err(path, "listening: script quá ngắn")
        elif k == "transform":
            if len(e.get("items", [])) != 5: bad += err(path, f"{f}: cần 5 câu")
            for it in e.get("items", []):
                for key in ("q", "start", "answer", "explain_vi"):
                    if key not in it: bad += err(path, f"{f}: thiếu {key}")
                if f == "key_word" and not it.get("word"): bad += err(path, "key_word: thiếu word")
        elif k == "matching":
            p = e.get("paragraphs", []); h = e.get("headings", []); a = e.get("answer", [])
            if len(p) != 4 or len(h) != 6 or len(a) != 4 or len(set(a)) != 4: bad += err(path, "matching: cần 4 đoạn, 6 tiêu đề, 4 đáp án khác nhau")
        elif k == "order":
            if len(e.get("lines", [])) != 6: bad += err(path, "order: cần 6 lượt lời")
        else:
            bad += err(path, f"kind lạ: {k}")
    if not bad: print(f"{path}: OK")
    return bad

if __name__ == "__main__":
    sys.exit(sum(check(p) for p in sys.argv[1:]) and 1)
