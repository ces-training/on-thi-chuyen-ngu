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
 *   MODEL           — (tuỳ chọn) mô hình Claude, mặc định claude-sonnet-5-5
 */

var SHEETS = {
  students: { name: 'Học sinh', cols: ['code', 'name', 'grade', 'created', 'lastSeen', 'daysWeb', 'daysPaper', 'webAcc', 'retryAcc', 'mastered', 'eff', 'entryLevel', 'finalLevel', 'planMin', 'planDpw', 'paperAvg', 'stateFileId', 'summary'] },
  uploads: { name: 'Bài giấy', cols: ['id', 'ts', 'code', 'day', 'fileIds', 'status', 'score', 'total', 'result', 'teacherNote', 'updated', 'error', 'tries'] },
  messages: { name: 'Tin nhắn', cols: ['id', 'ts', 'code', 'from', 'uploadId', 'itemId', 'text', 'seenTeacher', 'seenStudent'] }
};
var DEFAULT_MODEL = 'claude-sonnet-5-5';
var MAX_IMAGES = 6;
var MAX_IMAGE_B64 = 6 * 1024 * 1024;

/* ---------- cài đặt một lần ---------- */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (k) {
    var def = SHEETS[k];
    var sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    if (sh.getLastRow() === 0) sh.appendRow(def.cols);
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
  if (a.indexOf('t_') === 0) {
    checkPin_(q.pin);
    switch (a) {
      case 't_list': return tList_();
      case 't_student': return tStudent_(q.code);
      case 't_add': return tAdd_(q.name, q.grade);
      case 't_reply': return tReply_(q.code, q.uploadId, q.itemId, q.text);
      case 't_override': return tOverride_(q);
      case 't_regrade': return tRegrade_(q.uploadId);
      case 't_image': return tImage_(q.fileId);
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
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade }, state: state };
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
  return { ok: true, uploads: ups, messages: outMsgs };
}

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

function gradeUpload_(id) {
  var row = find_('uploads', 'id', id);
  if (!row) throw new Error('no_upload');
  var key = PAPER_KEYS[String(row.day)];
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
      if (old.writing && old.writing.teacher && graded.writing) { graded.writing.score = old.writing.score; graded.writing.teacher = true; }
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
    lines.push('', '## F · Bài viết', 'Đề: ' + key.writing.task, 'Tối thiểu ' + key.writing.min_words + ' từ.', 'Tiêu chí tự kiểm: ' + key.writing.checklist.join(' / '));
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
  'Bài viết: chép lại đoạn học sinh viết, đếm số từ, chấm thang 10 theo: đủ ý của đề, đúng ngữ pháp trọng tâm của buổi, dùng từ mới, đủ số từ. Nêu 2 điểm tốt và 2 điểm cần sửa, cụ thể, giọng tôn trọng, khích lệ.',
  'Chỉ trả về MỘT đối tượng JSON, không thêm chữ nào khác, theo mẫu:',
  '{"items":[{"label":"A.1","read":"...","correct":true,"note":""}],"writing":{"read":"...","words":0,"score":0,"strengths":["..."],"improve":["..."]},"overall":"2–3 câu nhận xét chung bằng tiếng Việt","unreadable":false}',
  'Nếu buổi không có bài viết hoặc học sinh không viết, đặt "writing": null.',
  'Nếu ảnh không phải bài làm, đặt "unreadable": true và "items": [].'
].join('\n');

function callClaude_(images, key) {
  var p = PropertiesService.getScriptProperties();
  var apiKey = p.getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Chưa cài CLAUDE_API_KEY');
  var body = {
    model: p.getProperty('MODEL') || DEFAULT_MODEL,
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: images.concat([{ type: 'text', text: keyText_(key) + '\n\nHãy chấm các ảnh bài làm ở trên theo đáp án này và trả về JSON.' }]) }]
  };
  var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(body)
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
  var w = res.writing && typeof res.writing === 'object' ? {
    read: clip_(res.writing.read, 4000), words: Number(res.writing.words) || 0, score: Math.max(0, Math.min(10, Number(res.writing.score) || 0)),
    strengths: (res.writing.strengths || []).slice(0, 4).map(function (x) { return clip_(x, 300); }),
    improve: (res.writing.improve || []).slice(0, 4).map(function (x) { return clip_(x, 300); })
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

/* ---------- dành cho cô ---------- */
function tList_() {
  var ups = rows_('uploads'), msgs = rows_('messages');
  var list = rows_('students').map(function (s) {
    var mine = ups.filter(function (u) { return u.code === s.code; });
    var unread = msgs.filter(function (m) { return m.code === s.code && m.from === 'student' && !(m.seenTeacher === true || m.seenTeacher === 'TRUE'); }).length;
    return { code: s.code, name: s.name, grade: s.grade, created: s.created, lastSeen: s.lastSeen, daysWeb: s.daysWeb, daysPaper: s.daysPaper, webAcc: s.webAcc, retryAcc: s.retryAcc,
      mastered: s.mastered, eff: s.eff, entryLevel: s.entryLevel, finalLevel: s.finalLevel, planMin: s.planMin, planDpw: s.planDpw, paperAvg: s.paperAvg,
      uploads: mine.length, errors: mine.filter(function (u) { return u.status === 'error'; }).length, unread: unread };
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
  return { ok: true, student: { code: st.code, name: st.name, grade: st.grade, created: st.created, lastSeen: st.lastSeen, paperAvg: st.paperAvg }, summary: parse_(st.summary, null), uploads: ups, messages: outMsgs };
}

function tAdd_(name, grade) {
  name = clip_(String(name || '').trim(), 80);
  if (!name) throw new Error('no_name');
  return withLock_(function () {
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code;
    do { code = ''; for (var i = 0; i < 6; i++) code += abc.charAt(Math.floor(Math.random() * abc.length)); } while (find_('students', 'code', code));
    insert_('students', { code: code, name: name, grade: Number(grade) || '', created: now_() });
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

function tRegrade_(uploadId) { var g = gradeUpload_(uploadId); return { ok: true, score: g.score, total: g.total }; }

function tImage_(fileId) {
  var ok = rows_('uploads').some(function (r) { return String(r.fileIds).split(',').indexOf(String(fileId)) >= 0; });
  if (!ok) throw new Error('not_found');
  var b = DriveApp.getFileById(fileId).getBlob();
  return { ok: true, mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
}
