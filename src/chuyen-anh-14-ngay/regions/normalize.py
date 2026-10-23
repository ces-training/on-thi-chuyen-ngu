"""Chuẩn hoá dữ liệu nghiên cứu từng sở (regions/raw/<slug>.json) thành dữ liệu cho trang (regions/<slug>.json).

Chạy:  python3 src/chuyen-anh-14-ngay/regions/normalize.py
- Công thức: đọc formula.parts → trọng số {toan, van, ac (Anh chung), m3 (môn thứ ba khác), ach (Anh chuyên)}.
  Nếu tổng trọng số × 10 khác formula.max → in cảnh báo, dùng bản sửa tay trong OVERRIDES.
- Điểm chuẩn: chỉ lấy các năm có cùng thang điểm với năm gần nhất (công thức đổi thì số cũ không so được).
- Đích (goals): điểm Anh chuyên cần để tổng điểm chạm điểm chuẩn trung bình + 0,84 độ lệch, với Toán, Văn (và môn 3) = 8.
- Trường chuyên thuộc đại học (ptnk, chuyen-dh-vinh, …) gắn vào sở nơi trường đặt (UNI_HOME) thành một kỳ thi riêng.
Hà Nội (ha-noi.json) viết tay, không qua script này.
"""
import json, re, pathlib, statistics, math, unicodedata

HERE = pathlib.Path(__file__).parent
RAW = HERE / "raw"
LIST = {r["slug"]: r for r in json.load(open(HERE / "_list.json", encoding="utf-8"))}
UNI_HOME = {"ptnk": "tp-ho-chi-minh", "chuyen-dh-vinh": "nghe-an", "chuyen-khoa-hoc-hue": "hue"}
# sửa tay khi máy đọc công thức sai: slug → {exam_key: {"w": {...}, "max": …, "text": …}}
# cấu trúc đề suy ra từ đề các năm của tỉnh cũ (regions/de-cu/<slug>.json), dùng khi lượt tìm chính không có cấu trúc
DECU = {p.stem: json.load(open(p, encoding="utf-8")) for p in sorted((HERE / "de-cu").glob("*.json"))} if (HERE / "de-cu").exists() else {}
OVERRIDES = json.load(open(HERE / "overrides.json", encoding="utf-8")) if (HERE / "overrides.json").exists() else {}
TIERS = ["B1", "B1+", "B2", "B2+", "C1"]
LANG = {"Anh": "Anh", "Pháp": "Phap", "Phap": "Phap", "Trung": "Trung", "Nga": "Nga", "Nhật": "Nhat", "Nhat": "Nhat", "Hàn": "Han", "Han": "Han", "Đức": "Duc", "Duc": "Duc"}

def tier(d):
    d = (d or "").replace("–", "-")
    found = [t for t in TIERS if re.search(r"(?<![A-Z0-9+])" + re.escape(t) + r"(?![0-9+])", d)]
    if not found:
        return "B2"
    # khoảng "B2-C1" → lấy giữa; một mức → mức đó
    idx = sorted(TIERS.index(t) for t in found)
    return TIERS[(idx[0] + idx[-1] + 1) // 2] if len(idx) > 1 else TIERS[idx[0]]

def weights(parts, text=""):
    w = {"toan": 0, "van": 0, "ac": 0, "m3": 0, "ach": 0}
    m3_label = None
    for p in parts or []:
        q = p.lower()
        k = re.search(r"[×x\*]\s*(\d+(?:[.,]\d+)?)", q)
        coef = float(k.group(1).replace(",", ".")) if k else 1.0
        if "chuyên" in q:
            w["ach"] += coef
        elif "toán" in q:
            w["toan"] += coef
        elif "văn" in q:
            w["van"] += coef
        elif "anh" in q or "ngoại ngữ" in q:
            w["ac"] += coef
        else:
            w["m3"] += coef; m3_label = p.split("(")[0].strip()
    return w, m3_label

def year_cuts(cls):
    cut = {y: v for y, v in (cls.get("cut") or {}).items() if isinstance(v, (int, float))}
    sc = cls.get("scale") or {}
    if not cut:
        return [], [], None
    ys = sorted(cut)
    last = ys[-1]
    ref = sc.get(last)
    keep = [y for y in ys if (sc.get(y) == ref) or (ref is None and sc.get(y) is None)]
    return [int(y) for y in keep], [cut[y] for y in keep], ref

def solve_goal(w, mean, sd, cap=10.0, add=2.5):
    """Anh chuyên s sao cho tổng = mean + 0,84·sd (Toán, Văn, môn 3 = 8)."""
    target = mean + 0.84 * sd
    lo, hi = 0.0, 10.0
    for _ in range(50):
        s = (lo + hi) / 2
        tot = 8 * (w["toan"] + w["van"] + w["m3"]) + w["ac"] * min(cap, s + add) + w["ach"] * s
        lo, hi = (s, hi) if tot < target else (lo, s)
    return round((lo + hi) / 2, 1)

def exam_md(dates):
    m = re.search(r"(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*20\d\d", dates or "")
    if not m:
        m = re.search(r"(\d{1,2})\s*[/.-]\s*(\d{1,2})", dates or "")
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return [mo, d]
    return [6, 1]

def slugify(t):
    t = unicodedata.normalize("NFD", t.replace("đ", "d").replace("Đ", "D"))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")

def short(name):
    n = re.sub(r"^(Trường\s+)?(THPT|Phổ thông)\s+", "", name).strip()
    return n

def build_exam(raw, key, label, warnings, slug):
    F = raw.get("formula") or {}
    w, m3 = weights(F.get("parts"), F.get("text"))
    ov = OVERRIDES.get(slug, {}).get(key)
    if ov:
        w = dict({"toan": 0, "van": 0, "ac": 0, "m3": 0, "ach": 0}, **ov["w"]); m3 = ov.get("m3_label", m3)
    mx = (ov or {}).get("max") or F.get("max")
    if mx and abs(10 * sum(w.values()) - mx) > 0.01 and not (ov and ov.get("max")):
        warnings.append(f"{slug}/{key}: trọng số {w} (×10 = {10*sum(w.values())}) ≠ max {mx} — cần sửa tay")
    if w["ach"] == 0:
        warnings.append(f"{slug}/{key}: không thấy hệ số môn chuyên — cần sửa tay"); w["ach"] = 2
    P = dict(raw.get("chuyen_paper") or {})
    pred = None
    dc = DECU.get(slug if key == "so" else key)
    if dc and (dc.get("predicted") or {}).get("sections") and len({x.get("format") for x in P.get("sections") or [] if x.get("format") != "other"}) < 3:
        Q = dc["predicted"]
        for k2 in ("minutes", "has_listening", "essay_words", "difficulty", "difficulty_evidence"):
            if Q.get(k2) is not None: P[k2] = Q[k2]
        P["sections"] = Q["sections"]
        pred = {"basis": dc.get("basis"), "confidence": dc.get("confidence"),
                "evidence": [{k3: e.get(k3) for k3 in ("tinh_cu", "truong", "nam", "url", "loai")} for e in dc.get("evidence") or [] if e.get("url")]}
    paper = {"map": tier(P.get("difficulty")), "label": f"đề chuyên Anh {label}", "ac_add": 2.5, "ac_cap": 10,
             "ac_label": "Anh chung (đề chung)", "difficulty": P.get("difficulty"), "difficulty_evidence": P.get("difficulty_evidence"),
             "minutes": P.get("minutes"), "has_listening": P.get("has_listening"), "essay_words": P.get("essay_words"),
             "sections": P.get("sections") or [], "sample_links": P.get("sample_links") or []}
    if pred: paper["predicted"] = pred
    formula = {"w": {k: v for k, v in w.items() if v}, "paper": key, "text": (ov or {}).get("text") or F.get("text"), "max": mx}
    return formula, paper, m3

def options_for(raw, key, slug, warnings, fmax=None):
    out = []
    for s in raw.get("schools") or []:
        if "đã dừng" in s["name"] or "dừng tuyển" in s["name"]:
            continue  # lớp chuyên không còn tuyển: chỉ hiện ở trang tỉnh, không đưa vào gợi ý trường
        sk = slugify(short(s["name"]))[:28] or "sch"
        nAnh = sum(1 for c in s.get("classes") or [] if c.get("lang") == "Anh")
        for ci, c in enumerate(s.get("classes") or []):
            lang = LANG.get(c.get("lang"), None)
            if not lang:
                continue
            if lang != "Anh" and not c.get("admit_by_english"):
                continue
            ys, cs, ref = year_cuts(c)
            if fmax:
                keep = [(y, v) for y, v in zip(ys, cs) if v <= fmax]
                if len(keep) < len(cs):
                    warnings.append(f"{slug}: {s['name']} lớp {lang}: bỏ điểm chuẩn vượt thang {fmax}")
                ys, cs = [y for y, _ in keep], [v for _, v in keep]
            campus = None
            if lang == "Anh" and nAnh > 1:
                m = re.search(r"cơ sở ([A-ZĐÂĂÔƠƯÊ][^\s(,;.–]*(?: [A-ZĐÂĂÔƠƯÊ][^\s(,;.–]*)*)", c.get("note") or "")
                campus = m.group(1) if m else f"lớp {ci + 1}"
            sfx = ("-" + slugify(campus)) if campus else ""
            out.append({"id": f"{key}-{sk}-{lang.lower()}{sfx}", "sk": f"{key}-{sk}{sfx}", "school": s["name"] + (f" – cơ sở {campus}" if campus and not campus.startswith("lớp") else (f" ({campus})" if campus else "")),
                        "area": s.get("old_province"), "cls": "chuyên " + {"Phap": "Pháp", "Nhat": "Nhật", "Han": "Hàn", "Duc": "Đức"}.get(lang, lang),
                        "lang": lang, "f": key, "exam": key, "group": "nv" if lang == "Anh" else "extra",
                        "years": ys, "cut": cs, "scale": ref, "quota": c.get("quota"), "note": c.get("note")})
            if len(cs) < 2:
                warnings.append(f"{slug}: {s['name']} lớp {lang} chỉ có {len(cs)} năm điểm chuẩn cùng thang")
    return out

def main():
    warnings = []
    raws = {p.stem: json.load(open(p, encoding="utf-8")) for p in sorted(RAW.glob("*.json"))}
    regions = {}
    for slug, raw in raws.items():
        if slug in UNI_HOME or slug not in LIST:
            continue
        meta = LIST[slug]
        f, paper, m3 = build_exam(raw, "so", "của Sở " + meta["name"], warnings, slug)
        ex26 = raw.get("exam_2026") or {}
        regions[slug] = {
            "slug": slug, "name": meta["name"], "merged_from": meta["merged_from"], "edition": "Bản " + meta["name"],
            "exam_md": exam_md(ex26.get("dates")),
            "papers": {"so": paper}, "formulas": {"so": f}, "m3_label": m3,
            "exams": {"so": {"label": f"Kỳ thi của Sở GD&ĐT {meta['name']}", "date": ex26.get("dates") or "", "rule": raw.get("nv_rule") or ""}},
            "nv2_exam": None, "nv_rule": raw.get("nv_rule"),
            "options": options_for(raw, "so", slug, warnings, f.get("max")),
            "paper": paper, "exam_2026": ex26, "plan_2027": raw.get("plan_2027"),
            "stories": raw.get("stories") or [], "prep_tips": raw.get("prep_tips") or [],
            "confidence": raw.get("confidence"), "gaps": raw.get("gaps") or [], "sources": raw.get("sources") or [],
            "formula_raw": raw.get("formula"), "schools_raw": raw.get("schools"),
        }
    for uslug, home in UNI_HOME.items():
        raw = raws.get(uslug)
        if not raw or home not in regions:
            continue
        R = regions[home]
        f, paper, _ = build_exam(raw, uslug, raw.get("so") or uslug, warnings, uslug)
        R["papers"][uslug] = paper; R["formulas"][uslug] = f
        R["exams"][uslug] = {"label": f"Kỳ thi riêng của {raw.get('so')}", "date": (raw.get("exam_2026") or {}).get("dates") or "", "rule": raw.get("nv_rule") or ""}
        R["options"] += options_for(raw, uslug, uslug, warnings, f.get("max"))
        R.setdefault("uni", []).append({"slug": uslug, "name": raw.get("so"), "paper": paper, "stories": raw.get("stories") or [],
                                        "prep_tips": raw.get("prep_tips") or [], "sources": raw.get("sources") or [], "formula_raw": raw.get("formula"),
                                        "schools_raw": raw.get("schools"), "exam_2026": raw.get("exam_2026"), "gaps": raw.get("gaps") or []})
    # đích ôn: mỗi lớp chuyên Anh có ≥ 2 năm điểm chuẩn
    for slug, R in regions.items():
        goals = []
        for o in R["options"]:
            if o["lang"] != "Anh" or len(o["cut"]) < 1:
                continue
            F = R["formulas"][o["f"]]; w = dict({"toan": 0, "van": 0, "ac": 0, "m3": 0, "ach": 0}, **F["w"])
            recent = o["cut"][-3:]
            mean = statistics.mean(recent); sd = statistics.stdev(recent) if len(recent) > 2 else 1.3
            sdTot = math.sqrt(sd * sd + (1.5 * math.sqrt(sum(w.values()) / 5)) ** 2)
            s = solve_goal(w, mean, sdTot)
            goals.append({"k": o["sk"], "name": short(o["school"]), "score": min(9.3, s), "paper": o["f"], "need_tv_more": s > 9.3})
        seen = set(); G = []
        for g in sorted(goals, key=lambda g: -g["score"]):
            if g["k"] not in seen:
                seen.add(g["k"]); G.append(g)
        R["goals"] = G
        R["goal_default"] = G[len(G) // 2]["k"] if G else None
        if not G:
            warnings.append(f"{slug}: chưa có đích ôn (thiếu điểm chuẩn chuyên Anh)")
        json.dump(R, open(HERE / f"{slug}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(regions)} sở đã chuẩn hoá")
    for w in warnings:
        print("CẢNH BÁO", w)

if __name__ == "__main__":
    main()
