#!/usr/bin/env python3
"""Tạo 8 nhân vật (ảnh thật kiểu cắt dán tạp chí) cho trang web bằng Gemini (Nano Banana 2.1).

Bước A  portraits : mỗi nhân vật 2 ảnh chân dung 1K trên nền xanh #00FF00 → cô chọn 1 ảnh (ghi "pick" trong cast.json)
Bước B  sheets    : dùng ảnh đã chọn làm ảnh mẫu, tạo 2 bảng 6 tư thế 2K (đồng phục + thường phục)
Bước C  process   : (miễn phí, chạy trên máy) tách nền xanh, khử viền xanh, cắt từng tư thế, viền trắng kiểu sticker,
                    lưu WebP trong suốt vào assets/cast/<id>-<tư thế>-<uniform|casual>.webp và avatar tròn assets/cast/avatar-<id>.webp

  python3 tools/gemini/gen_cast.py portraits --dry-run          # xem trước + ước tính chi phí cả 2 bước
  python3 tools/gemini/gen_cast.py portraits --direct --only linh
  python3 tools/gemini/gen_cast.py portraits --batch
  python3 tools/gemini/gen_cast.py sheets --batch
  python3 tools/gemini/gen_cast.py process

Chạy lại được: ảnh đã có thì bỏ qua; lô đang chờ thì tiếp tục chờ lô đó.
"""
import argparse, base64, io, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
WORK = HERE / "work/cast"
ASSETS = REPO / "assets/cast"
CAST = json.loads((HERE / "cast.json").read_text(encoding="utf-8"))
MODEL = CAST.get("model", "gemini-nano-banana-2.1")

# Giá theo trang pricing (10/2026), USD
IMG_PRICE = {"direct": {"1K": 0.0336, "2K": 0.0504}, "batch": {"1K": 0.0168, "2K": 0.0252}}
IN_PRICE = {"direct": 1.50, "batch": 0.75}      # / 1 triệu token vào (chữ + ảnh)
THINK_PRICE = {"direct": 7.50, "batch": 3.75}   # / 1 triệu token chữ + "thinking" ra
THINK_TOK = 1000   # ước tính; model ảnh Gemini 3 luôn "thinking" và tính tiền phần này, tài liệu không nêu số
REF_TOK = 1120     # ước tính token cho 1 ảnh mẫu đưa vào

OUTFITS = ("uniform", "casual")


def chars(only=None):
    cs = CAST["characters"]
    if only:
        want = {x.strip().lower() for o in only for x in o.split(",")}
        cs = [c for c in cs if c["id"] in want]
        if not cs:
            sys.exit("Không có nhân vật nào khớp --only")
    return cs


def outfit_text(c, which):
    if which == "uniform":
        u = CAST["uniform_girl" if c["gender"] == "girl" else "uniform_boy"]
        return u + (", " + c["uniform_extra"] if c.get("uniform_extra") else "")
    return c["casual"]


def portrait_prompt(c):
    return (f"{CAST['style']} Subject: {c['look']}, age {c['age']}, {c['personality']}. "
            f"Wearing {outfit_text(c, c['portrait_outfit'])}. "
            "Framing: mid-thigh up, standing, facing the camera, relaxed friendly pose, whole head and both arms inside the frame, "
            "natural expression. " + CAST["background"] + " " + CAST["original"])


def sheet_prompt(c, which):
    P = CAST["poses"]
    cells = "; ".join(f"({i + 1}) {d}" for i, (_, d) in enumerate(P))
    return ("Use the teenager in the reference image as the only character: keep exactly the same face, hairstyle, skin tone, "
            "body shape and age. Create a character pose sheet of this same person: six separate poses arranged in a grid of "
            "3 columns and 2 rows, each pose centred in its own equal cell, all at the same scale, framed from mid-thigh up, "
            "with wide empty green gaps between the cells so that no two poses touch or overlap. "
            f"In every pose the person wears {outfit_text(c, which)}. "
            f"Poses, reading left to right, top row then bottom row: {cells}. "
            f"{CAST['style']} " + CAST["background"] + " No grid lines, no numbers, no labels. " + CAST["original"])


def img_request(prompt, size, aspect, ref=None):
    parts = [{"text": prompt}]
    if ref:
        parts.insert(0, {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(ref).decode()}})
    return {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect, "imageSize": size}}}


def p_path(cid, k):
    return WORK / "portraits" / f"{cid}-{k}.png"


def s_path(cid, which):
    return WORK / "sheets" / f"{cid}-{which}.png"


def chosen(c):
    k = c.get("pick") or 1
    return p_path(c["id"], k)


def ref_bytes(path):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im.thumbnail((1024, 1024))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=90)
    return b.getvalue()


def plan(step, cs, ncand):
    """Danh sách (key, đường dẫn ra, hàm tạo request, size)."""
    jobs = []
    if step == "portraits":
        for c in cs:
            for k in range(1, ncand + 1):
                jobs.append((f"portrait/{c['id']}/{k}", p_path(c["id"], k),
                             (lambda c=c: img_request(portrait_prompt(c), "1K", "3:4")), "1K", 0))
    else:
        for c in cs:
            for w in OUTFITS:
                jobs.append((f"sheet/{c['id']}/{w}", s_path(c["id"], w),
                             (lambda c=c, w=w: img_request(sheet_prompt(c, w), "2K", "3:2", ref_bytes(chosen(c)))), "2K", 1))
    return jobs


def est(jobs, mode):
    usd = 0.0
    for key, _, mk, size, nref in jobs:
        prompt_tok = 300
        usd += IMG_PRICE[mode][size] + (prompt_tok + nref * REF_TOK) / 1e6 * IN_PRICE[mode] + THINK_TOK / 1e6 * THINK_PRICE[mode]
    return usd


def save_image(resp, path):
    import gemini_api as G
    from PIL import Image
    imgs = [(m, b) for m, b in G.inline_parts(resp) if m.startswith("image/") or b[:4] in (b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1")]
    if not imgs:
        raise ValueError("không có ảnh: " + G.why_empty(resp))
    path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(io.BytesIO(imgs[-1][1]))
    im.save(path)
    print(f"  ✓ {path.relative_to(REPO)}  {im.size[0]}×{im.size[1]}")


def contact(paths, out, cols=4, h=420):
    """Ghép ảnh chân dung thành 1 tấm để cô chọn."""
    from PIL import Image, ImageDraw
    ims = [(p, Image.open(p).convert("RGB")) for p in paths if p.exists()]
    if not ims:
        return
    ims = [(p, im.resize((int(im.width * h / im.height), h))) for p, im in ims]
    w = max(im.width for _, im in ims)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 10) + 10, rows * (h + 40) + 10), "white")
    d = ImageDraw.Draw(sheet)
    for i, (p, im) in enumerate(ims):
        x, y = 10 + (i % cols) * (w + 10), 10 + (i // cols) * (h + 40)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + h + 8), p.stem, fill="black")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=88)
    print("Ảnh để chọn:", out.relative_to(REPO))


# ================================================================== Bước C: hậu kỳ (numpy + Pillow, scipy nếu có)
def key_green(rgb):
    """rgb uint8 HxWx3 → (rgb float đã khử nhiễm xanh, alpha float). Màu nền đo từ viền ảnh."""
    import numpy as np
    f = rgb.astype(np.float32) / 255.0
    border = np.concatenate([f[:8].reshape(-1, 3), f[-8:].reshape(-1, 3), f[:, :8].reshape(-1, 3), f[:, -8:].reshape(-1, 3)])
    gb = border[:, 1] - border[:, [0, 2]].max(1)
    K = np.median(border[gb > 0.3], axis=0) if (gb > 0.3).sum() > 50 else np.array([0.0, 1.0, 0.0], np.float32)
    kg = max(float(K[1] - max(K[0], K[2])), 0.3)
    g = (f[..., 1] - np.maximum(f[..., 0], f[..., 2])) / kg      # 1 = nền, 0 = không xanh
    t0, t1 = 0.12, 0.80
    a = np.clip((t1 - g) / (t1 - t0), 0, 1)
    a[a < 0.03] = 0
    a[a > 0.97] = 1
    # khử nhiễm: C = a·F + (1−a)·K  →  F = (C − (1−a)·K) / a
    soft = (a > 0) & (a < 1)
    aa = np.maximum(a, 0.05)[..., None]
    F = f.copy()
    F[soft] = np.clip((f - (1 - aa) * K) / aa, 0, 1)[soft]
    return F, a, K


def despill(F, a, band=6):
    """Giới hạn kênh xanh lá trong dải viền (G ≤ max(R,B)) để hết ánh xanh ở mép."""
    import numpy as np
    try:
        from scipy import ndimage
        d = ndimage.distance_transform_edt(a > 0.5)
        edge = (a > 0) & (d <= band)
    except ImportError:
        from PIL import Image, ImageFilter
        m = Image.fromarray(((a > 0.5) * 255).astype("uint8")).filter(ImageFilter.MinFilter(2 * band + 1))
        edge = (a > 0) & (np.asarray(m) < 128)
    lim = np.maximum(F[..., 0], F[..., 2])
    G = F[..., 1]
    spill = np.where(edge, np.maximum(G - lim, 0), 0)
    F[..., 1] = G - spill
    F += (0.587 * spill)[..., None]          # bù lại độ sáng đã bớt (giữ luma), tránh mép bị xỉn
    return np.clip(F, 0, 1)


def choke(a, px=1):
    """Co alpha vào trong px điểm ảnh để bỏ hẳn viền lẫn nền (viền trắng sticker sẽ phủ chỗ này)."""
    from PIL import Image, ImageFilter
    import numpy as np
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * px + 1))
    return np.asarray(im).astype(np.float32) / 255.0


def split_poses(a, cols=3, rows=2, min_frac=0.0006):
    """Trả về list mask (bool HxW) cho từng ô theo thứ tự đọc. Dùng thành phần liên thông (scipy) hoặc lưới cố định."""
    import numpy as np
    H, W = a.shape
    try:
        from scipy import ndimage
    except ImportError:
        ndimage = None
    out = []
    if ndimage is None:
        for r in range(rows):
            for c in range(cols):
                m = np.zeros_like(a, bool)
                m[r * H // rows:(r + 1) * H // rows, c * W // cols:(c + 1) * W // cols] = True
                out.append(m & (a > 0))
        return out
    solid = a > 0.5
    lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
    if n == 0:
        return [np.zeros_like(solid) for _ in range(cols * rows)]
    idx = np.arange(1, n + 1)
    area = ndimage.sum(solid, lab, idx)
    cy, cx = np.array(ndimage.center_of_mass(solid, lab, idx)).T
    big = area >= min_frac * H * W
    cell = (np.clip((cy / H * rows).astype(int), 0, rows - 1) * cols + np.clip((cx / W * cols).astype(int), 0, cols - 1))
    # gán các điểm viền mờ (0 < a ≤ 0.5) cho nhãn gần nhất trong vòng 4px
    dist, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
    near = lab[iy, ix]
    near[(dist > 4) | (a <= 0)] = 0
    full = np.where(lab > 0, lab, near)
    for k in range(cols * rows):
        keep = idx[big & (cell == k)]
        if not len(keep):
            out.append(np.zeros_like(solid)); continue
        m = np.isin(lab, keep)
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        py, px = 0.02 * H, 0.02 * W  # mảnh nhỏ nằm trong khung (+2%): sợi tóc, dây tai nghe
        small = idx[(~big) & (cy >= y0 - py) & (cy <= y1 + py) & (cx >= x0 - px) & (cx <= x1 + px)]
        out.append(np.isin(full, np.concatenate([keep, small])))
    return out


def sticker(F, a, mask, max_h=600, outline=8, pad=2):
    """Cắt theo mask, thu nhỏ để cao ≤ max_h (tính cả viền), thêm viền trắng ~outline px. Trả về PIL RGBA."""
    import numpy as np
    from PIL import Image
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    A = np.where(mask, a, 0)[y0:y1, x0:x1]
    rgba = np.dstack([F[y0:y1, x0:x1], A])
    im = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA")
    m = outline + pad
    inner = max_h - 2 * m
    if im.height > inner:
        im = im.resize((max(1, round(im.width * inner / im.height)), inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (im.width + 2 * m, im.height + 2 * m), (0, 0, 0, 0))
    canvas.paste(im, (m, m))
    al = np.asarray(canvas)[..., 3] / 255.0
    try:
        from scipy import ndimage
        d = ndimage.distance_transform_edt(al < 0.5)
        ring = np.clip(outline + 0.5 - d, 0, 1)
    except ImportError:
        from PIL import ImageFilter
        r = Image.fromarray(((al >= 0.5) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * outline + 1)).filter(ImageFilter.GaussianBlur(0.8))
        ring = np.asarray(r) / 255.0
    white = np.zeros((canvas.height, canvas.width, 4), np.uint8)
    white[..., :3] = 255
    white[..., 3] = (np.maximum(ring, al) * 255 + 0.5).astype(np.uint8)
    return Image.alpha_composite(Image.fromarray(white, "RGBA"), canvas)


def process_sheet(path, cid, which, outdir, poses=None):
    import numpy as np
    from PIL import Image
    poses = poses or [p for p, _ in CAST["poses"]]
    rgb = np.asarray(Image.open(path).convert("RGB"))
    F, a, K = key_green(rgb)
    F = despill(F, a)
    a = choke(a)
    masks = split_poses(a)
    outs = []
    for name, m in zip(poses, masks):
        dst = outdir / f"{cid}-{name}-{which}.webp"
        if not m.any():
            print(f"  ! {path.name}: ô '{name}' trống — xem lại ảnh (các tư thế dính nhau hoặc lệch lưới)")
            continue
        st = sticker(F, a, m)
        outdir.mkdir(parents=True, exist_ok=True)
        st.save(dst, "WEBP", quality=88, method=6)
        outs.append(dst)
    return outs


def avatar(path, cid, color, outdir, size=128, box=None):
    """Avatar tròn 128px: tìm đầu từ phần trên của người trong ảnh chân dung (hoặc box=[cx,cy,side] theo tỉ lệ ảnh)."""
    import numpy as np
    from PIL import Image, ImageDraw
    rgb = np.asarray(Image.open(path).convert("RGB"))
    F, a, K = key_green(rgb)
    F = despill(F, a)
    H, W = a.shape
    if box:
        cx, cy, side = box[0] * W, box[1] * H, box[2] * H
    else:
        ys, xs = np.nonzero(a > 0.5)
        top, hs = ys.min(), ys.max() - ys.min()
        band = (ys < top + 0.16 * hs)
        cx = xs[band].mean()
        side = 0.34 * hs
        cy = top - 0.02 * hs + side / 2
    x0, y0 = int(cx - side / 2), int(cy - side / 2)
    S = 4 * size
    sub = np.dstack([F, a])
    im = Image.fromarray((sub * 255 + 0.5).astype(np.uint8), "RGBA").crop((x0, y0, x0 + int(side), y0 + int(side))).resize((S, S), Image.LANCZOS)
    bg = Image.new("RGBA", (S, S), color)
    face = Image.alpha_composite(bg, im)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(face, (0, 0), mask)
    out = out.resize((size, size), Image.LANCZOS)
    outdir.mkdir(parents=True, exist_ok=True)
    dst = outdir / f"avatar-{cid}.webp"
    out.save(dst, "WEBP", quality=90, method=6)
    return dst


# ================================================================== main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["portraits", "sheets", "process"])
    m = ap.add_mutually_exclusive_group()
    m.add_argument("--dry-run", action="store_true", help="in prompt, đếm số ảnh, ước tính chi phí (không gọi API)")
    m.add_argument("--batch", action="store_true", help="gửi qua Batch API (giá một nửa)")
    m.add_argument("--direct", action="store_true", help="gọi thẳng từng ảnh (thử nhanh)")
    ap.add_argument("--only", action="append", help="id nhân vật, vd linh hoặc linh,nam")
    ap.add_argument("--candidates", type=int, default=CAST.get("candidates", 2), help="số ảnh chân dung mỗi nhân vật (mặc định 2)")
    ap.add_argument("--no-wait", action="store_true", help="--batch: gửi lô rồi thoát; chạy lại sau để lấy ảnh")
    ap.add_argument("--force", action="store_true", help="process: làm lại cả sticker đã có")
    a = ap.parse_args()
    cs = chars(a.only)

    if a.step == "process":
        n = 0
        for c in cs:
            for w in OUTFITS:
                sp = s_path(c["id"], w)
                if not sp.exists():
                    print(f"  – chưa có {sp.relative_to(REPO)}"); continue
                if not a.force and all((ASSETS / f"{c['id']}-{p}-{w}.webp").exists() for p, _ in CAST["poses"]):
                    continue
                n += len(process_sheet(sp, c["id"], w, ASSETS))
            cp = chosen(c)
            if cp.exists() and (a.force or not (ASSETS / f"avatar-{c['id']}.webp").exists()):
                avatar(cp, c["id"], c.get("color", "#FFD166"), ASSETS, box=c.get("avatar_box")); n += 1
        print(n, "file mới trong", ASSETS.relative_to(REPO))
        return

    if not (a.dry_run or a.batch or a.direct):
        ap.error("chọn một trong --dry-run, --batch, --direct")
    jobs = plan(a.step, cs, a.candidates)
    todo = [j for j in jobs if not j[1].exists()]
    if a.step == "sheets":
        miss = [c["id"] for c in cs if not chosen(c).exists()]
        if miss and not a.dry_run:
            print("Chưa có ảnh chân dung đã chọn cho:", ", ".join(miss), "→ bỏ qua (chạy bước portraits trước)")
            todo = [j for j in todo if j[0].split("/")[1] not in miss]
        unpicked = [c["id"] for c in cs if not c.get("pick")]
        if unpicked:
            print("Chưa ghi 'pick' trong cast.json cho:", ", ".join(unpicked), "→ dùng ảnh số 1")

    if a.dry_run:
        print(f"Model: {MODEL}   bước: {a.step}   cần tạo {len(todo)}/{len(jobs)} ảnh")
        for key, path, mk, size, nref in jobs:
            print(f"  {key:26} {size}  → {path.relative_to(REPO)}{'  (đã có)' if path.exists() else ''}")
        if todo:
            key, path, mk, size, nref = todo[0]
            c = next(c for c in cs if c["id"] == key.split("/")[1])
            txt = portrait_prompt(c) if a.step == "portraits" else sheet_prompt(c, key.split("/")[2])
            cfg = {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "3:4" if a.step == "portraits" else "3:2", "imageSize": size}}
            print(f"\n--- Yêu cầu mẫu ({key}) → POST .../v1beta/models/{MODEL}:generateContent")
            print("parts:", ("[ảnh mẫu JPEG base64] + " if nref else "") + "text:\n" + txt)
            print("generationConfig:", json.dumps(cfg))
        # ước tính cả hai bước để cô thấy tổng
        allp = plan("portraits", cs, a.candidates)
        alls = [(k, p, None, s, r) for k, p, _, s, r in [(f"sheet/{c['id']}/{w}", s_path(c["id"], w), None, "2K", 1) for c in cs for w in OUTFITS]]
        for mode in ("batch", "direct"):
            print(f"Chi phí {mode:6}: bước này ${est(todo, mode):.2f}   |   cả A+B ({len(allp)} chân dung 1K + {len(alls)} bảng 2K): "
                  f"${est(allp, mode) + est(alls, mode):.2f}")
        print(f"(gồm ước tính ~{THINK_TOK} token 'thinking'/ảnh; giá ảnh: 1K ${IMG_PRICE['batch']['1K']}, 2K ${IMG_PRICE['batch']['2K']} khi Batch)")
        return

    if not todo:
        print("Không còn ảnh nào cần tạo." if all(j[1].exists() for j in jobs) else "Không có ảnh nào gửi được (xem thông báo ở trên).")
    elif a.direct:
        import gemini_api as G
        for key, path, mk, size, nref in todo:
            print(key)
            try:
                save_image(G.generate(MODEL, mk()), path)
            except Exception as e:
                print("  ✗", e)
    else:
        import gemini_api as G
        B = G.Batch(MODEL, WORK / f"batch-{a.step}.json", WORK)
        if not B.pending():
            items = [(key, mk()) for key, path, mk, size, nref in todo]
            print(f"Gửi lô {len(items)} ảnh, ước tính ${est(todo, 'batch'):.2f}")
            B.submit(items, f"ca14-cast-{a.step}")
        else:
            print("Đang có lô chưa xong, tiếp tục chờ:", B.pending()["name"])
        job = B.wait(no_wait=a.no_wait)
        if job is None:
            print("Lô chưa xong. Chạy lại đúng lệnh này sau để lấy ảnh.")
            return
        res = B.results(job)
        bad = 0
        for key, path, mk, size, nref in todo:
            r = res.get(key)
            try:
                if not r or ("error" in r and "candidates" not in r):
                    raise ValueError(json.dumps(r)[:300] if r else "không có kết quả")
                save_image(r, path)
            except Exception as e:
                bad += 1; print("  ✗", key, e)
        B.done()
        print("Xong lô" + (f", {bad} ảnh lỗi (chạy lại lệnh để gửi lại)" if bad else ""))
    if a.step == "portraits":
        contact([p_path(c["id"], k) for c in cs for k in range(1, a.candidates + 1)], WORK / "portraits-chon.jpg")
        print("Xem ảnh, ghi số ảnh chọn vào \"pick\" trong tools/gemini/cast.json, rồi chạy bước sheets.")
    else:
        print("Tiếp theo: python3 tools/gemini/gen_cast.py process")


if __name__ == "__main__":
    main()
