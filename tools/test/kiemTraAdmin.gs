

/* Kiểm tra tầng Admin / Quản lý và nhật ký thao tác. Tự tạo tài khoản, học sinh thử rồi tự xoá. */
function kiemTraAdmin() {
  var ROOT = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  var call = function (pin, action, extra) {
    var q = { action: action, pin: pin }; for (var k in (extra || {})) q[k] = extra[k];
    try { return route_(q); } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  };
  var auditStart = sheet_('audit').getLastRow(), msgStart = sheet_('messages').getLastRow();
  var made = [], code = '', out = [], ok = true;
  var check = function (name, cond) { out.push((cond ? 'ĐẠT  ' : 'LỖI  ') + name); if (!cond) ok = false; };
  try {
    var me = call(ROOT, 't_whoami');
    check('PIN gốc = Admin', me.ok && me.me.role === 'admin');
    var ql = call(ROOT, 'm_staff_add', { name: 'QL thử', role: 'quanly' }); made.push(ql.id);
    check('Admin tạo được quản lý', ql.ok && !!ql.pin);
    var ql2 = call(ROOT, 'm_staff_add', { name: 'QL thử 2', role: 'quanly' }); made.push(ql2.id);
    check('Không ai tạo được tài khoản Admin', call(ROOT, 'm_staff_add', { name: 'x', role: 'admin' }).ok === false);
    var gv = call(ql.pin, 'm_staff_add', { name: 'GV thử', role: 'giaovien' }); made.push(gv.id);
    var sl = call(ql.pin, 'm_staff_add', { name: 'Sale thử', role: 'sale' }); made.push(sl.id);
    check('Quản lý tạo được giáo viên và sale', gv.ok && sl.ok);
    check('Quản lý KHÔNG tạo được quản lý', call(ql.pin, 'm_staff_add', { name: 'x', role: 'quanly' }).ok === false);
    check('Quản lý KHÔNG khoá được quản lý khác', call(ql.pin, 'm_staff_set', { id: ql2.id, active: false }).ok === false);
    check('Quản lý KHÔNG nâng sale lên quản lý', call(ql.pin, 'm_staff_set', { id: sl.id, role: 'quanly' }).ok === false);
    check('Gửi lời mời: tài khoản chưa có email thì báo no_email', call(ql.pin, 'm_invite', { id: gv.id }).error === 'no_email');
    check('Quản lý KHÔNG gửi lời mời thay cho tài khoản quản lý', call(ql.pin, 'm_invite', { id: ql2.id }).ok === false);
    check('Sale KHÔNG gửi được lời mời', call(sl.pin, 'm_invite', { id: gv.id }).error === 'forbidden');
    check('Quản lý KHÔNG xem được tab Giao tiếp', call(ql.pin, 'm_messages').ok === false);
    var stf = call(ql.pin, 'm_staff');
    check('Danh sách tài khoản: quản lý chỉ sửa được GV/sale', stf.ok && stf.staff.filter(function (x) { return x.id === ql2.id; })[0].canEdit === false && stf.staff.filter(function (x) { return x.id === gv.id; })[0].canEdit === true);
    var st = call(ROOT, 't_add', { name: 'HS thử quyền', grade: 7, credits: 0, teacher: gv.id }); code = st.code;
    check('Giáo viên nhắn tin cho học sinh được giao', call(gv.pin, 't_reply', { code: code, text: 'Chào con, cô xem bài rồi.' }).ok);
    call(ql.pin, 't_reply', { code: code, text: 'Quản lý nhắn thử.' });
    var msgs = call(ROOT, 'm_messages');
    var mine = msgs.rows.filter(function (m) { return m.code === code; });
    check('Admin thấy tin nhắn kèm người gửi (GV + quản lý)', mine.some(function (m) { return m.staff.indexOf(gv.id) >= 0; }) && mine.some(function (m) { return m.staff.indexOf(ql.id) >= 0; }));
    var studView = route_({ action: 'my', code: code });
    check('Học sinh không thấy mã tài khoản nhân viên', JSON.stringify(studView).indexOf(gv.id) < 0);
    call(sl.pin, 't_student', { code: code });            // sale bị từ chối
    call(gv.pin, 't_credits', { code: code, add: 14 });   // GV bị từ chối
    call(sl.pin, 't_credits', { code: code, add: 14 });   // sale cộng lượt
    call('sai-pin-thu', 't_whoami');
    var aAdmin = call(ROOT, 'm_audit'), aQl = call(ql.pin, 'm_audit');
    var R = aAdmin.rows;
    check('Nhật ký ghi lượt đăng nhập', R.some(function (r) { return r.whoId === gv.id && r.action === 't_whoami'; }) || R.some(function (r) { return r.action === 't_whoami'; }));
    check('Nhật ký ghi PIN sai', R.some(function (r) { return r.action === 'pin_sai'; }));
    check('Nhật ký ghi sale bị từ chối mở bài làm', R.some(function (r) { return r.whoId === sl.id && r.action === 't_student' && /^BỊ TỪ CHỐI/.test(r.detail); }));
    check('Nhật ký ghi chi tiết cộng lượt (cộng 14, còn 14)', R.some(function (r) { return r.whoId === sl.id && r.action === 't_credits' && /cộng 14 lượt, còn 14/.test(r.detail); }));
    check('Nhật ký ghi nội dung tin nhắn', R.some(function (r) { return r.whoId === gv.id && r.action === 't_reply' && /Chào con/.test(r.detail); }));
    check('Nhật ký ghi loại dữ liệu', R.some(function (r) { return r.kind === 'gói và lượt'; }));
    check('Admin thấy thao tác của quản lý', R.some(function (r) { return r.whoId === ql.id; }));
    check('Quản lý thấy thao tác GV/sale', aQl.rows.some(function (r) { return r.whoId === gv.id; }) && aQl.rows.some(function (r) { return r.whoId === sl.id; }));
    check('Quản lý KHÔNG thấy thao tác của Admin và quản lý khác', !aQl.rows.some(function (r) { return r.role === 'admin' || (r.role === 'quanly' && r.whoId !== ql.id); }));
    check('Tổng hợp theo tài khoản có số liệu', aAdmin.people.some(function (p) { return p.id === sl.id && p.denied >= 1; }));
  } finally {
    ['staff', 'students'].forEach(function (k) {
      rows_(k).reverse().forEach(function (r) { if (made.indexOf(String(r.id)) >= 0 || (k === 'students' && r.code === code)) sheet_(k).deleteRow(r._row); });
    });
    [['messages', msgStart], ['audit', auditStart]].forEach(function (x) { var sh = sheet_(x[0]), n = sh.getLastRow() - x[1]; if (n > 0) sh.deleteRows(x[1] + 1, n); });
  }
  Logger.log(out.join('\n') + '\n\n' + (ok ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' · đã xoá dữ liệu thử');
}
