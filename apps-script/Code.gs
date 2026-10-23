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
  students: { name: 'Học sinh', cols: ['code', 'name', 'grade', 'created', 'lastSeen', 'daysWeb', 'daysPaper', 'webAcc', 'retryAcc', 'mastered', 'eff', 'entryLevel', 'finalLevel', 'planMin', 'planDpw', 'paperAvg', 'stateFileId', 'summary', 'paid', 'credits'] },
  uploads: { name: 'Bài giấy', cols: ['id', 'ts', 'code', 'day', 'fileIds', 'status', 'score', 'total', 'result', 'teacherNote', 'updated', 'error', 'tries', 'charged'] },
  messages: { name: 'Tin nhắn', cols: ['id', 'ts', 'code', 'from', 'uploadId', 'itemId', 'text', 'seenTeacher', 'seenStudent'] },
  orders: { name: 'Yêu cầu mua', cols: ['id', 'ts', 'code', 'name', 'product', 'status', 'note'] },
  requests: { name: 'Phụ huynh đăng ký', cols: ['id', 'ts', 'parent', 'phone', 'email', 'child', 'grade', 'region', 'school', 'want', 'pack', 'note', 'fileIds', 'consent', 'status', 'code', 'teacherNote'] }
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
  if (a === 'prices') return { ok: true, per: PRICE_PER, packs: PACKS };
  if (a.indexOf('t_') === 0) {
    checkPin_(q.pin);
    switch (a) {
      case 't_list': return tList_();
      case 't_student': return tStudent_(q.code);
      case 't_add': return tAdd_(q.name, q.grade, q.credits);
      case 't_credits': return tCredits_(q.code, q.add);
      case 't_requests': return tRequests_();
      case 't_req_issue': return tReqIssue_(q.id, q.credits, q.sendEmail);
      case 't_req_status': return tReqStatus_(q.id, q.status, q.note);
      case 't_reply': return tReply_(q.code, q.uploadId, q.itemId, q.text);
      case 't_override': return tOverride_(q);
      case 't_regrade': return tRegrade_(q.uploadId);
      case 't_image': return tImage_(q.fileId);
      case 't_paid': return tPaid_(q.code, q.paid);
      case 't_order': return tOrder_(q.id, q.status);
    }
    throw new Error('unknown_action');
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
  }
  throw new Error('unknown_action');
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
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade, paid: isPaid_(st), credits: credits_(st) }, state: state };
}

function sync_(st, state, kpi, sum) {
  if (!state || typeof state !== 'object') throw new Error('no_state');
  var text = JSON.stringify(state);
  if (text.length > 4 * 1024 * 1024) throw new Error('state_too_big');
  return withLock_(function () {
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
  return { ok: true, uploads: ups, messages: outMsgs, paid: isPaid_(st), orderPending: pending, credits: credits_(st) };
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
  'Chỉ trả về MỘT đối tượng JSON, không thêm chữ nào khác, theo mẫu:',
  '{"items":[{"label":"A.1","read":"...","correct":true,"note":""}],"writing":{"read":"nguyên văn bài viết","unclear":["từ hoặc đoạn không đọc chắc"]},"overall":"2–3 câu nhận xét chung về phần trắc nghiệm, điền từ, bằng tiếng Việt","unreadable":false}',
  'Nếu buổi không có bài viết hoặc học sinh không viết, đặt "writing": null.',
  'Nếu ảnh không phải bài làm, đặt "unreadable": true và "items": [].'
].join('\n');

function callClaude_(images, key) {
  var p = PropertiesService.getScriptProperties();
  return claudeJson_(p.getProperty('MODEL') || DEFAULT_MODEL, SYSTEM_PROMPT,
    images.concat([{ type: 'text', text: keyText_(key) + '\n\nHãy chấm các ảnh bài làm ở trên theo đáp án này và trả về JSON.' }]), 6000);
}

/* gọi Claude, trả về đối tượng JSON trong câu trả lời */
function claudeJson_(model, system, content, maxTokens) {
  var apiKey = String(PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || '').trim();
  if (!apiKey) throw new Error('Chưa cài CLAUDE_API_KEY');
  var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: content }] })
  });
  var code = resp.getResponseCode(), text = resp.getContentText();
  if (code !== 200) throw new Error('Claude API ' + code + ': ' + clip_(text, 300));
  var data = JSON.parse(text);
  var out = (data.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  var a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Không đọc được JSON từ Claude');
  return JSON.parse(out.slice(a, b + 1));
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
  'Chỉ trả về MỘT đối tượng JSON: {"score":0,"strengths":["",""],"improve":["",""],"summary":"1 câu nhận xét chung"}'
].join('\n');

function gradeWritingFree_(task, text) {
  var p = PropertiesService.getScriptProperties();
  var prompt = 'ĐỀ: ' + task.task + '\nTối thiểu ' + task.min_words + ' từ.\nTiêu chí của buổi: ' + (task.checklist || []).join(' / ') +
    '\n\nBÀI CỦA HỌC SINH (' + wordCount_(text) + ' từ):\n' + text;
  var r = claudeJson_(p.getProperty('MODEL_FREE') || DEFAULT_MODEL_FREE, FREE_PROMPT, [{ type: 'text', text: prompt }], 1200);
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
  'Chỉ trả về MỘT đối tượng JSON:',
  '{"criteria":[{"key":"content","score":0,"comment":"","evidence":[""]}],"errors":[{"quote":"","fix":"","why":"","type":""}],"upgrades":[{"from":"","to":"","why":""}],"next":["","",""],"summary":"2 câu tổng kết"}'
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
  var r = claudeJson_(p.getProperty('MODEL') || DEFAULT_MODEL, DETAIL_PROMPT, [{ type: 'text', text: prompt }], 4000);
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
function tReqIssue_(id, credits, sendEmail) {
  var r = find_('requests', 'id', id);
  if (!r) throw new Error('no_request');
  var n = Math.max(0, Number(credits) || packInfo_(r.pack).n);
  var code = r.code;
  if (code && getStudent_(code)) tCredits_(code, n);
  else { code = tAdd_(r.child, r.grade, n).code; }
  withLock_(function () { var x = find_('requests', 'id', id); update_('requests', x._row, { status: 'đã cấp lượt', code: code }); });
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
function tReqStatus_(id, status, note) {
  return withLock_(function () {
    var r = find_('requests', 'id', id);
    if (!r) throw new Error('no_request');
    var patch = { status: clip_(status, 40) };
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
function tList_() {
  var ups = rows_('uploads'), msgs = rows_('messages'), ords = rows_('orders');
  var list = rows_('students').map(function (s) {
    var mine = ups.filter(function (u) { return u.code === s.code; });
    var unread = msgs.filter(function (m) { return m.code === s.code && m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE'); }).length;
    return { code: s.code, name: s.name, grade: s.grade, created: s.created, lastSeen: s.lastSeen, daysWeb: s.daysWeb, daysPaper: s.daysPaper, webAcc: s.webAcc, retryAcc: s.retryAcc,
      mastered: s.mastered, eff: s.eff, entryLevel: s.entryLevel, finalLevel: s.finalLevel, planMin: s.planMin, planDpw: s.planDpw, paperAvg: s.paperAvg,
      uploads: mine.length, errors: mine.filter(function (u) { return u.status === 'error'; }).length, unread: unread,
      paid: String(s.paid || ''), credits: credits_(s), orderPending: ords.some(function (o) { return o.code === s.code && o.status === 'chờ liên hệ'; }),
      waitConfirm: mine.filter(function (u) { var r = parse_(u.result, null); return r && r.writing && r.writing.status === 'confirm'; }).length };
  });
  return { ok: true, students: list };
}

function tStudent_(code) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  var ups = rows_('uploads').filter(function (r) { return r.code === st.code; }).map(function (r) { var o = uploadOut_(r); o.fileIds = String(r.fileIds).split(',').filter(String); return o; });
  var msgs = rows_('messages').filter(function (m) { return m.code === st.code; });
  var outMsgs = msgs.map(msgOut_);
  withLock_(function () { msgs.forEach(function (m) { if (m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE')) update_('messages', m._row, { seenTeacher: true }); }); });
  var ords = rows_('orders').filter(function (o) { return o.code === st.code; }).map(function (o) { return { id: o.id, ts: o.ts, product: o.product, status: o.status }; });
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade, created: st.created, lastSeen: st.lastSeen, paperAvg: st.paperAvg, paid: String(st.paid || ''), credits: credits_(st) }, summary: parse_(st.summary, null), uploads: ups, messages: outMsgs, orders: ords };
}

function tAdd_(name, grade, credits) {
  name = clip_(String(name || '').trim(), 80);
  if (!name) throw new Error('no_name');
  return withLock_(function () {
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code;
    do { code = ''; for (var i = 0; i < 6; i++) code += abc.charAt(Math.floor(Math.random() * abc.length)); } while (find_('students', 'code', code));
    insert_('students', { code: code, name: name, grade: Number(grade) || '', created: now_(), credits: Math.max(0, Number(credits) || 0) });
    return { ok: true, code: code };
  });
}

function tReply_(code, uploadId, itemId, text) {
  var st = getStudent_(code);
  if (!st) return { ok: false, error: 'bad_code' };
  text = clip_(String(text || '').trim(), 2000);
  if (!text) throw new Error('empty');
  var id = uid_('M');
  withLock_(function () { insert_('messages', { id: id, ts: now_(), code: st.code, from: 'teacher', uploadId: uploadId || '', itemId: itemId || '', text: text, seenTeacher: true, seenStudent: false }); });
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

function tImage_(fileId) {
  var has = function (r) { return String(r.fileIds || '').split(',').indexOf(String(fileId)) >= 0; };
  var ok = rows_('uploads').some(has) || rows_('requests').some(has);
  if (!ok) throw new Error('not_found');
  var b = DriveApp.getFileById(fileId).getBlob();
  return { ok: true, mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
}
