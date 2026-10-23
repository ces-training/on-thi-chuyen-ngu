/**
 * Máy chủ cho "Chuyên Anh 14 Ngày" — chạy trên Google Apps Script, gắn với một Google Sheet.
 *
 * Lưu: danh sách học sinh + chỉ số (sheet "Học sinh"), bài giấy đã chụp và kết quả chấm (sheet "Bài giấy"),
 * tin nhắn giữa con và cô (sheet "Tin nhắn"). Ảnh bài làm và tiến độ chi tiết lưu trong Google Drive.
 * Chấm ảnh bằng Claude API. Khoá API và mã PIN của cô để trong Script properties, không để trong mã.
 *
 * Script properties cần có:
 *   CLAUDE_API_KEY  — khoá API tạo ở console.anthropic.com
 *   TEACHER_PIN     — mã PIN cô dùng để vào trang theo dõi (ít nhất 6 ký tự)
 *   MODEL           — (tuỳ chọn) mô hình đọc ảnh bài làm và chấm bản trả phí, mặc định claude-sonnet-5-5
 *   MODEL_FREE      — (tuỳ chọn) mô hình chấm bài viết bản thường (không trả phí), mặc định claude-haiku-5-5
 *
 * Luồng chấm bài giấy:
 *   1. Con chụp ảnh → máy chấm phần trắc nghiệm/điền từ (có giải thích câu sai) và CHÉP bài viết thành chữ, chưa chấm bài viết.
 *   2. Con đọc bản chép, sửa chỗ máy đọc nhầm, bấm xác nhận → máy chấm bài viết bản thường (điểm /10, 2 điểm tốt, 2 điểm cần sửa).
 *   3. Bản trả phí (cột paid của sheet Học sinh khác rỗng): nhận xét chi tiết theo 4 tiêu chí bài viết đề chuyên.
 *      Con chưa trả phí bấm "Mình muốn mua" → ghi vào sheet "Yêu cầu mua" và nhắn cho cô.
 *
 * Máy chấm bản thường (trắc nghiệm có giải thích, chép và chấm bài viết) miễn phí với mọi mã học sinh.
 * Nhận xét chi tiết theo tiêu chí đề chuyên tính phí: 4.000đ/bài, gói 14 bài 50.000đ. Cột credits của sheet Học sinh
 * là số lượt chấm chi tiết đã mua; mỗi bài xem nhận xét chi tiết trừ 1 lượt (học sinh có cột paid = gói học thì không trừ).
 * Form mua lượt của bố mẹ (action 'request', không cần mã): lưu vào sheet "Phụ huynh đăng ký", gửi email cho cô
 * (Script property TEACHER_EMAIL, mặc định email của tài khoản chạy máy chủ). Cô thu tiền rồi cấp mã / cộng lượt.
 */

var SHEETS = {
  students: { name: 'Học sinh', cols: ['code', 'name', 'grade', 'created', 'lastSeen', 'daysWeb', 'daysPaper', 'webAcc', 'retryAcc', 'mastered', 'eff', 'entryLevel', 'finalLevel', 'planMin', 'planDpw', 'paperAvg', 'stateFileId', 'summary', 'paid', 'credits', 'teacher'] },
  uploads: { name: 'Bài giấy', cols: ['id', 'ts', 'code', 'day', 'fileIds', 'status', 'score', 'total', 'result', 'teacherNote', 'updated', 'error', 'tries', 'charged'] },
  messages: { name: 'Tin nhắn', cols: ['id', 'ts', 'code', 'from', 'uploadId', 'itemId', 'text', 'seenTeacher', 'seenStudent', 'staff'] },
  orders: { name: 'Yêu cầu mua', cols: ['id', 'ts', 'code', 'name', 'product', 'status', 'note'] },
  staff: { name: 'Nhân sự', cols: ['id', 'name', 'role', 'pinHash', 'active', 'created', 'email'] },
  audit: { name: 'Nhật ký truy cập', cols: ['ts', 'who', 'role', 'action', 'target', 'detail', 'kind', 'whoId'] },
  requests: { name: 'Phụ huynh đăng ký', cols: ['id', 'ts', 'parent', 'phone', 'email', 'child', 'grade', 'region', 'school', 'want', 'pack', 'note', 'fileIds', 'consent', 'status', 'code', 'teacherNote', 'handler'] }
};
var PRICE_PER = 4000, PACKS = { thu14: { n: 14, price: 50000, label: 'Gói 14 bài · 50.000đ' }, le: { n: 1, price: 4000, label: 'Lẻ · 4.000đ/bài' } };
/* gói: 'thu14' hoặc 'le:<số bài>' */
function packInfo_(pack) {
  var m = /^le:(\d{1,3})$/.exec(String(pack || ''));
  if (m) { var n = Math.max(1, Math.min(200, Number(m[1]))); return { n: n, price: n * PRICE_PER, label: 'Lẻ ' + n + ' bài · ' + (n * PRICE_PER).toLocaleString('vi-VN') + 'đ' }; }
  return PACKS.thu14;
}
var DEFAULT_MODEL = 'claude-sonnet-5-5';
var DEFAULT_MODEL_FREE = 'claude-haiku-5-5';
var MAX_IMAGES = 6;
var MAX_IMAGE_B64 = 6 * 1024 * 1024;

/* ---------- cài đặt một lần ---------- */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (k) {
    var def = SHEETS[k];
    var sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    if (sh.getLastRow() === 0) sh.appendRow(def.cols);
    else if (sh.getLastColumn() < def.cols.length) sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols]); // thêm cột mới vào sheet cũ
    sh.setFrozenRows(1);
  });
  rootFolder_();
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'processPending'; });
  if (!has) ScriptApp.newTrigger('processPending').timeBased().everyMinutes(5).create();
  var p = PropertiesService.getScriptProperties();
  var missing = ['CLAUDE_API_KEY', 'TEACHER_PIN'].filter(function (k) { return !p.getProperty(k); });
  Logger.log(missing.length ? 'Còn thiếu Script properties: ' + missing.join(', ') : 'Cài đặt xong. Giờ bấm Triển khai → Tùy chọn triển khai mới → Ứng dụng web.');
}

function rootFolder_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Chuyên Anh 14 Ngày – bài làm của học sinh');
  p.setProperty('FOLDER_ID', f.getId());
  return f;
}

/* ---------- cổng vào ---------- */
function doGet() { return out_({ ok: true, service: 'chuyen-anh-14', time: new Date().toISOString() }); }

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad_json' }); }
  try { return out_(route_(req || {})); }
  catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function route_(q) {
  var a = String(q.action || '');
  if (a === 'ping') return { ok: true };
  if (a === 'request') return request_(q);
  if (a === 'prices') return { ok: true, per: PRICE_PER, packs: PACKS, web: WEB_PACKS, capacity: capacity_() };
  if (a === 'lead') return lead_(q);
  if (a === 'consult') return consult_(q);
  if (a === 'pkg_order') return pkgOrder_(q);
  if (/^(t|s|m)_/.test(a)) {
    var me, tgt = clip_(q.code || q.id || q.uploadId || q.fileId || q.name || '', 120);
    try { me = whoIs_(q.pin); }
    catch (e) { if (e.message === 'bad_pin') logAccess_({ id: '?', name: 'Không rõ (PIN sai)', role: '' }, 'pin_sai', '', 'Đăng nhập bằng PIN sai'); throw e; }
    var allowed = me.role === 'admin' || (me.role === 'quanly' ? ADMIN_ONLY.indexOf(a) < 0 : (ROLE_ACTIONS[me.role] || []).indexOf(a) >= 0);
    if (!allowed) { logAccess_(me, a, tgt, 'BỊ TỪ CHỐI: tài khoản không có quyền'); return { ok: false, error: 'forbidden' }; }
    var res;
    try { res = staffRoute_(a, q, me); }
    catch (e) { logAccess_(me, a, tgt, 'BỊ TỪ CHỐI / LỖI: ' + (e && e.message)); throw e; }
    logAccess_(me, a, tgt, res && res.ok === false ? 'BỊ TỪ CHỐI: ' + res.error : auditDetail_(a, q, res));
    return res;
  }
  var st = getStudent_(q.code);
  if (!st) return { ok: false, error: 'bad_code' };
  switch (a) {
    case 'login': return login_(st);
    case 'sync': return sync_(st, q.state, q.kpi, q.sum);
    case 'upload': return upload_(st, q.day, q.images);
    case 'my': return my_(st);
    case 'message': return message_(st, q.uploadId, q.itemId, q.text);
    case 'confirm_writing': return confirmWriting_(st, q.uploadId, q.text);
    case 'writing_detail': return writingDetail_(st, q.uploadId);
    case 'buy_request': return buyRequest_(st, q.product, q.uploadId);
    case 'signal': return signal_(st, q.kind);
  }
  throw new Error('unknown_action');
}

/* ---------- nhân sự và phân quyền ----------
   Mã PIN trong Script property TEACHER_PIN là tài khoản quản lý gốc (thấy và làm được mọi việc).
   Quản lý tạo tài khoản cho giáo viên, sale (sheet "Nhân sự", chỉ lưu bản băm của PIN).
   - giáo viên: chỉ học sinh được giao (cột teacher của sheet Học sinh): tiến độ, bài làm, chấm lại, nhắn tin.
     Không thấy liên hệ phụ huynh, yêu cầu mua, doanh thu.
   - sale: phụ huynh đăng ký, liên hệ, cấp mã, cộng lượt, bật gói; mỗi học sinh chỉ một dòng tóm tắt học tập.
     Không xem bài làm, ảnh bài, tin nhắn.
   Máy chủ lọc dữ liệu theo vai; trang web chỉ ẩn/hiện cho gọn. */
var ROLE_ACTIONS = {
  giaovien: ['t_whoami', 't_list', 't_student', 't_reply', 't_override', 't_regrade', 't_image', 't_consults', 't_consult_note'],
  sale: ['t_whoami', 's_list', 't_add', 't_credits', 't_paid', 't_order', 't_requests', 't_req_issue', 't_req_status',
    's_tasks', 's_task_done', 's_families', 's_family_set', 's_orders', 's_order_paid', 's_order_status', 's_quangia']
};
var ROLE_VI = { admin: 'Admin', quanly: 'Quản lý', giaovien: 'Giáo viên', sale: 'Sale' };
/* Admin = mã PIN gốc (Script property TEACHER_PIN), là chủ tài khoản: làm được mọi việc, tạo và quản lý cả tài khoản quản lý,
   xem toàn bộ nhật ký (kể cả của quản lý) và toàn bộ tin nhắn nhân viên gửi học sinh.
   Quản lý: mọi việc của trang, trừ phần chỉ dành cho Admin; chỉ tạo và sửa tài khoản giáo viên, sale;
   nhật ký chỉ thấy thao tác của giáo viên, sale và của chính mình. */
var ADMIN_ONLY = ['m_messages'];
/* Mọi thao tác của nhân viên đều ghi nhật ký (kể cả xem, đăng nhập, PIN sai, bị từ chối): tên việc và loại dữ liệu */
var ACT_VI = {
  t_whoami: ['Đăng nhập / mở trang', 'tài khoản'], t_list: ['Xem danh sách học sinh', 'học sinh'], s_list: ['Xem danh sách học sinh và liên hệ phụ huynh', 'phụ huynh'],
  t_student: ['Mở hồ sơ học sinh (bài làm, tin nhắn)', 'bài làm'], t_image: ['Xem ảnh bài làm', 'bài làm'], t_reply: ['Nhắn tin cho học sinh', 'tin nhắn'],
  t_override: ['Sửa chấm bài giấy', 'bài làm'], t_regrade: ['Chấm lại bài giấy bằng máy', 'bài làm'], t_add: ['Cấp mã học sinh', 'học sinh'],
  t_credits: ['Cộng lượt nhận xét chi tiết', 'gói và lượt'], t_paid: ['Bật/tắt gói học', 'gói và lượt'], t_order: ['Đổi trạng thái yêu cầu mua', 'phụ huynh'],
  t_requests: ['Xem phụ huynh đăng ký (có liên hệ)', 'phụ huynh'], t_req_issue: ['Đã thu tiền · cấp mã / cộng lượt', 'gói và lượt'],
  t_req_status: ['Đổi trạng thái phụ huynh đăng ký', 'phụ huynh'], m_overview: ['Xem tổng quan, doanh thu', 'tổng quan'], m_staff: ['Xem danh sách tài khoản', 'tài khoản'],
  m_staff_add: ['Tạo tài khoản', 'tài khoản'], m_invite: ['Gửi lời mời qua email', 'tài khoản'], m_staff_set: ['Sửa tài khoản (khoá, mở, PIN, vai)', 'tài khoản'], m_assign: ['Giao học sinh cho giáo viên', 'học sinh'],
  m_audit: ['Xem nhật ký', 'nhật ký'],
  s_tasks: ['Xem việc hôm nay của sale', 'phụ huynh'], s_task_done: ['Đóng một việc của sale', 'phụ huynh'], s_families: ['Xem danh sách gia đình (lead)', 'phụ huynh'],
  s_family_set: ['Đổi trạng thái gia đình', 'phụ huynh'], s_orders: ['Xem đơn gói học', 'gói và lượt'], s_order_paid: ['Đã thu tiền · kích hoạt gói', 'gói và lượt'],
  s_order_status: ['Đổi trạng thái đơn gói học', 'gói và lượt'], s_quangia: ['Kích hoạt Gói Quản gia', 'gói và lượt'],
  t_consults: ['Xem lịch tư vấn', 'phụ huynh'], t_consult_note: ['Ghi kết luận tư vấn', 'phụ huynh'], m_messages: ['Xem tin nhắn nhân viên gửi học sinh', 'tin nhắn'], pin_sai: ['Đăng nhập bằng PIN sai', 'tài khoản']
};
function auditDetail_(a, q, r) {
  r = r || {};
  switch (a) {
    case 't_credits': return 'cộng ' + q.add + ' lượt, còn ' + r.credits;
    case 't_paid': return q.paid ? 'bật gói ' + q.paid : 'tắt gói học';
    case 't_req_issue': return 'mã ' + r.code + ' · thêm ' + r.credits + ' lượt' + (r.mailed ? ' · đã gửi email cho phụ huynh' : '');
    case 't_req_status': return 'trạng thái: ' + q.status + (q.note ? ' · ghi chú: ' + clip_(q.note, 300) : '');
    case 't_order': return 'trạng thái: ' + q.status;
    case 't_reply': return '“' + clip_(q.text, 400) + '”';
    case 't_override': return q.itemId ? 'câu ' + q.itemId + ' → ' + (q.correct === true ? 'đúng' : q.correct === false ? 'sai' : 'chưa rõ') : q.writingScore != null ? 'điểm bài viết → ' + q.writingScore : q.teacherNote != null ? 'nhận xét: ' + clip_(q.teacherNote, 300) : '';
    case 't_regrade': return 'kết quả mới ' + r.score + '/' + r.total;
    case 't_add': return clip_(q.name, 80) + ' · lớp ' + (q.grade || '') + ' · ' + (Number(q.credits) || 0) + ' lượt → mã ' + r.code;
    case 'm_staff_add': return clip_(q.name, 80) + ' · ' + (ROLE_VI[q.role] || q.role) + ' → ' + r.id + (r.mailed ? ' · đã gửi lời mời tới ' + r.email : '');
    case 'm_invite': return 'gửi lời mời tới ' + r.email;
    case 's_task_done': return (q.result === 'skip' ? 'bỏ qua' : 'xong') + (q.note ? ' · ' + clip_(q.note, 200) : '') + (q.teacher ? ' · hẹn tư vấn với ' + q.teacher + ' lúc ' + (q.when || '') : '') + (q.replied ? ' · bố mẹ đã trả lời' : '');
    case 's_family_set': return [q.status ? 'trạng thái: ' + q.status : '', q.reason ? 'lý do: ' + q.reason : '', q.saleNote != null ? 'ghi chú: ' + clip_(q.saleNote, 200) : ''].filter(String).join(' · ');
    case 's_order_paid': return 'đơn ' + q.id + ' · thu ' + (Number(q.amount) || 0).toLocaleString('vi-VN') + 'đ → ' + (r.paid || '');
    case 's_order_status': return 'đơn ' + q.id + ' → ' + q.status;
    case 's_quangia': return 'Quản gia · thu ' + (Number(q.amount) || 0).toLocaleString('vi-VN') + 'đ';
    case 't_consult_note': return 'đề xuất: ' + q.proposal + (q.note ? ' · ' + clip_(q.note, 200) : '');
    case 's_tasks': return (r.tasks || []).length + ' việc mở';
    case 's_families': return (r.families || []).length + ' gia đình';
    case 'm_staff_set': return [q.active != null ? (q.active ? 'mở lại' : 'khoá') : '', q.resetPin ? 'cấp PIN mới' : '', q.role ? 'đổi vai thành ' + (ROLE_VI[q.role] || q.role) : ''].filter(String).join(' · ');
    case 'm_assign': return 'học sinh ' + q.code + ' → ' + (q.teacher || 'bỏ giao');
    case 't_list': case 's_list': return (r.students || []).length + ' học sinh';
    case 't_requests': return (r.requests || []).length + ' yêu cầu';
  }
  return '';
}
var ISSUED = 'đã cấp lượt';

function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'ces-pin:' + s, Utilities.Charset.UTF_8)); }
function whoIs_(pin) {
  pin = String(pin || '').trim();
  var c = CacheService.getScriptCache(), bad = Number(c.get('bad_pin') || 0);
  if (bad > 30) throw new Error('busy'); // chặn đoán PIN: quá 30 lần sai trong 10 phút
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  if (pin && real && pin === String(real)) return { id: 'ADMIN', name: 'Admin', role: 'admin' };
  if (pin) {
    var h = hash_(pin);
    var st = rows_('staff').filter(function (r) { return String(r.pinHash) === h && (r.active === true || r.active === 'TRUE'); })[0];
    if (st) return { id: String(st.id), name: String(st.name), role: String(st.role) };
  }
  c.put('bad_pin', String(bad + 1), 600);
  throw new Error('bad_pin');
}
function logAccess_(me, action, target, detail) {
  try {
    insert_('audit', { ts: now_(), who: me.name + ' (' + me.id + ')', role: me.role, action: action, target: clip_(target, 120),
      detail: clip_(detail || '', 600), kind: (ACT_VI[action] || [])[1] || '', whoId: me.id });
  } catch (e) {}
}
/* nhật ký: Admin thấy tất cả; quản lý thấy thao tác của giáo viên, sale và của chính mình */
function mAudit_(me) {
  var rows = rows_('audit').filter(function (r) { return me.role === 'admin' || r.role === 'giaovien' || r.role === 'sale' || String(r.whoId) === me.id; });
  var staff = rows_('staff'), wk = Date.now() - 7 * 864e5;
  var people = staff.filter(function (x) { return me.role === 'admin' || x.role === 'giaovien' || x.role === 'sale' || String(x.id) === me.id; }).map(function (x) {
    var mine = rows.filter(function (r) { return String(r.whoId) === String(x.id); });
    var logins = mine.filter(function (r) { return r.action === 't_whoami'; });
    return { id: x.id, name: x.name, roleVi: ROLE_VI[x.role] || x.role, active: activeOf_(x), lastLogin: logins.length ? logins[logins.length - 1].ts : '',
      lastAction: mine.length ? mine[mine.length - 1].ts : '', week: mine.filter(function (r) { return new Date(r.ts).getTime() > wk && r.action !== 't_whoami'; }).length,
      denied: mine.filter(function (r) { return /^BỊ TỪ CHỐI/.test(String(r.detail)); }).length };
  });
  return { ok: true, people: people, rows: rows.slice(-1500).reverse().map(function (r) {
    return { ts: r.ts, who: r.who, whoId: r.whoId, role: r.role, roleVi: ROLE_VI[r.role] || '', action: r.action, actionVi: (ACT_VI[r.action] || [r.action])[0], kind: r.kind, target: r.target, detail: r.detail };
  }) };
}
/* Admin: mọi tin nhắn giữa nhân viên và học sinh, kèm người gửi */
function mMessages_() {
  var studs = {}; rows_('students').forEach(function (s) { studs[s.code] = s.name; });
  return { ok: true, rows: rows_('messages').slice(-800).reverse().map(function (m) {
    return { ts: m.ts, code: m.code, student: studs[m.code] || '', from: m.from, staff: m.staff || '', uploadId: m.uploadId || '', itemId: m.itemId || '', text: m.text };
  }) };
}
/* giáo viên chỉ đụng tới học sinh được giao */
function mine_(me, code) {
  if (me.role !== 'giaovien') return true;
  var st = getStudent_(code);
  return !!st && String(st.teacher) === me.id;
}
function guard_(me, code) { if (!mine_(me, code)) throw new Error('forbidden'); }
function uploadCode_(uploadId) { var u = find_('uploads', 'id', uploadId); if (!u) throw new Error('no_upload'); return u.code; }

function staffRoute_(a, q, me) {
  switch (a) {
    case 't_whoami': return { ok: true, me: me, roleVi: ROLE_VI[me.role] || me.role };
    case 't_list': return tList_(me);
    case 't_student': guard_(me, q.code); return tStudent_(q.code, me);
    case 't_reply': guard_(me, q.code); return tReply_(q.code, q.uploadId, q.itemId, q.text, me);
    case 't_override': guard_(me, uploadCode_(q.uploadId)); return tOverride_(q);
    case 't_regrade': guard_(me, uploadCode_(q.uploadId)); return tRegrade_(q.uploadId);
    case 't_image': return tImage_(q.fileId, me);
    case 't_add': return tAdd_(q.name, q.grade, q.credits, (me.role === 'quanly' || me.role === 'admin') ? q.teacher : '');
    case 't_credits': return tCredits_(q.code, q.add);
    case 't_paid': return tPaid_(q.code, q.paid);
    case 't_order': return tOrder_(q.id, q.status);
    case 't_requests': return tRequests_();
    case 't_req_issue': return tReqIssue_(q.id, q.credits, q.sendEmail, me);
    case 't_req_status': return tReqStatus_(q.id, q.status, q.note, me);
    case 's_list': return sList_();
    case 'm_overview': return mOverview_();
    case 'm_staff': return mStaff_(me);
    case 'm_staff_add': return mStaffAdd_(q.name, q.role, q.email, me, q.invite);
    case 'm_invite': return mInvite_(q.id, me);
    case 'm_staff_set': return mStaffSet_(q.id, q, me);
    case 'm_messages': return mMessages_();
    case 's_tasks': return sTasks_(me);
    case 's_task_done': return sTaskDone_(q, me);
    case 's_families': return sFamilies_();
    case 's_family_set': return sFamilySet_(q, me);
    case 's_orders': return sOrders_();
    case 's_order_paid': return sOrderPaid_(q, me);
    case 's_order_status': return sOrderStatus_(q, me);
    case 's_quangia': return sQuangia_(q, me);
    case 't_consults': return tConsults_(me);
    case 't_consult_note': return tConsultNote_(q, me);
    case 'm_assign': return mAssign_(q.code, q.teacher);
    case 'm_audit': return mAudit_(me);
  }
  throw new Error('unknown_action');
}

function newPin_() { var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', p = ''; for (var i = 0; i < 8; i++) p += abc.charAt(Math.floor(Math.random() * abc.length)); return p; }
function activeOf_(r) { return r.active === true || r.active === 'TRUE'; }
function mStaff_(me) {
  var studs = rows_('students');
  return { ok: true, staff: rows_('staff').map(function (r) {
    return { id: r.id, name: r.name, role: r.role, roleVi: ROLE_VI[r.role] || r.role, active: activeOf_(r), created: r.created, email: r.email,
      students: studs.filter(function (s) { return String(s.teacher) === String(r.id); }).length, canEdit: !me || canManage_(me, r.role) };
  }) };
}
/* quản lý chỉ tạo, sửa tài khoản giáo viên và sale; tài khoản quản lý do Admin tạo */
function canManage_(me, role) { return me.role === 'admin' ? role !== 'admin' : (role === 'giaovien' || role === 'sale'); }
function mStaffAdd_(name, role, email, me, invite) {
  name = clip_(String(name || '').trim(), 80);
  if (!name) throw new Error('no_name');
  if (!ROLE_VI[role] || role === 'admin') throw new Error('bad_role');
  if (me && !canManage_(me, role)) throw new Error('forbidden');
  var pin = newPin_(), id;
  withLock_(function () {
    var n = rows_('staff').length + 1;
    id = (role === 'giaovien' ? 'GV' : role === 'sale' ? 'SL' : 'QL') + ('0' + n).slice(-2) + Math.floor(Math.random() * 90 + 10);
    insert_('staff', { id: id, name: name, role: role, pinHash: hash_(pin), active: true, created: now_(), email: clip_(email, 120) });
  });
  var mailed = false;
  var mailError = '';
  if (invite && isEmail_(email)) { try { sendInvite_({ name: name, role: role, email: String(email).trim() }, me); mailed = true; } catch (e) { mailError = String(e && e.message || e); } }
  return { ok: true, id: id, pin: pin, mailed: mailed, mailError: mailError, email: mailed ? String(email).trim() : '' }; // PIN chỉ hiện một lần, không gửi qua email
}
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }
/* Thư mời vào bảng quản trị: chỉ có lời mời và link; mã PIN người tạo gửi riêng (Zalo, trực tiếp), không nằm trong thư */
var STAFF_URL = 'https://ces-training.github.io/on-thi-chuyen-ngu/quan-ly/';
var ROLE_JOB = {
  quanly: 'xem tổng quan và doanh thu, giao học sinh cho giáo viên, xử lý phụ huynh đăng ký, tạo tài khoản giáo viên và sale, xem nhật ký thao tác của giáo viên và sale.',
  giaovien: 'theo dõi tiến độ, bài làm và ảnh bài giấy của các học sinh được giao cho anh/chị; sửa chấm hoặc cho máy chấm lại; nhắn tin trả lời học sinh.',
  sale: 'xử lý phụ huynh đăng ký, cấp mã học sinh, cộng lượt nhận xét chi tiết và bật gói học sau khi gia đình đã thanh toán.'
};
function sendInvite_(st, me) {
  var roleVi = ROLE_VI[st.role] || st.role;
  MailApp.sendEmail({ to: st.email, name: 'Chuyên Anh 14 Ngày', replyTo: teacherEmail_() || undefined,
    subject: 'Mời anh/chị tham gia Bảng quản trị Chuyên Anh 14 Ngày (' + roleVi + ')',
    body: [
      'Chào ' + st.name + ',', '',
      (me && me.role !== 'admin' ? me.name : 'Ban quản lý chương trình') + ' đã tạo cho anh/chị tài khoản ' + roleVi + ' trên Bảng quản trị của chương trình Chuyên Anh 14 Ngày.', '',
      'Với vai ' + roleVi + ', anh/chị sẽ ' + (ROLE_JOB[st.role] || ''), '',
      'Cách đăng nhập:',
      '1. Mở ' + STAFF_URL,
      '2. Nhập mã PIN 8 ký tự của anh/chị. Mã PIN được gửi riêng (qua Zalo hoặc trực tiếp), không nằm trong thư này. Nếu chưa nhận được, anh/chị trả lời thư này.', '',
      'Lưu ý bảo mật:',
      '- Mỗi người một mã PIN riêng, không chia sẻ cho người khác. Mọi thao tác trên trang đều được ghi lại theo tài khoản.',
      '- Nếu nghi lộ mã, báo ngay để được cấp mã mới.',
      '- Trang có thông tin của học sinh và phụ huynh: không chụp màn hình hay chép dữ liệu gửi ra ngoài.', '',
      'Nếu anh/chị không chờ thư này, xin bỏ qua.', '',
      'Chuyên Anh 14 Ngày'
    ].join('\n') });
}
function mInvite_(id, me) {
  var r = find_('staff', 'id', id);
  if (!r) throw new Error('no_staff');
  if (me && !canManage_(me, r.role)) throw new Error('forbidden');
  if (!isEmail_(r.email)) return { ok: false, error: 'no_email' };
  sendInvite_({ name: r.name, role: r.role, email: String(r.email).trim() }, me);
  return { ok: true, mailed: true, email: String(r.email).trim() };
}
function mStaffSet_(id, q, me) {
  return withLock_(function () {
    var r = find_('staff', 'id', id);
    if (!r) throw new Error('no_staff');
    if (me && (!canManage_(me, r.role) || (q.role && !canManage_(me, q.role)))) throw new Error('forbidden');
    var patch = {}, pin = null;
    if (q.active != null) patch.active = q.active === true;
    if (q.role && ROLE_VI[q.role] && q.role !== 'admin') patch.role = q.role;
    if (q.resetPin) { pin = newPin_(); patch.pinHash = hash_(pin); }
    update_('staff', r._row, patch);
    return { ok: true, pin: pin };
  });
}
function mAssign_(code, teacher) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  teacher = String(teacher || '');
  if (teacher && !find_('staff', 'id', teacher)) throw new Error('no_staff');
  withLock_(function () { update_('students', st._row, { teacher: teacher }); });
  return { ok: true };
}

/* sale: mỗi học sinh một dòng tóm tắt học tập + liên hệ phụ huynh, không có bài làm */
function sList_() {
  var reqs = rows_('requests'), staff = rows_('staff'), ords = rows_('orders'), fams = rows_('families');
  var tName = function (id) { var t = staff.filter(function (x) { return String(x.id) === String(id); })[0]; return t ? t.name : ''; };
  return { ok: true, students: rows_('students').map(function (s) {
    var sum = parse_(s.summary, {}) || {}, rq = reqs.filter(function (r) { return r.code === s.code; }).slice(-1)[0] || fams.filter(function (r) { return r.code === s.code; }).slice(-1)[0];
    return { code: s.code, name: s.name, grade: s.grade, created: s.created, lastSeen: s.lastSeen, entryLevel: s.entryLevel, finalLevel: s.finalLevel,
      daysWeb: s.daysWeb, daysPaper: s.daysPaper, studyDays: sum.sd || '', paid: String(s.paid || ''), credits: credits_(s), teacher: tName(s.teacher),
      orderPending: ords.some(function (o) { return o.code === s.code && o.status === 'chờ liên hệ'; }),
      parent: rq ? rq.parent : '', phone: rq ? String(rq.phone || '') : '', email: rq ? rq.email : '' };
  }) };
}

/* quản lý: số liệu tổng quan */
function mOverview_() {
  var studs = rows_('students'), reqs = rows_('requests'), ups = rows_('uploads'), staff = rows_('staff'), msgs = rows_('messages');
  var wk = Date.now() - 7 * 864e5, active = function (s) { return s.lastSeen && new Date(s.lastSeen).getTime() > wk; };
  var by = function (st) { return reqs.filter(function (r) { return r.status === st; }).length; };
  var issued = reqs.filter(function (r) { return r.status === ISSUED; });
  var money = function (list) { return list.reduce(function (x, r) { return x + packInfo_(r.pack).price; }, 0); };
  var teachers = staff.filter(function (x) { return x.role === 'giaovien'; }).map(function (t) {
    var mineS = studs.filter(function (s) { return String(s.teacher) === String(t.id); }), codes = mineS.map(function (s) { return s.code; });
    return { name: t.name, active: activeOf_(t), students: mineS.length, active7: mineS.filter(active).length,
      unread: msgs.filter(function (m) { return codes.indexOf(m.code) >= 0 && m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE'); }).length,
      errors: ups.filter(function (u) { return codes.indexOf(u.code) >= 0 && u.status === 'error'; }).length };
  });
  var sales = staff.filter(function (x) { return x.role === 'sale'; }).map(function (t) {
    var h = reqs.filter(function (r) { return String(r.handler) === String(t.name); }), done = h.filter(function (r) { return r.status === ISSUED; });
    return { name: t.name, active: activeOf_(t), handled: h.length, issued: done.length, revenue: money(done) };
  });
  return { ok: true,
    learn: { students: studs.length, diag: studs.filter(function (s) { return s.entryLevel; }).length, active7: studs.filter(active).length,
      half: studs.filter(function (s) { return Number(s.daysWeb) >= 7; }).length, done14: studs.filter(function (s) { return Number(s.daysWeb) >= 14; }).length,
      final: studs.filter(function (s) { return s.finalLevel; }).length, noTeacher: studs.filter(function (s) { return !s.teacher; }).length },
    sales: { requests: reqs.length, fresh: by('mới'), contacted: by('đã liên hệ'), issued: issued.length, lost: by('không mua'), revenue: money(issued),
      paidStudents: studs.filter(function (s) { return String(s.paid || '').trim(); }).length,
      creditsLeft: studs.reduce(function (x, s) { return x + credits_(s); }, 0),
      details: ups.filter(function (u) { return u.charged && u.charged !== 'gói'; }).length },
    grading: { uploads: ups.length, graded: ups.filter(function (u) { return u.status === 'graded'; }).length, errors: ups.filter(function (u) { return u.status === 'error'; }).length },
    teachers: teachers, salesTeam: sales, funnel: funnel_() };
}

function checkPin_(pin) {
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  if (!real || String(pin || '') !== String(real)) throw new Error('bad_pin');
}

/* ---------- sheet helpers ---------- */
function sheet_(k) { return SpreadsheetApp.getActive().getSheetByName(SHEETS[k].name); }
function rows_(k) {
  var sh = sheet_(k), v = sh.getDataRange().getValues(), cols = SHEETS[k].cols, outRows = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _row: i + 1 };
    cols.forEach(function (c, j) { o[c] = v[i][j]; });
    if (o[cols[0]] !== '' && o[cols[0]] != null) outRows.push(o);
  }
  return outRows;
}
function insert_(k, obj) {
  var cols = SHEETS[k].cols;
  sheet_(k).appendRow(cols.map(function (c) { return obj[c] == null ? '' : obj[c]; }));
}
function update_(k, rowIdx, patch) {
  var cols = SHEETS[k].cols, sh = sheet_(k);
  Object.keys(patch).forEach(function (c) {
    var j = cols.indexOf(c);
    if (j >= 0) sh.getRange(rowIdx, j + 1).setValue(patch[c]);
  });
}
function find_(k, field, value) {
  var r = rows_(k);
  for (var i = 0; i < r.length; i++) if (String(r[i][field]) === String(value)) return r[i];
  return null;
}
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function uid_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function now_() { return new Date().toISOString(); }
function parse_(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
function clip_(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }

/* ---------- học sinh ---------- */
function getStudent_(code) {
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,10}$/.test(code)) return null;
  return find_('students', 'code', code);
}

function login_(st) {
  var state = null;
  if (st.stateFileId) { try { state = JSON.parse(DriveApp.getFileById(st.stateFileId).getBlob().getDataAsString()); } catch (e) {} }
  update_('students', st._row, { lastSeen: now_() });
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade, paid: isPaid_(st), credits: credits_(st), family: !!famOf_(st.code) }, state: state };
}

function sync_(st, state, kpi, sum) {
  if (!state || typeof state !== 'object') throw new Error('no_state');
  var text = JSON.stringify(state);
  if (text.length > 4 * 1024 * 1024) throw new Error('state_too_big');
  var res = withLock_(function () {
    var fresh = find_('students', 'code', st.code);
    var fileId = fresh.stateFileId, file = null;
    if (fileId) { try { file = DriveApp.getFileById(fileId); } catch (e) { file = null; } }
    if (file) file.setContent(text);
    else { file = studentFolder_(st.code).createFile('tien-do_' + st.code + '.json', text, 'application/json'); fileId = file.getId(); }
    kpi = kpi || {};
    update_('students', fresh._row, {
      lastSeen: now_(), stateFileId: fileId,
      daysWeb: num_(kpi.daysWeb), daysPaper: num_(kpi.daysPaper), webAcc: num_(kpi.webAcc), retryAcc: num_(kpi.retryAcc),
      mastered: num_(kpi.mastered), eff: num_(kpi.eff), entryLevel: clip_(kpi.entryLevel, 10), finalLevel: clip_(kpi.finalLevel, 10),
      planMin: num_(kpi.planMin), planDpw: num_(kpi.planDpw),
      summary: clip_(JSON.stringify(sum || {}), 45000)
    });
    return { ok: true, savedAt: now_() };
  });
  try { refreshFamily_(st.code); } catch (e) {} // phễu bán hàng: chấm lại điểm lead, tạo việc theo mốc
  return res;
}
function num_(x) { return (x === null || x === undefined || x === '' || isNaN(x)) ? '' : Number(x); }

function studentFolder_(code) {
  var root = rootFolder_(), it = root.getFoldersByName(code);
  return it.hasNext() ? it.next() : root.createFolder(code);
}

function upload_(st, day, images) {
  day = Number(day);
  if (!(day >= 1 && day <= 14)) throw new Error('bad_day');
  if (!images || !images.length) throw new Error('no_images');
  if (images.length > MAX_IMAGES) throw new Error('too_many_images');
  var folder = studentFolder_(st.code), ids = [], stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss');
  images.forEach(function (im, i) {
    var data = String(im.data || '');
    if (data.length > MAX_IMAGE_B64) throw new Error('image_too_big');
    var mime = /^image\/(jpeg|png|webp)$/.test(im.mime) ? im.mime : 'image/jpeg';
    var blob = Utilities.newBlob(Utilities.base64Decode(data), mime, st.code + '_buoi' + day + '_' + stamp + '_' + (i + 1) + '.jpg');
    ids.push(folder.createFile(blob).getId());
  });
  var id = uid_('U');
  withLock_(function () { insert_('uploads', { id: id, ts: now_(), code: st.code, day: day, fileIds: ids.join(','), status: 'pending', tries: 0 }); });
  try { gradeUpload_(id); } catch (e) { /* processPending sẽ thử lại */ }
  var row = find_('uploads', 'id', id);
  return { ok: true, upload: uploadOut_(row) };
}

function uploadOut_(r) {
  return { id: r.id, ts: r.ts, day: Number(r.day), status: r.status, score: r.score === '' ? null : Number(r.score), total: r.total === '' ? null : Number(r.total),
    result: parse_(r.result, null), teacherNote: r.teacherNote || '', updated: r.updated || '', error: r.status === 'error' ? String(r.error || '') : '' };
}
function msgOut_(m) { return { id: m.id, ts: m.ts, from: m.from, uploadId: m.uploadId || '', itemId: m.itemId || '', text: m.text, seenTeacher: m.seenTeacher === true || m.seenTeacher === 'TRUE', seenStudent: m.seenStudent === true || m.seenStudent === 'TRUE' }; }

function my_(st) {
  var ups = rows_('uploads').filter(function (r) { return r.code === st.code; }).map(uploadOut_);
  var msgs = rows_('messages').filter(function (m) { return m.code === st.code; });
  var outMsgs = msgs.map(msgOut_);
  withLock_(function () { msgs.forEach(function (m) { if (m.from === 'teacher' && !(m.seenStudent === true || m.seenStudent === 'TRUE')) update_('messages', m._row, { seenStudent: true }); }); });
  var pending = rows_('orders').some(function (o) { return o.code === st.code && o.status === 'chờ liên hệ'; });
  return { ok: true, uploads: ups, messages: outMsgs, paid: isPaid_(st), paidName: String(st.paid || ''), orderPending: pending, credits: credits_(st), family: !!famOf_(st.code) };
}
function credits_(st) { var n = Number(st.credits); return isNaN(n) || st.credits === '' ? 0 : n; }
function isPaid_(st) { return !!String(st.paid || '').trim(); }

function message_(st, uploadId, itemId, text) {
  text = clip_(String(text || '').trim(), 1500);
  if (!text) throw new Error('empty');
  var id = uid_('M');
  withLock_(function () { insert_('messages', { id: id, ts: now_(), code: st.code, from: 'student', uploadId: uploadId || '', itemId: itemId || '', text: text, seenTeacher: false, seenStudent: true }); });
  return { ok: true, id: id };
}

/* ---------- chấm bài bằng Claude ---------- */
function processPending() {
  var stale = Date.now() - 10 * 60 * 1000;
  rows_('uploads').filter(function (r) {
    if (Number(r.tries || 0) >= 3) return false;
    if (r.status === 'pending' || r.status === 'error') return true;
    return r.status === 'grading' && r.updated && new Date(r.updated).getTime() < stale;
  })
    .slice(0, 3).forEach(function (r) { try { gradeUpload_(r.id); } catch (e) {} });
}

/* Mức học của con (Nền tảng / Chuẩn / Nâng cao): lấy từ bản tóm tắt web gửi lên, nếu không có thì suy từ trình độ đầu vào.
   Phần chỉ dành cho một mức (ví dụ H · Thử thách nâng cao) bị bỏ khỏi đáp án với học sinh mức khác. */
function trackOf_(code) {
  var st = getStudent_(code); if (!st) return 'chuan';
  var sum = parse_(st.summary, {}) || {};
  if (sum.tr) return sum.tr;
  var l = st.entryLevel;
  if (!l) return 'chuan';
  if (l === 'preA2' || l === 'A2') return 'nen';
  if (l === 'A2+' || l === 'B1') return 'chuan';
  return 'nang';
}
function keyForStudent_(key, code) {
  if (!key) return key;
  var tr = trackOf_(code);
  var k = JSON.parse(JSON.stringify(key));
  k.sections = k.sections.filter(function (s) { return !s.track || s.track === tr; });
  return k;
}

function gradeUpload_(id) {
  var row = find_('uploads', 'id', id);
  if (!row) throw new Error('no_upload');
  var key = keyForStudent_(PAPER_KEYS[String(row.day)], row.code);
  if (!key) throw new Error('no_key');
  update_('uploads', row._row, { status: 'grading', tries: Number(row.tries || 0) + 1, updated: now_() });
  try {
    var images = String(row.fileIds).split(',').filter(String).map(function (fid) {
      var b = DriveApp.getFileById(fid).getBlob();
      return { type: 'image', source: { type: 'base64', media_type: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) } };
    });
    var res = callClaude_(images, key);
    var graded = mergeResult_(key, res);
    // giữ lại những câu cô đã sửa tay khi chấm lại
    var old = parse_(row.result, null);
    if (old && old.items) {
      var tmap = {};
      old.items.forEach(function (it) { if (it.teacher) tmap[it.id] = it; });
      graded.items.forEach(function (it) { var t = tmap[it.id]; if (t) { it.correct = t.correct; it.note = t.note; it.teacher = true; } });
      // bài viết con đã xác nhận (và điểm, nhận xét) giữ nguyên khi chấm lại phần trắc nghiệm
      if (old.writing && old.writing.status === 'graded') graded.writing = old.writing;
      graded.score = graded.items.filter(function (it) { return it.correct === true; }).length;
    }
    update_('uploads', row._row, { status: 'graded', score: graded.score, total: graded.total, result: clip_(JSON.stringify(graded), 48000), updated: now_(), error: '' });

    updatePaperAvg_(row.code);
    return graded;
  } catch (e) {
    update_('uploads', row._row, { status: 'error', error: clip_(String(e && e.message || e), 500), updated: now_() });
    throw e;
  }
}

function keyText_(key) {
  var lines = ['BUỔI ' + key.day + ' — ĐÁP ÁN BÀI GIẤY (học sinh không thấy phần này)'];
  key.sections.forEach(function (s) {
    lines.push('', '## ' + s.name);
    s.items.forEach(function (it) {
      var ans = it.answer + (it.accept && it.accept.length ? ' | cũng chấp nhận: ' + it.accept.join(' / ') : '');
      if (it.options) ans = it.answer + ' (' + (it.options['ABCD'.indexOf(it.answer)] || '') + ')';
      lines.push(it.label + ' | đề: ' + it.q + ' | đáp án: ' + ans);
    });
  });
  if (key.writing) {
    lines.push('', '## F · Bài viết (chỉ chép lại, chưa chấm)', 'Đề: ' + key.writing.task);
  }
  return lines.join('\n');
}

var SYSTEM_PROMPT = [
  'Bạn là trợ giảng tiếng Anh chấm bài tập giấy của học sinh lớp 6–9 ôn thi chuyên Anh ở Hà Nội.',
  'Ảnh là bài học sinh viết tay trên tập bài in. Mỗi câu có nhãn như A.1, B.3, E.2, R1.5, G.4.',
  'Nhiệm vụ: đọc câu trả lời của học sinh cho từng nhãn trong đáp án và so với đáp án.',
  'Quy tắc chấm:',
  '- Không phân biệt chữ hoa, chữ thường, dấu câu cuối câu, khoảng trắng thừa.',
  '- Chấp nhận mọi đáp án trong danh sách "cũng chấp nhận".',
  '- Câu trắc nghiệm: chấp nhận chữ cái (A/B/C/D) hoặc chép lại đúng phương án. Đúng/Sai/Không có thông tin: chấp nhận T/F/NG hoặc True/False/Not Given.',
  '- Sai chính tả từ cần điền thì tính sai, ghi chú "sai chính tả" và viết từ đúng.',
  '- Không đọc được hoặc bỏ trống: correct = null, ghi chú "không đọc được" hoặc "bỏ trống".',
  '- Không tự ý cho đúng khi không chắc. Nếu chữ mờ, ghi đúng những gì đọc được vào "read".',
  'Ghi chú (note) bằng tiếng Việt, ngắn (tối đa 25 từ), giải thích vì sao sai và gợi ý cách nhớ; câu đúng để note rỗng.',
  'Câu sai: note phải nói vì sao đáp án đúng là đúng (nghĩa, cấu trúc hoặc dấu hiệu trong câu) và vì sao câu học sinh viết chưa đúng.',
  'Bài viết (phần F hoặc đoạn viết dài): KHÔNG chấm. Chỉ chép lại NGUYÊN VĂN những gì học sinh viết, giữ đúng cả lỗi chính tả, ngữ pháp, dấu câu và xuống dòng; không sửa, không thêm, không bỏ chữ nào. Từ nào không đọc được thì ghi [?] tại chỗ đó và liệt kê vào "unclear".',
  'Chỉ trả về MỘT đối tượng JSON hợp lệ, không thêm chữ nào khác (trong chuỗi, trích dẫn bằng dấu nháy đơn, không dùng dấu ngoặc kép), theo mẫu:',
  '{"items":[{"label":"A.1","read":"...","correct":true,"note":""}],"writing":{"read":"nguyên văn bài viết","unclear":["từ hoặc đoạn không đọc chắc"]},"overall":"2–3 câu nhận xét chung về phần trắc nghiệm, điền từ, bằng tiếng Việt","unreadable":false}',
  'Nếu buổi không có bài viết hoặc học sinh không viết, đặt "writing": null.',
  'Nếu ảnh không phải bài làm, đặt "unreadable": true và "items": [].'
].join('\n');

function callClaude_(images, key) {
  var p = PropertiesService.getScriptProperties();
  return claudeJson_(p.getProperty('MODEL') || DEFAULT_MODEL, SYSTEM_PROMPT,
    images.concat([{ type: 'text', text: keyText_(key) + '\n\nHãy chấm các ảnh bài làm ở trên theo đáp án này và trả về JSON.' }]), 8000);
}

/* gọi Claude, trả về đối tượng JSON. Có schema thì yêu cầu mô hình trả qua công cụ (tool use) để kết quả là JSON hợp lệ.
   Một số mô hình (ví dụ khi bật suy nghĩ mở rộng) không nhận tool_choice bắt buộc: khi đó gửi lại với tool_choice auto,
   và nếu mô hình vẫn trả chữ thì đọc JSON trong chữ như cũ. */
function claudeJson_(model, system, content, maxTokens, schema) {
  var apiKey = String(PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || '').trim();
  if (!apiKey) throw new Error('Chưa cài CLAUDE_API_KEY');
  var send = function (choice) {
    var body = { model: model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: content }] };
    if (schema) { body.tools = [{ name: 'tra_ket_qua', description: 'Trả kết quả chấm bài', input_schema: schema }]; body.tool_choice = choice; }
    var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, payload: JSON.stringify(body)
    });
    return { code: resp.getResponseCode(), text: resp.getContentText() };
  };
  var r = send(schema ? { type: 'tool', name: 'tra_ket_qua' } : null);
  if (schema && r.code === 400 && /tool_choice/.test(r.text)) {
    content = content.concat([{ type: 'text', text: 'Trả kết quả bằng cách gọi công cụ tra_ket_qua.' }]);
    r = send({ type: 'auto' });
  }
  if (r.code !== 200) throw new Error('Claude API ' + r.code + ': ' + clip_(r.text, 300));
  var data = JSON.parse(r.text);
  var tu = (data.content || []).filter(function (c) { return c.type === 'tool_use'; })[0];
  if (tu && tu.input) return tu.input;
  var out = (data.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  var i = out.indexOf('{'), j = out.lastIndexOf('}');
  if (i < 0 || j < i) throw new Error(schema ? 'Claude không trả kết quả theo khuôn' : 'Không đọc được JSON từ Claude');
  return JSON.parse(out.slice(i, j + 1));
}

/* đối chiếu kết quả của mô hình với đáp án; tính điểm ở máy chủ, không tin điểm do mô hình tự cộng */
function mergeResult_(key, res) {
  var byLabel = {};
  (res.items || []).forEach(function (x) { if (x && x.label) byLabel[String(x.label).replace(/\s+/g, '').toUpperCase()] = x; });
  var items = [], score = 0, total = 0;
  key.sections.forEach(function (s) {
    s.items.forEach(function (it) {
      var r = byLabel[it.label.toUpperCase()] || {};
      var correct = r.correct === true ? true : (r.correct === false ? false : null);
      total++; if (correct === true) score++;
      items.push({ label: it.label, id: it.id, section: s.name, q: it.q, answer: it.options ? it.answer + '. ' + (it.options['ABCD'.indexOf(it.answer)] || '') : it.answer,
        read: clip_(r.read, 300), correct: correct, note: clip_(r.note, 300) });
    });
  });
  var wr = res.writing && typeof res.writing === 'object' ? clip_(String(res.writing.read || '').trim(), 4000) : '';
  // bài viết: máy chỉ chép lại; con xác nhận hoặc sửa bản chép rồi mới chấm (confirmWriting_)
  var w = key.writing && wr ? {
    status: 'confirm', aiRead: wr, text: wr, words: wordCount_(wr),
    unclear: (res.writing.unclear || []).slice(0, 12).map(function (x) { return clip_(x, 80); }), score: null
  } : null;
  return { items: items, writing: w, overall: clip_(res.overall, 800), unreadable: res.unreadable === true, score: score, total: total, gradedAt: now_() };
}

function updatePaperAvg_(code) {
  var ups = rows_('uploads').filter(function (r) { return r.code === code && r.status === 'graded' && Number(r.total) > 0; });
  var latest = {};
  ups.forEach(function (r) { latest[r.day] = r; });
  var ks = Object.keys(latest);
  if (!ks.length) return;
  var avg = ks.reduce(function (s, k) { return s + Number(latest[k].score) / Number(latest[k].total); }, 0) / ks.length;
  var st = find_('students', 'code', code);
  if (st) update_('students', st._row, { paperAvg: Math.round(avg * 1000) / 1000 });
}


function wordCount_(t) { var m = String(t || '').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g); return m ? m.length : 0; }

/* độ giống nhau giữa bản máy chép và bản con xác nhận (theo từ), để cô biết con có viết thêm khi sửa không */
function similarity_(a, b) {
  var wa = String(a || '').toLowerCase().match(/[a-z0-9']+/g) || [], wb = String(b || '').toLowerCase().match(/[a-z0-9']+/g) || [];
  if (!wa.length && !wb.length) return 1;
  var bag = {}; wa.forEach(function (w) { bag[w] = (bag[w] || 0) + 1; });
  var same = 0; wb.forEach(function (w) { if (bag[w]) { bag[w]--; same++; } });
  return Math.round(100 * same / Math.max(wa.length, wb.length)) / 100;
}

function ownUpload_(st, uploadId) {
  var row = find_('uploads', 'id', uploadId);
  if (!row || row.code !== st.code) throw new Error('no_upload');
  var res = parse_(row.result, null);
  if (!res || !res.writing) throw new Error('no_writing');
  return { row: row, res: res };
}

/* bước 2: con xác nhận bài viết (đã sửa chỗ máy đọc nhầm) → chấm bản thường */
function confirmWriting_(st, uploadId, text) {
  var u = ownUpload_(st, uploadId), res = u.res, w = res.writing;
  if (w.status === 'graded' && w.text === String(text || '').trim()) return { ok: true, writing: w };
  text = clip_(String(text || '').trim(), 4000);
  if (wordCount_(text) < 5) throw new Error('writing_too_short');
  var key = keyForStudent_(PAPER_KEYS[String(u.row.day)], st.code);
  var g = gradeWritingFree_(key.writing, text);
  w.text = text; w.words = wordCount_(text); w.sim = similarity_(w.aiRead, text); w.confirmedAt = now_();
  w.status = 'graded'; w.score = g.score; w.strengths = g.strengths; w.improve = g.improve; w.summary = g.summary;
  delete w.detail; // bài đã đổi thì nhận xét chi tiết cũ không còn đúng
  withLock_(function () {
    var row = find_('uploads', 'id', uploadId);
    update_('uploads', row._row, { result: clip_(JSON.stringify(res), 48000), updated: now_() });
  });
  return { ok: true, writing: w };
}

var FREE_PROMPT = [
  'Bạn là trợ giảng tiếng Anh, chấm nhanh đoạn viết của học sinh lớp 6–9 ôn thi chuyên Anh.',
  'Chấm thang 10 theo bốn ý: đủ ý của đề; đúng ngữ pháp trọng tâm của buổi; dùng từ mới của buổi; đủ số từ tối thiểu.',
  'Nêu đúng 2 điểm tốt và 2 điểm cần sửa, mỗi điểm một câu tiếng Việt cụ thể (trích từ bài khi có thể), giọng như một người bạn lớn tuổi: tôn trọng, khích lệ, không chê bai.',
  'Trả kết quả qua công cụ tra_ket_qua: score (0–10), strengths (2 ý), improve (2 ý), summary (1 câu nhận xét chung).'
].join('\n');

var STR = { type: 'string' }, STRS = { type: 'array', items: { type: 'string' } };
var FREE_SCHEMA = { type: 'object', required: ['score', 'strengths', 'improve', 'summary'],
  properties: { score: { type: 'number' }, strengths: STRS, improve: STRS, summary: STR } };
var DETAIL_SCHEMA = { type: 'object', required: ['criteria', 'errors', 'upgrades', 'next', 'summary'], properties: {
  criteria: { type: 'array', items: { type: 'object', required: ['key', 'score', 'comment', 'evidence'], properties: { key: { type: 'string', enum: ['content', 'organisation', 'vocabulary', 'grammar'] }, score: { type: 'number' }, comment: STR, evidence: STRS } } },
  errors: { type: 'array', items: { type: 'object', required: ['quote', 'fix', 'why', 'type'], properties: { quote: STR, fix: STR, why: STR, type: STR } } },
  upgrades: { type: 'array', items: { type: 'object', required: ['from', 'to', 'why'], properties: { from: STR, to: STR, why: STR } } },
  next: STRS, summary: STR } };

function gradeWritingFree_(task, text) {
  var p = PropertiesService.getScriptProperties();
  var prompt = 'ĐỀ: ' + task.task + '\nTối thiểu ' + task.min_words + ' từ.\nTiêu chí của buổi: ' + (task.checklist || []).join(' / ') +
    '\n\nBÀI CỦA HỌC SINH (' + wordCount_(text) + ' từ):\n' + text;
  var r = claudeJson_(p.getProperty('MODEL_FREE') || DEFAULT_MODEL_FREE, FREE_PROMPT, [{ type: 'text', text: prompt }], 1200, FREE_SCHEMA);
  return {
    score: Math.max(0, Math.min(10, Math.round(2 * (Number(r.score) || 0)) / 2)),
    strengths: (r.strengths || []).slice(0, 3).map(function (x) { return clip_(x, 300); }),
    improve: (r.improve || []).slice(0, 3).map(function (x) { return clip_(x, 300); }),
    summary: clip_(r.summary, 400)
  };
}

/* bản trả phí: nhận xét theo tiêu chí bài viết đề chuyên */
var RUBRIC = [
  { key: 'content', name: 'Nội dung và yêu cầu đề', max: 3, desc: 'trả lời đúng và đủ các ý đề hỏi, ý có phát triển (lý do, ví dụ), đúng dạng bài, đủ độ dài' },
  { key: 'organisation', name: 'Bố cục và liên kết', max: 2, desc: 'câu chủ đề hoặc mở bài rõ, các ý sắp xếp hợp lý, từ nối đa dạng và dùng đúng, có câu kết' },
  { key: 'vocabulary', name: 'Từ vựng', max: 2.5, desc: 'từ đa dạng, đúng nghĩa, đúng kết hợp từ (collocation), dùng từ và cụm động từ của chủ đề; chính tả' },
  { key: 'grammar', name: 'Ngữ pháp', max: 2.5, desc: 'đa dạng cấu trúc (câu ghép, câu phức, mệnh đề quan hệ, câu điều kiện…), độ chính xác của thì, mạo từ, hòa hợp chủ vị; dấu câu' }
];
var DETAIL_PROMPT = [
  'Bạn là giáo viên chấm bài viết tiếng Anh cho học sinh lớp 6–9 ôn thi vào lớp 10 chuyên Anh ở Việt Nam.',
  'Chấm theo 4 tiêu chí của thang 10 điểm mô phỏng cách chấm bài viết trong đề chuyên Anh (đây là thang CES đề xuất, không phải hướng dẫn chấm chính thức của Sở):',
  RUBRIC.map(function (c) { return '- ' + c.name + ' (tối đa ' + c.max + ' điểm): ' + c.desc + '.'; }).join('\n'),
  'Chấm đúng chuẩn đề chuyên nhưng xét theo độ dài và mức của đề buổi này. Điểm mỗi tiêu chí làm tròn 0,25.',
  'Với mỗi tiêu chí: nhận xét 2–3 câu tiếng Việt, kèm trích dẫn nguyên văn từ bài làm làm bằng chứng.',
  'Liệt kê tối đa 8 lỗi cụ thể: trích nguyên văn, bản sửa, giải thích ngắn bằng tiếng Việt, loại lỗi (ngữ pháp, từ vựng, chính tả, dấu câu, liên kết).',
  'Viết lại tối đa 3 câu của học sinh thành câu hay hơn ở mức đề chuyên (giữ ý của học sinh), giải thích vì sao hay hơn.',
  'Nêu 3 việc nên làm ở bài viết tiếp theo. Giọng tôn trọng, khích lệ, như người bạn lớn tuổi; không chê bai.',
  'Trả kết quả qua công cụ tra_ket_qua: criteria (đủ 4 tiêu chí content, organisation, vocabulary, grammar), errors, upgrades, next (3 ý), summary (2 câu tổng kết).'
].join('\n');

function writingDetail_(st, uploadId) {
  var u = ownUpload_(st, uploadId), res = u.res, w = res.writing;
  if (w.status !== 'graded') throw new Error('writing_not_confirmed');
  if (w.detail) return { ok: true, writing: w, credits: credits_(st) };
  if (!isPaid_(st) && credits_(st) <= 0) return { ok: false, error: 'no_credit' };
  var key = keyForStudent_(PAPER_KEYS[String(u.row.day)], st.code);
  var p = PropertiesService.getScriptProperties();
  var prompt = 'ĐỀ: ' + key.writing.task + '\nTối thiểu ' + key.writing.min_words + ' từ.\nTrọng tâm của buổi: ' + (key.writing.checklist || []).join(' / ') +
    '\n\nBÀI CỦA HỌC SINH (' + wordCount_(w.text) + ' từ):\n' + w.text;
  var r = claudeJson_(p.getProperty('MODEL') || DEFAULT_MODEL, DETAIL_PROMPT, [{ type: 'text', text: prompt }], 5000, DETAIL_SCHEMA);
  var byKey = {}; (r.criteria || []).forEach(function (c) { if (c && c.key) byKey[c.key] = c; });
  var crit = RUBRIC.map(function (c) {
    var x = byKey[c.key] || {};
    return { key: c.key, name: c.name, max: c.max, score: Math.max(0, Math.min(c.max, Math.round(4 * (Number(x.score) || 0)) / 4)),
      comment: clip_(x.comment, 600), evidence: (x.evidence || []).slice(0, 3).map(function (e) { return clip_(e, 200); }) };
  });
  w.detail = {
    criteria: crit, total: crit.reduce(function (s, c) { return s + c.score; }, 0),
    errors: (r.errors || []).slice(0, 8).map(function (e) { return { quote: clip_(e.quote, 200), fix: clip_(e.fix, 200), why: clip_(e.why, 300), type: clip_(e.type, 40) }; }),
    upgrades: (r.upgrades || []).slice(0, 3).map(function (e) { return { from: clip_(e.from, 300), to: clip_(e.to, 300), why: clip_(e.why, 300) }; }),
    next: (r.next || []).slice(0, 3).map(function (x) { return clip_(x, 300); }),
    summary: clip_(r.summary, 600), at: now_()
  };
  var left = credits_(st);
  withLock_(function () {
    var row = find_('uploads', 'id', uploadId);
    update_('uploads', row._row, { result: clip_(JSON.stringify(res), 48000), updated: now_(), charged: isPaid_(st) ? 'gói học' : now_() });
    if (!isPaid_(st)) { var fresh = find_('students', 'code', st.code); left = Math.max(0, credits_(fresh) - 1); update_('students', fresh._row, { credits: left }); }
  });
  return { ok: true, writing: w, credits: left };
}

/* con bấm "Mình muốn mua bản trả phí" → ghi yêu cầu + nhắn cô */
function buyRequest_(st, product, uploadId) {
  product = clip_(String(product || 'writing_detail'), 40);
  return withLock_(function () {
    var open = rows_('orders').some(function (o) { return o.code === st.code && o.status === 'chờ liên hệ'; });
    if (!open) {
      insert_('orders', { id: uid_('O'), ts: now_(), code: st.code, name: st.name, product: product, status: 'chờ liên hệ', note: uploadId ? 'từ bài giấy ' + uploadId : '' });
      insert_('messages', { id: uid_('M'), ts: now_(), code: st.code, from: 'student', uploadId: '', itemId: '',
        text: 'Con muốn mua bản trả phí để xem nhận xét chi tiết bài viết theo tiêu chí đề chuyên. Cô liên hệ bố mẹ con giúp con ạ.', seenTeacher: false, seenStudent: true });
    }
    return { ok: true, orderPending: true };
  });
}


/* ---------- form của bố mẹ: xin mã, mua lượt chấm, hoặc nhờ cô chấm tay ---------- */
function request_(q) {
  if (q.website) return { ok: true }; // ô bẫy chống máy gửi rác
  var c = CacheService.getScriptCache(), n = Number(c.get('req_count') || 0);
  if (n > 40) throw new Error('busy'); // tối đa khoảng 40 yêu cầu mỗi giờ
  c.put('req_count', String(n + 1), 3600);
  var parent = clip_(String(q.parent || '').trim(), 80), phone = clip_(String(q.phone || '').replace(/[^0-9+ ]/g, '').trim(), 20),
      email = clip_(String(q.email || '').trim(), 120), child = clip_(String(q.child || '').trim(), 80);
  if (!parent || !child) throw new Error('missing_name');
  if (!/^[0-9+ ]{9,15}$/.test(phone) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('missing_contact');
  if (q.consent !== true) throw new Error('need_consent');
  var pack = /^le:\d{1,3}$/.test(String(q.pack)) ? String(q.pack) : 'thu14', id = uid_('R');
  var known = getStudent_(q.code);
  var row = { id: id, ts: now_(), parent: parent, phone: phone, email: email, child: child, grade: Number(q.grade) || '', region: clip_(q.region, 60),
    school: clip_(q.school, 120), want: 'chi_tiet', pack: pack, note: clip_(q.note, 1000), fileIds: '', consent: now_(), status: 'mới', code: known ? known.code : '' };
  withLock_(function () { insert_('requests', row); });
  try { mailTeacher_(row); } catch (e) { /* email lỗi thì yêu cầu vẫn nằm trong sheet và trang của cô */ }
  return { ok: true, id: id };
}

function teacherEmail_() {
  var e = PropertiesService.getScriptProperties().getProperty('TEACHER_EMAIL');
  return e || Session.getEffectiveUser().getEmail();
}
function mailTeacher_(r) {
  var to = teacherEmail_(); if (!to) return;
  var what = 'Mua lượt nhận xét chi tiết bài viết · ' + packInfo_(r.pack).label;
  var body = [
    'Phụ huynh vừa điền form trên web Chuyên Anh 14 Ngày.', '',
    'Yêu cầu: ' + what,
    'Phụ huynh: ' + r.parent + ' · ĐT/Zalo: ' + (r.phone || '—') + ' · Email: ' + (r.email || '—'),
    'Học sinh: ' + r.child + ' · lớp ' + (r.grade || '—') + ' · ' + (r.region || '') + (r.school ? ' · nhắm ' + r.school : ''),
    r.code ? 'Con đã có mã: ' + r.code + ' (cấp lượt sẽ cộng vào mã này)' : 'Con chưa có mã (cấp lượt sẽ tạo mã mới)',
    r.note ? 'Lời nhắn: ' + r.note : '',
    '',
    'Cô thu ' + packInfo_(r.pack).price.toLocaleString('vi-VN') + 'đ, rồi vào trang của cô → Phụ huynh đăng ký → "Đã thu tiền · cấp lượt" (cộng ' + packInfo_(r.pack).n + ' lượt chấm chi tiết và gửi email mã cho phụ huynh nếu có email).',
    '', 'Trang của cô: https://ces-training.github.io/on-thi-chuyen-ngu/co/'
  ].filter(function (x) { return x !== ''; }).join('\n');
  MailApp.sendEmail({ to: to, subject: '[Chuyên Anh 14 Ngày] ' + what + ' · ' + r.child, body: body, replyTo: r.email || undefined });
}

function tRequests_() {
  var list = rows_('requests').map(function (r) {
    return { id: r.id, ts: r.ts, parent: r.parent, phone: String(r.phone || ''), email: r.email, child: r.child, grade: r.grade, region: r.region, school: r.school,
      want: r.want, pack: r.pack, packLabel: packInfo_(r.pack).label, packN: packInfo_(r.pack).n, note: r.note, fileIds: String(r.fileIds || '').split(',').filter(String), status: r.status, code: r.code, teacherNote: r.teacherNote };
  }).reverse();
  return { ok: true, requests: list, packs: PACKS };
}
/* cô đã thu tiền → cấp mã kèm số lượt chấm; gửi mã qua email cho phụ huynh nếu có */
function tReqIssue_(id, credits, sendEmail, me) {
  var r = find_('requests', 'id', id);
  if (!r) throw new Error('no_request');
  var n = Math.max(0, Number(credits) || packInfo_(r.pack).n);
  var code = r.code;
  if (code && getStudent_(code)) tCredits_(code, n);
  else { code = tAdd_(r.child, r.grade, n).code; }
  withLock_(function () { var x = find_('requests', 'id', id); update_('requests', x._row, { status: 'đã cấp lượt', code: code, handler: me ? me.name : '' }); });
  var mailed = false;
  if (sendEmail && r.email) {
    MailApp.sendEmail({ to: r.email, replyTo: teacherEmail_(),
      subject: 'Mã học sinh của ' + r.child + ' · Chuyên Anh 14 Ngày',
      body: 'Chào phụ huynh của ' + r.child + ',\n\nMã học sinh của con: ' + code + '. CES đã cộng ' + n + ' lượt nhận xét chi tiết bài viết theo tiêu chí đề chuyên.\n' +
        'Con mở https://ces-training.github.io/on-thi-chuyen-ngu/chuyen-anh-14-ngay/ , ở Trang chủ nhập mã vào ô "Nhập mã học sinh cô gửi". ' +
        'Con chụp bài giấy ở bước 7 của mỗi buổi; máy chấm miễn phí phần trắc nghiệm và đoạn viết. Khi muốn xem nhận xét chi tiết một bài viết, con bấm "Xem nhận xét chi tiết", mỗi bài dùng 1 lượt.\n\nCES – Học viện Đa ngữ Anh–Trung' });
    mailed = true;
  }
  return { ok: true, code: code, credits: n, mailed: mailed };
}
function tReqStatus_(id, status, note, me) {
  return withLock_(function () {
    var r = find_('requests', 'id', id);
    if (!r) throw new Error('no_request');
    var patch = { status: clip_(status, 40) };
    if (me) patch.handler = me.name;
    if (note != null) patch.teacherNote = clip_(note, 1500);
    update_('requests', r._row, patch);
    return { ok: true };
  });
}
function tCredits_(code, add) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  return withLock_(function () {
    var fresh = find_('students', 'code', st.code), n = Math.max(0, credits_(fresh) + (Number(add) || 0));
    update_('students', fresh._row, { credits: n });
    return { ok: true, credits: n };
  });
}

/* ---------- dành cho cô ---------- */
function tList_(me) {
  var ups = rows_('uploads'), msgs = rows_('messages'), ords = rows_('orders'), staff = rows_('staff');
  var tName = function (id) { var t = staff.filter(function (x) { return String(x.id) === String(id); })[0]; return t ? t.name : ''; };
  var studs = rows_('students').filter(function (s) { return !me || me.role !== 'giaovien' || String(s.teacher) === me.id; });
  var list = studs.map(function (s) {
    var mine = ups.filter(function (u) { return u.code === s.code; });
    var unread = msgs.filter(function (m) { return m.code === s.code && m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE'); }).length;
    return { code: s.code, name: s.name, grade: s.grade, created: s.created, lastSeen: s.lastSeen, daysWeb: s.daysWeb, daysPaper: s.daysPaper, webAcc: s.webAcc, retryAcc: s.retryAcc,
      mastered: s.mastered, eff: s.eff, entryLevel: s.entryLevel, finalLevel: s.finalLevel, planMin: s.planMin, planDpw: s.planDpw, paperAvg: s.paperAvg,
      uploads: mine.length, errors: mine.filter(function (u) { return u.status === 'error'; }).length, unread: unread,
      paid: String(s.paid || ''), credits: credits_(s), orderPending: ords.some(function (o) { return o.code === s.code && o.status === 'chờ liên hệ'; }),
      waitConfirm: mine.filter(function (u) { var r = parse_(u.result, null); return r && r.writing && r.writing.status === 'confirm'; }).length,
      teacher: String(s.teacher || ''), teacherName: tName(s.teacher) };
  });
  return { ok: true, students: list, teachers: staff.filter(function (x) { return x.role === 'giaovien' && (x.active === true || x.active === 'TRUE'); }).map(function (x) { return { id: x.id, name: x.name }; }) };
}

function tStudent_(code, me) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  var ups = rows_('uploads').filter(function (r) { return r.code === st.code; }).map(function (r) { var o = uploadOut_(r); o.fileIds = String(r.fileIds).split(',').filter(String); return o; });
  var msgs = rows_('messages').filter(function (m) { return m.code === st.code; });
  var outMsgs = msgs.map(function (m) { var o = msgOut_(m); o.staff = m.staff || ''; return o; });
  withLock_(function () { msgs.forEach(function (m) { if (m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE')) update_('messages', m._row, { seenTeacher: true }); }); });
  var ords = rows_('orders').filter(function (o) { return o.code === st.code; }).map(function (o) { return { id: o.id, ts: o.ts, product: o.product, status: o.status }; });
  if (me && me.role === 'giaovien') ords = []; // giáo viên không xem yêu cầu mua
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade, created: st.created, lastSeen: st.lastSeen, paperAvg: st.paperAvg, paid: String(st.paid || ''), credits: credits_(st) }, summary: parse_(st.summary, null), uploads: ups, messages: outMsgs, orders: ords };
}

function tAdd_(name, grade, credits, teacher) {
  name = clip_(String(name || '').trim(), 80);
  if (!name) throw new Error('no_name');
  return withLock_(function () {
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code;
    do { code = ''; for (var i = 0; i < 6; i++) code += abc.charAt(Math.floor(Math.random() * abc.length)); } while (find_('students', 'code', code));
    insert_('students', { code: code, name: name, grade: Number(grade) || '', created: now_(), credits: Math.max(0, Number(credits) || 0), teacher: teacher || '' });
    return { ok: true, code: code };
  });
}

function tReply_(code, uploadId, itemId, text, me) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  text = clip_(String(text || '').trim(), 2000);
  if (!text) throw new Error('empty');
  var id = uid_('M');
  withLock_(function () { insert_('messages', { id: id, ts: now_(), code: st.code, from: 'teacher', uploadId: uploadId || '', itemId: itemId || '', text: text, seenTeacher: true, seenStudent: false, staff: me ? me.name + ' (' + me.id + ')' : '' }); });
  return { ok: true, id: id };
}

function tOverride_(q) {
  return withLock_(function () {
    var row = find_('uploads', 'id', q.uploadId);
    if (!row) throw new Error('no_upload');
    var res = parse_(row.result, null);
    if (!res) throw new Error('not_graded');
    if (q.itemId) {
      res.items.forEach(function (it) { if (it.id === q.itemId || it.label === q.itemId) { it.correct = q.correct === true ? true : q.correct === false ? false : null; it.teacher = true; if (q.note != null) it.note = clip_(q.note, 300); } });
    }
    if (q.writingScore != null && res.writing) { res.writing.score = Math.max(0, Math.min(10, Number(q.writingScore) || 0)); res.writing.teacher = true; }
    res.score = res.items.filter(function (it) { return it.correct === true; }).length;
    update_('uploads', row._row, { result: clip_(JSON.stringify(res), 48000), score: res.score, teacherNote: q.teacherNote != null ? clip_(q.teacherNote, 1500) : row.teacherNote, updated: now_() });
    updatePaperAvg_(row.code);
    return { ok: true, score: res.score, total: res.total };
  });
}

/* cô bật/tắt bản trả phí cho một con (khi gia đình đã thanh toán) */
function tPaid_(code, paid) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  paid = clip_(String(paid || '').trim(), 40);
  return withLock_(function () {
    update_('students', st._row, { paid: paid });
    if (paid) rows_('orders').forEach(function (o) { if (o.code === st.code && o.status === 'chờ liên hệ') update_('orders', o._row, { status: 'đã kích hoạt' }); });
    return { ok: true, paid: paid };
  });
}
function tOrder_(id, status) {
  return withLock_(function () {
    var o = find_('orders', 'id', id);
    if (!o) throw new Error('no_order');
    update_('orders', o._row, { status: clip_(status, 40) });
    return { ok: true };
  });
}

function tRegrade_(uploadId) { var g = gradeUpload_(uploadId); return { ok: true, score: g.score, total: g.total }; }

function tImage_(fileId, me) {
  var has = function (r) { return String(r.fileIds || '').split(',').indexOf(String(fileId)) >= 0; };
  var up = rows_('uploads').filter(has)[0];
  var ok = up ? mine_(me || { role: 'quanly' }, up.code) : (!me || me.role !== 'giaovien') && rows_('requests').some(has);
  if (!ok) throw new Error('not_found');
  var b = DriveApp.getFileById(fileId).getBlob();
  return { ok: true, mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
}

/* =====================================================================
   PHỄU BÁN HÀNG (phương án "hai làn theo điểm lead", chốt 23/10/2026)
   - Cổng sau bài đầu vào: bố mẹ để lại Zalo → tự cấp mã học sinh, tạo gia đình (lead) và việc "gọi chào trong 1 giờ" cho sale.
   - Điểm lead 0–100 = Phù hợp 30 + Học thử 40 + Ý định 30; từ 60 là nóng (làn tư vấn với cô), 35–59 ấm, dưới 35 nguội.
   - Hàng việc của sale: gọi chào, tin buổi 3, buổi 7, sau bài đầu ra, mời tư vấn, gửi đề xuất 24 giờ, nhắc ngày 3/7, đơn gói, nâng gói, giới thiệu.
   - Đơn Gói Web theo giai đoạn: bố mẹ gửi form, sale nhắn Zalo thu chuyển khoản rồi bấm "Đã thu tiền · kích hoạt" (chưa có SePay).
   Bố mẹ và con không bao giờ thấy điểm lead.
   ===================================================================== */
var FAM_ST = ['Lead mới', 'Đã gọi chào', 'Đang học thử', 'PQL', 'Đã hẹn tư vấn', 'Đã tư vấn', 'Chờ thanh toán', 'Khách Gói Web', 'Khách Quản gia', 'Nuôi dưỡng', 'Mất'];
var LOST_WHY = ['giá', 'thời gian', 'đã chọn nơi khác', 'con chưa muốn', 'khác'];
var WEB_PACKS = {
  gd1: { name: 'Gói Web · GĐ1 Nền tảng (đến B1)', price: 790000 },
  gd2: { name: 'Gói Web · GĐ2 Bắc cầu B1→B2', price: 1190000 },
  gd3: { name: 'Gói Web · GĐ3 Chuyên sâu B2→đích', price: 1590000 },
  gd4: { name: 'Gói Web · GĐ4 Luyện đề', price: 2190000 }
};
var QG_PER_TEACHER = 15;
var TZ = 'Asia/Ho_Chi_Minh';
var TASK_VI = { chao: 'Gọi chào trong 1 giờ', b3: 'Tin cho bố mẹ: xong buổi 3', b7: 'Báo cáo giữa kỳ (buổi 7) + mời nói chuyện với cô', dauRa: 'Tin sau bài đầu ra',
  moiTuVan: 'Mời tư vấn (gia đình nóng)', tuvan: 'Bố mẹ muốn nói chuyện với cô: đặt lịch', deXuat: 'Gửi đề xuất trong 24 giờ', nhac3: 'Nhắc đề xuất (ngày 3)', nhac7: 'Nhắc đề xuất (ngày 7)',
  donGoi: 'Đơn gói học: nhắn Zalo thu tiền', nhacNhip: 'Con học thưa: gợi ý người nhắc nhịp', nangGoi: 'Tín hiệu nâng gói', gioiThieu: 'Mời giới thiệu', thuongGT: 'Trao thưởng giới thiệu', tuvanTrung: 'Lead trùng số điện thoại: kiểm tra' };

SHEETS.families = { name: 'Gia đình', cols: ['id', 'ts', 'code', 'parent', 'phone', 'email', 'child', 'grade', 'region', 'school', 'goal', 'source', 'ref', 'consent', 'status', 'score', 'lane', 'handler', 'teacher', 'contactAt', 'consultAt', 'consultNote', 'proposal', 'saleNote', 'reason', 'brief', 'intent', 'flags', 'updated', 'replied'] };
SHEETS.tasks = { name: 'Việc của sale', cols: ['id', 'ts', 'famId', 'code', 'kind', 'due', 'status', 'text', 'note', 'doneBy', 'doneAt'] };
SHEETS.pkgOrders = { name: 'Đơn gói học', cols: ['id', 'ts', 'famId', 'code', 'parent', 'phone', 'email', 'child', 'grade', 'pack', 'price', 'pay', 'status', 'paidAmt', 'handler', 'note', 'paidAt'] };

function phone_(p) { return clip_(String(p || '').replace(/[^0-9+]/g, ''), 15); }
function okPhone_(p) { return /^\+?[0-9]{9,13}$/.test(p); }
function famOf_(code) { if (!code) return null; var f = rows_('families').filter(function (r) { return r.code === code; }); return f.length ? f[f.length - 1] : null; }
function json_(s) { return parse_(s, {}) || {}; }
function rate_(key, max, secs) {
  var c = CacheService.getScriptCache(), n = Number(c.get(key) || 0);
  if (n >= max) throw new Error('busy');
  c.put(key, String(n + 1), secs);
}
/* hạn gọi: trong ca 8:00–21:00 thì +giờ; ngoài ca thì 9:00 sáng hôm sau (lead đến sau 21:00 được gọi trước 9:00) */
function dueIn_(hours, from) {
  var d = from ? new Date(from) : new Date(), h = Number(Utilities.formatDate(d, TZ, 'H'));
  if (h >= 8 && h < 21) return new Date(d.getTime() + hours * 36e5).toISOString();
  var day = h >= 21 ? new Date(d.getTime() + 864e5) : d;
  return new Date(Utilities.formatDate(day, TZ, "yyyy-MM-dd'T'09:00:00'+07:00'")).toISOString();
}
function addTask_(fam, kind, text, hours) {
  insert_('tasks', { id: uid_('V'), ts: now_(), famId: fam ? fam.id : '', code: fam ? fam.code : '', kind: kind, due: dueIn_(hours == null ? 24 : hours), status: 'mở', text: clip_(text || '', 3000) });
}
function hasTask_(famId, kind) { return rows_('tasks').some(function (t) { return t.famId === famId && t.kind === kind; }); }
function famPatch_(id, patch) { var f = find_('families', 'id', id); if (!f) throw new Error('no_family'); patch.updated = now_(); update_('families', f._row, patch); return f; }
function source_(q) { var s = q.src || {}; return clip_([s.src, s.med, s.camp].filter(function (x) { return !!x; }).join(' / ') || 'trực tiếp', 120); }
function firstName_(n) { n = String(n || '').trim().split(/\s+/); return n[n.length - 1] || ''; }

/* ---------- tin Zalo soạn sẵn cho sale (sale đọc lại, sửa rồi gửi từ Zalo của trung tâm) ---------- */
function zText_(kind, f, st, extra) {
  var con = String(f.child || '').trim() || 'con', pp = String(f.parent || '').trim();
  var ph = /^(anh|chị|cô|chú|bác|bố|mẹ)\s/i.test(pp) ? pp : pp ? 'anh/chị ' + firstName_(pp) : 'anh/chị';
  var hi = 'Dạ em chào ' + ph + ', em là [tên] ở CES (Học viện Đa ngữ Anh–Trung). ';
  var web = 'https://ces-training.github.io/on-thi-chuyen-ngu/chuyen-anh-14-ngay/';
  var sum = st ? json_(st.summary) : {}, lv = st && st.entryLevel ? lvVi_(st.entryLevel) : '';
  switch (kind) {
    case 'chao': return hi + 'Bạn ' + con + ' vừa làm xong bài đầu vào Chuyên Anh 14 Ngày' + (lv ? ', trình độ hiện tại khoảng ' + lv : '') + '. Em gửi anh/chị bản phác lộ trình và khả năng đỗ của bạn ấy ạ:\n\n' + (f.brief || '') +
      '\n\nMã học sinh của bạn ' + con + ': ' + f.code + ' (bạn ấy nhập ở Trang chủ ' + web + ' khi học trên máy khác). Mỗi buổi có bài giấy, bạn chụp ảnh gửi lên là máy chấm miễn phí. ' + (f.school ? 'Em thấy gia đình đang nhắm ' + f.school + '; anh/chị cho em hỏi thêm mong muốn của gia đình để cô tư vấn sát hơn ạ?' : 'Anh/chị cho em hỏi gia đình đang nhắm trường nào và mong bạn ấy đạt mức nào ạ?');
    case 'b3': return hi + 'Bạn ' + con + ' đã xong 3 buổi đầu. Web đã bắt đầu hiểu cách bạn ấy học' + (sum.tr ? '' : '') + ': ' + (extra || '') + ' Anh/chị nhắc bạn giữ nhịp 1 buổi mỗi 1–2 ngày giúp em nhé ạ.';
    case 'b7': return hi + 'Bạn ' + con + ' đã đi được nửa chặng (7/14 buổi). ' + (extra || '') + ' Nếu anh/chị muốn nghe cô nhận xét kỹ hơn và hỏi về lộ trình, em đặt lịch 15 phút với cô vào giờ anh/chị tiện ạ.';
    case 'dauRa': return hi + 'Bạn ' + con + ' đã làm bài đầu ra sau 14 buổi. ' + (extra || '') + ' Bản báo cáo đầy đủ (nền tảng, khả năng học, khả năng đỗ, lộ trình) bạn ấy mở ở tab Tiến bộ → Xem báo cáo. Em đặt lịch 15 phút với cô để cô trao đổi kỹ với anh/chị nhé ạ?';
    case 'moiTuVan': return hi + 'Bạn ' + con + ' học rất đều trên web' + (extra ? ' (' + extra + ')' : '') + '. Cô muốn mời anh/chị nói chuyện 15–20 phút để cùng xem dữ liệu của bạn ấy và lộ trình tới mốc chốt trường. Anh/chị tiện giờ nào trong tuần này ạ?';
    case 'deXuat': return hi + 'Sau buổi nói chuyện với cô, em gửi anh/chị đề xuất cho bạn ' + con + ': ' + (extra || '[gói đề xuất]') + '. Anh/chị cần em giải thích thêm phần nào không ạ?';
    case 'nhac3': case 'nhac7': return hi + 'Em hỏi thăm anh/chị đã xem đề xuất cho bạn ' + con + ' chưa ạ? Nếu gia đình còn băn khoăn về thời gian hay chi phí, anh/chị cứ nói để em tìm cách phù hợp hơn ạ.';
    case 'donGoi': return hi + 'Em nhận được đăng ký ' + (extra || '') + ' cho bạn ' + con + '. Em gửi anh/chị thông tin chuyển khoản và lịch bắt đầu: [số tài khoản, nội dung chuyển khoản ghi mã ' + (f.code || 'học sinh') + ']. Tiền về là em kích hoạt ngay cho bạn ấy ạ.';
    case 'nhacNhip': return hi + 'Mấy hôm nay bạn ' + con + ' học hơi thưa' + (extra ? ' (' + extra + ')' : '') + '. Nhiều gia đình chọn thêm một cô quản gia nhắc nhịp và theo sát hằng tuần. Nếu anh/chị muốn, em đặt lịch để cô nói kỹ hơn ạ.';
    case 'nangGoi': return hi + (extra || '') + ' Cô gợi ý gia đình cân nhắc thêm giờ học có hướng dẫn (quản gia hoặc lớp ở CES) để bạn ' + con + ' kịp mốc chốt trường. Em đặt lịch để cô giải thích cụ thể nhé ạ?';
    case 'gioiThieu': return hi + 'Chúc mừng bạn ' + con + ': ' + (extra || 'kết quả đầu ra tăng so với đầu vào') + '. Nếu anh/chị biết gia đình nào cũng đang chuẩn bị thi chuyên Anh, anh/chị gửi họ đường dẫn: ' + web + '?ref=' + f.code + ' . Khi gia đình đó bắt đầu học, cả hai bên được tặng thêm một chặng 14 buổi ạ.';
  }
  return '';
}
function lvVi_(k) { return { preA2: 'dưới A2', A2: 'A2', 'A2+': 'A2+', B1: 'B1', 'B1+': 'B1+', B2: 'B2' }[k] || k; }

/* ---------- điểm lead ---------- */
function rhythmOk_(sum) {
  var ts = Object.keys(sum.days || {}).map(function (d) { return Number(sum.days[d][4]) || 0; }).filter(Boolean).sort();
  if (ts.length < 3) return false;
  var gaps = []; for (var i = 1; i < ts.length; i++) gaps.push((ts[i] - ts[i - 1]) / 864e5);
  var mean = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length;
  return mean <= 2.2 && Math.max.apply(null, gaps) <= 5;
}
function last3Acc_(sum) {
  var r = Object.keys(sum.days || {}).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { return sum.days[d]; }).filter(function (x) { return x && x[1]; }).slice(-3);
  if (r.length < 3) return null;
  var c = r.reduce(function (a, x) { return a + x[0]; }, 0), t = r.reduce(function (a, x) { return a + x[1]; }, 0);
  return t ? c / t : null;
}
function scoreOf_(f, st) {
  var sum = st ? json_(st.summary) : {}, it = json_(f.intent), g = Number(f.grade) || Number(sum.g) || 0, parts = {};
  parts.fit = (g === 7 || g === 8 ? 10 : g === 6 || g === 9 ? 5 : 0) + (String(f.school || '') || f.goal ? 10 : 0) + (f.contactAt ? 10 : 0);
  var dw = st ? Number(st.daysWeb) || 0 : 0;
  parts.trial = (st && st.entryLevel ? 5 : 0) + (dw >= 3 ? 10 : 0) + (dw >= 7 ? 10 : 0) + (rhythmOk_(sum) ? 10 : 0) + (st && st.finalLevel ? 5 : 0);
  parts.intent = ((it.tab || 0) >= 3 ? 10 : 0) + ((it.ask || 0) + (it.book || 0) > 0 ? 10 : 0) + ((it.pkg || 0) > 0 ? 5 : 0) + (f.replied ? 5 : 0);
  var s = parts.fit + parts.trial + parts.intent;
  return { score: s, lane: s >= 60 ? 'nóng' : s >= 35 ? 'ấm' : 'nguội', parts: parts };
}
var EARLY = ['Lead mới', 'Đã gọi chào', 'Đang học thử'];
/* gọi sau mỗi lần đồng bộ tiến độ và sau tín hiệu ý định: chấm lại điểm, đổi trạng thái, tạo việc theo mốc */
function refreshFamily_(code) {
  var f = famOf_(code); if (!f) return;
  var st = getStudent_(code), sc = scoreOf_(f, st), fl = json_(f.flags), sum = st ? json_(st.summary) : {}, patch = { score: sc.score, lane: sc.lane };
  var dw = st ? Number(st.daysWeb) || 0 : 0, acc = last3Acc_(sum), paid = st ? String(st.paid || '') : '';
  if (f.status === 'Đã gọi chào' && dw >= 1) patch.status = 'Đang học thử';
  if (dw >= 3 && !fl.b3) { fl.b3 = 1; addTask_(f, 'b3', zText_('b3', f, st, acc != null ? 'đúng khoảng ' + Math.round(acc * 100) + '% câu kiểm tra 3 buổi gần nhất.' : ''), 24); }
  if (dw >= 7 && !fl.b7) { fl.b7 = 1; addTask_(f, 'b7', zText_('b7', f, st, (sum.sd ? 'Bạn ấy học ' + sum.sd + ' ngày trong ' + (sum.sp || sum.sd) + ' ngày. ' : '') + (st.webAcc !== '' ? 'Đúng khoảng ' + Math.round(Number(st.webAcc) * 100) + '% câu kiểm tra trên web.' : '')), 24); }
  if (st && st.finalLevel && !fl.dr) { fl.dr = 1; addTask_(f, 'dauRa', zText_('dauRa', f, st, 'Đầu vào ' + lvVi_(st.entryLevel) + ', đầu ra ' + lvVi_(st.finalLevel) + '.'), 24); }
  if (sc.score >= 60 && !fl.pql && EARLY.indexOf(f.status) >= 0) { fl.pql = 1; patch.status = 'PQL'; addTask_(f, 'moiTuVan', zText_('moiTuVan', f, st, dw ? dw + ' buổi' : ''), 4); }
  /* khách Gói Web: học thưa hoặc độ đúng thấp → gợi ý thêm người theo sát (tối đa 1 việc mỗi 14 ngày) */
  if (/^Gói Web/.test(paid) && (!fl.up || Date.now() - fl.up > 14 * 864e5)) {
    var gapDays = st.lastSeen ? (Date.now() - new Date(st.lastSeen).getTime()) / 864e5 : 0;
    if (gapDays > 5) { fl.up = Date.now(); addTask_(f, 'nhacNhip', zText_('nhacNhip', f, st, 'nghỉ ' + Math.floor(gapDays) + ' ngày'), 24); }
    else if (acc != null && acc < 0.5) { fl.up = Date.now(); addTask_(f, 'nangGoi', zText_('nangGoi', f, st, 'Độ đúng 3 buổi gần nhất của bạn ' + f.child + ' khoảng ' + Math.round(acc * 100) + '%.'), 24); }
  }
  if (st && st.finalLevel && st.entryLevel && LV_RANK_(st.finalLevel) > LV_RANK_(st.entryLevel) && !fl.gt) { fl.gt = 1; addTask_(f, 'gioiThieu', zText_('gioiThieu', f, st, 'đầu vào ' + lvVi_(st.entryLevel) + ', đầu ra ' + lvVi_(st.finalLevel)), 48); }
  patch.flags = JSON.stringify(fl);
  famPatch_(f.id, patch);
}
function LV_RANK_(k) { return ['preA2', 'A2', 'A2+', 'B1', 'B1+', 'B2'].indexOf(k); }

/* ---------- công khai: cổng sau bài đầu vào ---------- */
function lead_(q) {
  if (q.website) return { ok: true, code: '' };
  rate_('lead_count', 60, 3600);
  var parent = clip_(String(q.parent || '').trim(), 80), phone = phone_(q.phone), email = clip_(String(q.email || '').trim(), 120), child = clip_(String(q.child || '').trim(), 80);
  if (!child) throw new Error('missing_name');
  if (!okPhone_(phone)) throw new Error('missing_phone');
  if (q.consent !== true) throw new Error('need_consent');
  var st = getStudent_(q.code), code;
  if (st) code = st.code; else code = tAdd_(child, q.grade, 0).code;
  var old = famOf_(code);
  if (old) { famPatch_(old.id, { parent: parent || old.parent, phone: phone, email: email || old.email, brief: clip_(q.brief, 4000) || old.brief }); return { ok: true, code: code, again: true }; }
  var dupPhone = rows_('families').some(function (r) { return String(r.phone) === phone; });
  var f = { id: uid_('F'), ts: now_(), code: code, parent: parent, phone: phone, email: email, child: child, grade: Number(q.grade) || '', region: clip_(q.region, 60), school: clip_(q.school, 120), goal: clip_(q.goal, 40),
    source: source_(q), ref: clip_(String(q.ref || '').toUpperCase(), 10), consent: now_(), status: 'Lead mới', brief: clip_(q.brief, 4000), intent: '{}', flags: '{}', updated: now_() };
  withLock_(function () { insert_('families', f); addTask_(f, 'chao', zText_('chao', f, getStudent_(code)), 1); if (dupPhone) addTask_(f, 'tuvanTrung', 'Số ' + phone + ' đã có trong danh sách gia đình. Kiểm tra xem có phải cùng một nhà (anh chị em, hoặc con làm lại trên máy khác) để gộp.', 24); });
  try { MailApp.sendEmail({ to: teacherEmail_(), subject: '[Chuyên Anh 14 Ngày] Lead mới · ' + child + ' · gọi chào trong 1 giờ', body: 'Phụ huynh ' + (parent || '') + ' · Zalo ' + phone + '\nHọc sinh: ' + child + ' · lớp ' + (f.grade || '—') + ' · ' + (f.school || '') + '\nMã: ' + code + ' · nguồn: ' + f.source + '\n\nViệc gọi chào đã nằm trong tab Việc hôm nay: ' + STAFF_URL }); } catch (e) {}
  refreshFamily_(code);
  return { ok: true, code: code };
}
/* công khai: bố mẹ muốn nói chuyện với cô (có mã; chưa có gia đình thì cần số Zalo) */
function consult_(q) {
  if (q.website) return { ok: true };
  rate_('consult_' + String(q.code || q.phone || ''), 5, 3600);
  var st = getStudent_(q.code), f = st ? famOf_(st.code) : null;
  if (!f) {
    var r = lead_({ code: st ? st.code : '', parent: q.parent, phone: q.phone, email: q.email, child: q.child || (st && st.name), grade: q.grade || (st && st.grade), school: q.school, region: q.region, consent: q.consent, src: q.src, ref: q.ref, brief: q.brief });
    f = famOf_(r.code);
  }
  var it = json_(f.intent); it.book = (it.book || 0) + 1;
  famPatch_(f.id, { intent: JSON.stringify(it) });
  var txt = 'Bố mẹ bạn ' + f.child + ' muốn nói chuyện với cô' + (q.about ? ' về: ' + clip_(q.about, 200) : '') + '. Giờ tiện nghe máy: ' + (clip_(q.when, 120) || 'chưa ghi') + (q.note ? '. Lời nhắn: ' + clip_(String(q.note).trim().replace(/[.\s]+$/, ''), 500) : '') + '.\nSale gọi xác nhận, chọn giáo viên và giờ ở dòng này.';
  withLock_(function () { addTask_(f, 'tuvan', txt, 1); });
  refreshFamily_(f.code);
  return { ok: true, code: f.code };
}
/* có mã: tín hiệu ý định (mở tab Lộ trình, Sau 14 ngày, Chọn trường; bấm Hỏi cô; mở trang gói) */
function signal_(st, kind) {
  var map = { tab_plan: 'tab', tab_course: 'tab', tab_school: 'tab', ask: 'ask', pkg: 'pkg' }, k = map[kind];
  if (!k) return { ok: true };
  var c = CacheService.getScriptCache(), key = 'sig_' + st.code + '_' + kind;
  if (c.get(key)) return { ok: true }; c.put(key, '1', 3 * 3600); // mỗi loại tính tối đa một lần mỗi 3 giờ
  var f = famOf_(st.code); if (!f) return { ok: true };
  var it = json_(f.intent); it[k] = (it[k] || 0) + 1;
  famPatch_(f.id, { intent: JSON.stringify(it) });
  refreshFamily_(st.code);
  return { ok: true };
}
/* công khai: đơn Gói Web theo giai đoạn (thu chuyển khoản qua sale cho tới khi nối SePay) */
function pkgOrder_(q) {
  if (q.website) return { ok: true };
  rate_('order_count', 40, 3600);
  var P = WEB_PACKS[q.pack]; if (!P) throw new Error('bad_pack');
  var parent = clip_(String(q.parent || '').trim(), 80), phone = phone_(q.phone), email = clip_(String(q.email || '').trim(), 120), child = clip_(String(q.child || '').trim(), 80);
  if (!parent || !child) throw new Error('missing_name');
  if (!okPhone_(phone)) throw new Error('missing_phone');
  if (q.consent !== true) throw new Error('need_consent');
  var st = getStudent_(q.code), f = st ? famOf_(st.code) : null;
  if (!f) { var r = lead_({ code: st ? st.code : '', parent: parent, phone: phone, email: email, child: child, grade: q.grade, school: q.school, region: q.region, consent: true, src: q.src, ref: q.ref, brief: q.brief }); f = famOf_(r.code); }
  var pay = q.pay === '2' ? '2 lần' : '1 lần', id = uid_('D');
  withLock_(function () {
    insert_('pkgOrders', { id: id, ts: now_(), famId: f.id, code: f.code, parent: parent, phone: phone, email: email, child: child, grade: Number(q.grade) || f.grade, pack: q.pack, price: P.price, pay: pay, status: 'chờ thu tiền', note: clip_(q.note, 800) });
    addTask_(f, 'donGoi', zText_('donGoi', f, null, P.name + ' (' + P.price.toLocaleString('vi-VN') + 'đ, trả ' + pay + ')'), 1);
  });
  famPatch_(f.id, { status: 'Chờ thanh toán', parent: parent || f.parent });
  try { MailApp.sendEmail({ to: teacherEmail_(), subject: '[Chuyên Anh 14 Ngày] Đơn ' + P.name + ' · ' + child, body: 'Phụ huynh ' + parent + ' · Zalo ' + phone + (email ? ' · ' + email : '') + '\nGói: ' + P.name + ' · ' + P.price.toLocaleString('vi-VN') + 'đ · trả ' + pay + '\nMã học sinh: ' + f.code + '\n\nSale nhắn Zalo thu tiền rồi bấm "Đã thu tiền · kích hoạt" ở tab Đơn gói học: ' + STAFF_URL }); } catch (e) {}
  return { ok: true, id: id, code: f.code, price: P.price };
}
/* công khai: số chỗ Quản gia còn trống (hiện trên trang gói) */
function capacity_() {
  var t = rows_('staff').filter(function (x) { return x.role === 'giaovien' && activeOf_(x); }).length;
  var used = rows_('students').filter(function (s) { return /Quản gia/.test(String(s.paid || '')); }).length;
  return { total: t * QG_PER_TEACHER, used: used, left: Math.max(0, t * QG_PER_TEACHER - used) };
}

/* ---------- nhân viên ---------- */
function famOut_(f, studs) {
  var st = studs.filter(function (s) { return s.code === f.code; })[0], sum = st ? json_(st.summary) : {};
  return { id: f.id, ts: f.ts, code: f.code, parent: f.parent, phone: String(f.phone || ''), email: f.email, child: f.child, grade: f.grade, region: f.region, school: f.school, source: f.source, ref: f.ref,
    status: f.status, score: Number(f.score) || 0, lane: f.lane || 'nguội', handler: f.handler, teacher: f.teacher, contactAt: f.contactAt, consultAt: f.consultAt, consultNote: f.consultNote, proposal: f.proposal,
    saleNote: f.saleNote, reason: f.reason, replied: !!f.replied, intent: json_(f.intent), parts: scoreOf_(f, st).parts,
    learn: st ? { entry: st.entryLevel, final: st.finalLevel, daysWeb: Number(st.daysWeb) || 0, lastSeen: st.lastSeen, acc: st.webAcc, paid: String(st.paid || ''), sd: sum.sd || 0 } : null };
}
function sTasks_(me) {
  var fams = {}, studs = rows_('students'); rows_('families').forEach(function (f) { fams[f.id] = f; });
  var open = rows_('tasks').filter(function (t) { return t.status === 'mở'; }).sort(function (a, b) { return String(a.due).localeCompare(String(b.due)); });
  return { ok: true, capacity: capacity_(), kinds: TASK_VI, teachers: rows_('staff').filter(function (x) { return x.role === 'giaovien' && activeOf_(x); }).map(function (x) { return { id: x.id, name: x.name }; }),
    tasks: open.map(function (t) { var f = fams[t.famId]; return { id: t.id, ts: t.ts, kind: t.kind, kindVi: TASK_VI[t.kind] || t.kind, due: t.due, text: t.text, fam: f ? famOut_(f, studs) : null }; }) };
}
function sTaskDone_(q, me) {
  return withLock_(function () {
    var t = find_('tasks', 'id', q.id); if (!t) throw new Error('no_task');
    if (t.status !== 'mở') return { ok: true, already: true };
    var res = q.result === 'skip' ? 'bỏ qua' : 'xong';
    if (res === 'bỏ qua' && !String(q.note || '').trim()) throw new Error('need_reason');
    update_('tasks', t._row, { status: res, note: clip_(q.note, 800), doneBy: me.name, doneAt: now_() });
    var f = t.famId ? find_('families', 'id', t.famId) : null, patch = {};
    if (f) {
      if (t.kind === 'chao' && res === 'xong') { if (!f.contactAt) patch.contactAt = now_(); if (f.status === 'Lead mới') patch.status = 'Đã gọi chào'; }
      if (q.replied) patch.replied = true;
      if (!f.handler) patch.handler = me.name;
      if (q.teacher && (t.kind === 'tuvan' || t.kind === 'moiTuVan')) {
        patch.teacher = String(q.teacher); patch.consultAt = clip_(q.when, 60); patch.status = 'Đã hẹn tư vấn';
        var st = getStudent_(f.code); if (st && !st.teacher) update_('students', st._row, { teacher: String(q.teacher) }); // để giáo viên mở được hồ sơ
      }
      if (Object.keys(patch).length) { patch.updated = now_(); update_('families', f._row, patch); }
    }
    return { ok: true, status: res };
  });
}
function sFamilies_() {
  var studs = rows_('students'), staff = rows_('staff'), tn = {}; staff.forEach(function (x) { tn[x.id] = x.name; });
  return { ok: true, statuses: FAM_ST, reasons: LOST_WHY, capacity: capacity_(),
    families: rows_('families').map(function (f) { var o = famOut_(f, studs); o.teacherName = tn[f.teacher] || ''; return o; }).reverse() };
}
function sFamilySet_(q, me) {
  return withLock_(function () {
    var f = find_('families', 'id', q.id); if (!f) throw new Error('no_family');
    var patch = { handler: f.handler || me.name, updated: now_() };
    if (q.status) {
      if (FAM_ST.indexOf(q.status) < 0) throw new Error('bad_status');
      if (q.status === 'Mất' && LOST_WHY.indexOf(q.reason) < 0) throw new Error('need_reason');
      patch.status = q.status; if (q.status === 'Mất') patch.reason = q.reason;
    }
    if (q.saleNote != null) patch.saleNote = clip_(q.saleNote, 1500);
    update_('families', f._row, patch);
    return { ok: true };
  });
}
/* giáo viên: lịch tư vấn của mình (không thấy điểm lead, ghi chú bán hàng, số tiền) */
function tConsults_(me) {
  var studs = rows_('students');
  return { ok: true, list: rows_('families').filter(function (f) { return me.role !== 'giaovien' || String(f.teacher) === me.id; }).filter(function (f) { return f.teacher && ['Đã hẹn tư vấn', 'Đã tư vấn'].indexOf(f.status) >= 0; }).map(function (f) {
    var st = studs.filter(function (s) { return s.code === f.code; })[0];
    return { id: f.id, code: f.code, child: f.child, grade: f.grade, school: f.school, status: f.status, consultAt: f.consultAt, consultNote: f.consultNote, proposal: f.proposal,
      learn: st ? { entry: st.entryLevel, final: st.finalLevel, daysWeb: Number(st.daysWeb) || 0, acc: st.webAcc } : null };
  }).reverse() };
}
function tConsultNote_(q, me) {
  var pr = ['Gói Web GĐ1', 'Gói Web GĐ2', 'Gói Web GĐ3', 'Gói Web GĐ4', 'Gói Quản gia', 'Chưa cần gói'];
  if (pr.indexOf(q.proposal) < 0) throw new Error('bad_proposal');
  var f = find_('families', 'id', q.id); if (!f) throw new Error('no_family');
  if (me.role === 'giaovien' && String(f.teacher) !== me.id) throw new Error('forbidden');
  withLock_(function () {
    var x = find_('families', 'id', q.id);
    update_('families', x._row, { consultNote: clip_(q.note, 2000), proposal: q.proposal, status: 'Đã tư vấn', updated: now_() });
    if (q.proposal !== 'Chưa cần gói') {
      addTask_(x, 'deXuat', zText_('deXuat', x, null, q.proposal), 24);
      insert_('tasks', { id: uid_('V'), ts: now_(), famId: x.id, code: x.code, kind: 'nhac3', due: new Date(Date.now() + 3 * 864e5).toISOString(), status: 'mở', text: zText_('nhac3', x) });
      insert_('tasks', { id: uid_('V'), ts: now_(), famId: x.id, code: x.code, kind: 'nhac7', due: new Date(Date.now() + 7 * 864e5).toISOString(), status: 'mở', text: zText_('nhac7', x) });
    }
  });
  return { ok: true };
}
function sOrders_() {
  return { ok: true, packs: WEB_PACKS, orders: rows_('pkgOrders').map(function (o) {
    return { id: o.id, ts: o.ts, code: o.code, parent: o.parent, phone: String(o.phone || ''), email: o.email, child: o.child, grade: o.grade, pack: o.pack, packName: (WEB_PACKS[o.pack] || {}).name || o.pack,
      price: Number(o.price) || 0, pay: o.pay, status: o.status, paidAmt: Number(o.paidAmt) || 0, handler: o.handler, note: o.note, paidAt: o.paidAt };
  }).reverse() };
}
/* sale đã nhận tiền → kích hoạt gói cho mã học sinh, chuyển gia đình sang Khách Gói Web; thưởng giới thiệu nếu có */
function sOrderPaid_(q, me) {
  var o = find_('pkgOrders', 'id', q.id); if (!o) throw new Error('no_order');
  if (o.status === 'đã kích hoạt') return { ok: true, already: true };
  var amt = Math.max(0, Number(q.amount) || Number(o.price) || 0), P = WEB_PACKS[o.pack] || { name: o.pack };
  tPaid_(o.code, P.name.replace('Gói Web · ', 'Gói Web ').slice(0, 40));
  withLock_(function () {
    var x = find_('pkgOrders', 'id', q.id);
    update_('pkgOrders', x._row, { status: 'đã kích hoạt', paidAmt: amt, handler: me.name, paidAt: now_(), note: q.note != null ? clip_(q.note, 800) : x.note });
    var f = find_('families', 'id', o.famId);
    if (f) {
      update_('families', f._row, { status: /Quản gia/.test(String(f.status)) ? f.status : 'Khách Gói Web', handler: f.handler || me.name, updated: now_() });
      if (f.ref && getStudent_(f.ref)) {
        var rf = famOf_(String(f.ref).toUpperCase());
        insert_('tasks', { id: uid_('V'), ts: now_(), famId: f.id, code: f.code, kind: 'thuongGT', due: dueIn_(24), status: 'mở',
          text: 'Gia đình bạn ' + f.child + ' (mã ' + f.code + ') đến qua đường dẫn giới thiệu của mã ' + f.ref + (rf ? ' (bạn ' + rf.child + ')' : '') + ' và đã thanh toán. Trao thưởng cho cả hai bên: Gói Web thêm một chặng 14 buổi; Quản gia thêm 2 tuần theo sát. Báo cho hai gia đình qua Zalo.' });
      }
    }
    rows_('tasks').forEach(function (t) { if (t.famId === o.famId && t.kind === 'donGoi' && t.status === 'mở') update_('tasks', t._row, { status: 'xong', doneBy: me.name, doneAt: now_(), note: 'đã thu tiền' }); });
  });
  return { ok: true, code: o.code, paid: P.name };
}
function sOrderStatus_(q, me) {
  if (['chờ thu tiền', 'huỷ'].indexOf(q.status) < 0) throw new Error('bad_status');
  return withLock_(function () { var o = find_('pkgOrders', 'id', q.id); if (!o) throw new Error('no_order'); update_('pkgOrders', o._row, { status: q.status, handler: me.name, note: q.note != null ? clip_(q.note, 800) : o.note }); return { ok: true }; });
}
/* sale/quản lý đổi một con sang Quản gia sau khi gia đình đã thanh toán học phí Quản gia (giá theo đề xuất, ghi số tiền) */
function sQuangia_(q, me) {
  var f = find_('families', 'id', q.id); if (!f) throw new Error('no_family');
  var amt = Math.max(0, Number(q.amount) || 0); if (!amt) throw new Error('need_amount');
  tPaid_(f.code, 'Quản gia');
  withLock_(function () {
    insert_('pkgOrders', { id: uid_('D'), ts: now_(), famId: f.id, code: f.code, parent: f.parent, phone: f.phone, email: f.email, child: f.child, grade: f.grade, pack: 'quangia', price: amt, pay: '1 lần', status: 'đã kích hoạt', paidAmt: amt, handler: me.name, note: clip_(q.note, 800), paidAt: now_() });
    var x = find_('families', 'id', q.id); update_('families', x._row, { status: 'Khách Quản gia', handler: x.handler || me.name, updated: now_() });
  });
  return { ok: true };
}
/* tổng quan phễu cho quản lý */
function funnel_() {
  var fams = rows_('families'), ords = rows_('pkgOrders'), studs = rows_('students'), tasks = rows_('tasks');
  var by = {}; FAM_ST.forEach(function (s) { by[s] = 0; }); fams.forEach(function (f) { by[f.status] = (by[f.status] || 0) + 1; });
  var reached = function (list) { return fams.filter(function (f) { return list.indexOf(f.status) >= 0; }).length; };
  var after = function (i) { return reached(FAM_ST.slice(i, 9)); };
  var mins = fams.filter(function (f) { return f.contactAt; }).map(function (f) { return (new Date(f.contactAt) - new Date(f.ts)) / 6e4; }).sort(function (a, b) { return a - b; });
  var chao = tasks.filter(function (t) { return t.kind === 'chao' && t.status !== 'mở'; }), inTime = chao.filter(function (t) { return new Date(t.doneAt) <= new Date(t.due); }).length;
  var src = {}; fams.forEach(function (f) { var k = f.source || 'trực tiếp'; src[k] = src[k] || { leads: 0, buy: 0 }; src[k].leads++; if (/^Khách/.test(f.status)) src[k].buy++; });
  var paid = ords.filter(function (o) { return o.status === 'đã kích hoạt'; });
  var lost = {}; fams.filter(function (f) { return f.status === 'Mất'; }).forEach(function (f) { lost[f.reason || 'khác'] = (lost[f.reason || 'khác'] || 0) + 1; });
  return { byStatus: by, steps: [['Làm bài đầu vào', studs.filter(function (s) { return s.entryLevel; }).length], ['Để lại Zalo (lead)', fams.length], ['Đã gọi chào trở đi', after(1)], ['Đủ điều kiện tư vấn (PQL) trở đi', after(3)], ['Đã tư vấn trở đi', after(5)], ['Khách (Web hoặc Quản gia)', reached(['Khách Gói Web', 'Khách Quản gia'])]],
    lanes: { nong: fams.filter(function (f) { return f.lane === 'nóng'; }).length, am: fams.filter(function (f) { return f.lane === 'ấm'; }).length, nguoi: fams.filter(function (f) { return !f.lane || f.lane === 'nguội'; }).length },
    speed: { median: mins.length ? Math.round(mins[Math.floor(mins.length / 2)]) : null, inTimePct: chao.length ? Math.round(100 * inTime / chao.length) : null, open: tasks.filter(function (t) { return t.status === 'mở'; }).length, overdue: tasks.filter(function (t) { return t.status === 'mở' && new Date(t.due) < new Date(); }).length },
    revenue: { web: paid.filter(function (o) { return o.pack !== 'quangia'; }).reduce(function (a, o) { return a + (Number(o.paidAmt) || 0); }, 0), qg: paid.filter(function (o) { return o.pack === 'quangia'; }).reduce(function (a, o) { return a + (Number(o.paidAmt) || 0); }, 0), waiting: ords.filter(function (o) { return o.status === 'chờ thu tiền'; }).length },
    sources: Object.keys(src).map(function (k) { return { source: k, leads: src[k].leads, buy: src[k].buy }; }).sort(function (a, b) { return b.leads - a.leads; }),
    lost: lost, capacity: capacity_() };
}
