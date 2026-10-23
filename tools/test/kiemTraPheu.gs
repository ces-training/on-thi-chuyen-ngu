
/* Kiểm tra phễu bán hàng trên máy chủ thật: lead → việc gọi chào → đơn Gói Web → kích hoạt. Tự xoá dữ liệu thử, không gửi email thật. */
function kiemTraPheu() {
  var ROOT = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  var call = function (q) { try { return route_(q); } catch (e) { return { ok: false, error: String(e && e.message || e) }; } };
  var mark = {}; ['families', 'tasks', 'pkgOrders', 'students', 'staff', 'audit'].forEach(function (k) { mark[k] = sheet_(k).getLastRow(); });
  var realMail = MailApp.sendEmail, out = [], ok = true; MailApp.sendEmail = function () {};
  var check = function (n, c) { out.push((c ? 'ĐẠT  ' : 'LỖI  ') + n); if (!c) ok = false; };
  try {
    var sl = call({ action: 'm_staff_add', pin: ROOT, name: 'Sale thử phễu', role: 'sale' });
    var r = call({ action: 'lead', phone: '0900000001', parent: 'chị Thử', child: 'HS thử phễu', grade: 7, consent: true, brief: 'bản phác thử', src: { src: 'kiem-tra' } });
    check('Lead tạo mã học sinh', r.ok && !!r.code);
    var T = call({ action: 's_tasks', pin: sl.pin });
    var chao = (T.tasks || []).filter(function (t) { return t.kind === 'chao' && t.fam && t.fam.code === r.code; })[0];
    check('Sale có việc gọi chào kèm tin Zalo', !!chao && /bản phác thử/.test(chao.text));
    check('Đóng việc gọi chào', call({ action: 's_task_done', pin: sl.pin, id: chao.id, result: 'done' }).ok);
    var o = call({ action: 'pkg_order', pack: 'gd1', parent: 'Chị Thử', phone: '0900000001', child: 'HS thử phễu', code: r.code, consent: true });
    check('Đơn Gói Web GĐ1 790.000đ', o.ok && o.price === 790000);
    check('Kích hoạt gói', call({ action: 's_order_paid', pin: sl.pin, id: o.id, amount: 790000 }).ok && /^Gói Web/.test(getStudent_(r.code).paid));
    var ov = call({ action: 'm_overview', pin: ROOT });
    check('Tổng quan có phễu', ov.ok && ov.funnel && ov.funnel.steps.length === 6);
    check('Giá và chỗ Quản gia công khai', call({ action: 'prices' }).capacity != null);
  } finally {
    MailApp.sendEmail = realMail;
    Object.keys(mark).forEach(function (k) { var sh = sheet_(k), n = sh.getLastRow() - mark[k]; if (n > 0) sh.deleteRows(mark[k] + 1, n); });
  }
  Logger.log(out.join('\n') + '\n\n' + (ok ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' · đã xoá dữ liệu thử');
}
