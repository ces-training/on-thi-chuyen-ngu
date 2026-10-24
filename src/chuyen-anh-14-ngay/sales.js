/* ----- phễu bán hàng trên trang học sinh (phương án "hai làn theo điểm lead", chốt 23/10/2026) -----
   Chèn vào template.html bởi build.py, sau report.js. Dùng: S, save, saveLocal, $, esc, M, go, views, VIEW, api, API, PREVIEW, cloudOn, doSync,
   courseInputs, courseCalc, PHASES, fmtD, placement, LEVELS, lvName, schoolP, schoolInputs, regionOpts, evalOption, portfolio, REG, gradeNow, hungFig.
   - cổng sau bài đầu vào: bố mẹ để lại Zalo → nhận bản phác lộ trình + khả năng đỗ, máy tự cấp mã học sinh
   - nút "Đặt 15 phút với cô" (mọi nơi) và "Hỏi cô về lộ trình này" (tab Lộ trình, Sau 14 ngày, Chọn trường)
   - trang Gói học (?v=goi): Gói Web theo giai đoạn (giá công khai), Gói Quản gia (học phí đề xuất sau bước đánh giá)
   - thẻ giới thiệu khi đầu ra tăng; tín hiệu ý định gửi về máy chủ (không hiện điểm lead cho bố mẹ, con) */
const QG_URL='https://quangiahoctap.ducanh-2692yb.chatgpt.site/';
const GD_PRICE={1:790000,2:1190000,3:1590000,4:2190000};
const vnd=n=>Number(n||0).toLocaleString('vi-VN')+'đ';
/* chỉ bật khi máy chủ đã có phễu bán hàng (hành động prices trả về bảng giá Gói Web); máy chủ cũ thì ẩn hết form để bố mẹ không gặp lỗi */
let SALES_READY=(()=>{try{return sessionStorage.getItem('ces_sales')==='1'}catch(e){return false}})();
const SALES_ON=()=>!!API&&!PREVIEW&&SALES_READY;
if(API&&!PREVIEW&&!SALES_READY)setTimeout(()=>{api('prices').then(r=>{if(r&&r.web){SALES_READY=true;CAPACITY=r.capacity||null;try{sessionStorage.setItem('ces_sales','1')}catch(e){}
  if(ASK_VIEWS[VIEW]){const sec=M().querySelector('section.view');if(sec&&!sec.querySelector('.sl-ask'))sec.insertAdjacentHTML('beforeend',askCardHTML(VIEW))}
  else if(['start','goi','report','days'].includes(VIEW)||(VIEW==='diag'&&S.diag))go(VIEW)}}).catch(()=>{})},0);
Object.assign(ERR_VI,{missing_phone:'Cô chú để lại số Zalo giúp cháu nhé ạ (9–11 chữ số).',bad_pack:'Cô chú chọn lại gói giúp cháu nhé ạ.'});

/* nguồn khách: lưu một lần ở lần mở đầu tiên (utm_source / utm_medium / utm_campaign, ?ref=mã giới thiệu, trang dẫn tới) */
function srcInfo(){try{return JSON.parse(localStorage.getItem('ces_src')||'null')||{}}catch(e){return {}}}
(function(){if(PREVIEW)return;try{const u=new URLSearchParams(location.search),ref=(u.get('ref')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);
  const cur=localStorage.getItem('ces_src');
  if(!cur){const o={src:u.get('utm_source')||'',med:u.get('utm_medium')||'',camp:u.get('utm_campaign')||'',ref,at:Date.now()};
    try{if(!o.src&&document.referrer){const h=new URL(document.referrer).hostname;if(!/github\.io$/.test(h))o.src=h}}catch(e){}
    if(!o.src&&ref)o.src='giới thiệu';localStorage.setItem('ces_src',JSON.stringify(o))}
  else if(ref){const x=JSON.parse(cur);if(!x.ref){x.ref=ref;localStorage.setItem('ces_src',JSON.stringify(x))}}}catch(e){}})();
function srcPayload(){const s=srcInfo();return {src:{src:s.src||'',med:s.med||'',camp:s.camp||''},ref:s.ref||''}}
const hasFamily=()=>!!(S.leadAt||(S.student&&S.student.family));

/* tín hiệu ý định: mỗi loại gửi tối đa một lần mỗi lần mở trang (máy chủ còn chặn thêm 3 giờ) */
const SIG_SENT={};
function signal(kind){if(!cloudOn()||SIG_SENT[kind])return;SIG_SENT[kind]=1;api('signal',{code:S.code,kind}).catch(()=>{})}

/* ----- bản phác lộ trình và khả năng đỗ, gửi kèm lead để sale dán vào tin Zalo ----- */
function leadBrief(){if(!S.diag)return '';try{
  const o=courseInputs(),R=courseCalc(o),d=S.diag,L=LEVELS.find(l=>l.k===d.level),p=placement(d);
  const nm=S.name||'bạn ấy';
  let t=`• Bài đầu vào của ${nm}: ${d.total}/${d.of} câu, trình độ khoảng ${p?p.range:(L?L.name:d.level)}.`;
  t+=`\n• Đích đang chọn: ${o.goal.name} (cần khoảng ${lvName(o.targetH)}). Mốc chốt trường: ${R.g4.toLocaleDateString('vi-VN')}.`;
  if(R.phases.length)t+=`\n• Bản phác lộ trình với lịch ${o.min} phút × ${o.dpw} ngày/tuần: `+R.phases.map(ph=>`GĐ${ph.P.k} ${ph.P.name} ${fmtD(ph.s)}–${fmtD(ph.e)}`).join('; ')+`; sau mốc chốt là GĐ4 Luyện đề.`;
  t+=R.status==='good'?` Theo lịch này bạn ấy đạt mức cần của ${o.goal.name} trước mốc chốt trường.`:R.status==='warn'?` Theo lịch này bạn ấy đạt mức cần của ${o.goal.name} trước ngày thi nhưng chưa kịp mốc chốt trường.`:R.status==='bad'?` Để đạt mức cần của ${o.goal.name} trước mốc chốt trường, bạn ấy cần thêm giờ học có hướng dẫn${isFinite(R.req)?` (hoặc khoảng ${Math.ceil(R.req/5)*5} phút tự học/ngày)`:''}.`:' Trình độ hiện tại đã đạt mức cần của đích.';
  try{schoolP();S.school.grade=o.grade;const I=schoolInputs();const rows=regionOpts().filter(x=>S.school.langs.includes(x.lang)&&x.cut&&x.cut.length).map(x=>evalOption(x,I)).sort((a,b)=>b.p-a.p);const PF=portfolio(rows,I,S.school.langs);
    const pc=x=>x>=0.95?'trên 95%':x<=0.05?'dưới 5%':'khoảng '+Math.round(x*100)+'%';
    const gr=rows.filter(r=>r.o.lang==='Anh'&&(String(r.o.school).includes(o.goal.name)||String(o.goal.name).includes(String(r.o.school))))[0];
    if(gr)t+=`\n• Khả năng đỗ ${gr.o.school} (${gr.o.cls}) nếu giữ lịch hiện tại đến ngày thi: ${pc(gr.p)}.`;
    if(PF.chosen.length)t+=`\n• Nếu đăng ký theo gợi ý (${PF.chosen.map(e=>e.picks.map(r=>r.o.school).join(', ')).join('; ')}), khả năng đỗ ít nhất một lớp chuyên Anh ở ${REG().name}: ${pc(PF.pAny)}${I.toanSet&&I.vanSet?'':'; Toán, Văn đang để áng chừng'}.`}catch(e){}
  t+='\n• Đây là ước lượng từ một bài kiểm tra; sau 3 buổi học, lộ trình tự chỉnh theo tốc độ thật của bạn ấy.';return t}catch(e){return ''}}

/* điểm gần đúng chỉ để chọn nút nào nổi bật hơn (điểm thật tính ở máy chủ, không hiện cho bố mẹ, con) */
function localLeadScore(){const A=agg(),g=gradeNow();const dw=Object.values(S.days).filter(r=>r&&r.web).length;
  let s=(g===7||g===8?10:5)+10+(S.diag?5:0)+(dw>=3?10:0)+(dw>=7?10:0)+(S.final?5:0);try{const R=rhythm(A);if(R.state==='regular')s+=10}catch(e){}return s}

/* ----- form lấy thông tin phụ huynh (cô chốt 24/10/2026): hiện ở 2 chỗ
   1) ngay sau kết quả bài đầu vào   2) khi bấm vào bài tập chi tiết của chương trình 14 buổi mà chưa có mã
   Gửi form KHÔNG cấp mã ngay: sale nhắn Zalo gửi kết quả + chương trình học thử 14 ngày, xác nhận nhu cầu của con rồi mới gửi mã vào lớp. ----- */
const CONSENT_TXT='Tôi đồng ý cho CES (Học viện Đa ngữ Anh–Trung) lưu thông tin trên để gửi kết quả, cấp mã học sinh và liên hệ tư vấn học tập cho con qua Zalo. Thông tin được giữ đến hết kỳ thi vào lớp 10 của con; tôi có thể yêu cầu sửa hoặc xoá bất cứ lúc nào bằng cách nhắn cô.';
const CODE_GATE=()=>SALES_ON()&&!S.code&&!pvOpen();
function leadFieldsHTML(p){return `<div class="grid2"><label>Tên học sinh *<br><input id="${p}Child" value="${esc(S.name||'')}" autocomplete="off" style="width:100%"></label>
    <label>Tên bố hoặc mẹ *<br><input id="${p}Parent" autocomplete="name" placeholder="Ví dụ: Nguyễn Thị Lan" style="width:100%"></label>
    <label>Số điện thoại có Zalo *<br><input id="${p}Phone" type="tel" inputmode="tel" autocomplete="tel" style="width:100%"></label></div>
   <input type="text" id="${p}Web" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
   <label class="key-item"><input type="checkbox" id="${p}Consent"><span class="small">${CONSENT_TXT}</span></label>
   <div class="row"><button class="btn hi" type="submit" id="${p}Send">Gửi thông tin cho cô</button><span class="small" id="${p}Msg"></span></div>
   <p class="small muted">Chưa cần chuyển khoản gì. Số Zalo chỉ cô ở CES xem được.</p>`}
async function submitLead(p){const msg=$('#'+p+'Msg'),b=$('#'+p+'Send');
  const child=$('#'+p+'Child').value.trim(),parent=$('#'+p+'Parent').value.trim();
  if(!child||!parent){msg.textContent='Cô chú điền giúp cháu tên học sinh và tên bố hoặc mẹ nhé ạ.';return false}
  if(!$('#'+p+'Consent').checked){msg.textContent=ERR_VI.need_consent;return false}
  b.disabled=true;msg.textContent='Đang gửi…';
  try{const r=await api('lead',Object.assign({website:$('#'+p+'Web').value,code:S.code||'',phone:$('#'+p+'Phone').value,parent,child,grade:gradeNow(),
      school:(()=>{try{return goalPick(S.course&&S.course.goal).name}catch(e){return ''}})(),goal:(S.course&&S.course.goal)||'',region:(()=>{try{return REG().name}catch(e){return ''}})(),consent:true,brief:leadBrief()},srcPayload()));
    S.leadAt=Date.now();if(!S.name)S.name=child;if(r.code&&!S.code){S.code=r.code;S.student={code:r.code,name:child,family:true}}else if(S.student)S.student.family=true;
    save();if(S.code&&typeof doSync==='function')doSync();return true}
  catch(err){msg.textContent=ERR_VI[err.code]||errVi(err);b.disabled=false;return false}}
/* ô nhập mã khi bố mẹ đã nhận mã từ cô qua Zalo */
function codeEntryHTML(p){return `<div class="row"><input type="text" id="${p}Code" maxlength="10" placeholder="Mã cô gửi, ví dụ K7M2QX" autocomplete="off" style="max-width:220px;text-transform:uppercase"><button class="btn hi" type="button" id="${p}Go">Vào lớp</button><span class="small" id="${p}CMsg"></span></div>`}
function wireCodeEntry(p,after){const b=$('#'+p+'Go');if(!b)return;b.onclick=async()=>{const code=$('#'+p+'Code').value.trim().toUpperCase(),m=$('#'+p+'CMsg');if(!code){m.textContent='Cậu nhập mã nhé.';return}
  b.disabled=true;m.textContent='Đang kiểm tra mã…';
  try{const r=await api('login',{code});const srv=r.state;if(srv&&(srv.savedAt||0)>(S.savedAt||0)){const keep={region:S.region,regionSet:S.regionSet,gradeSet:S.gradeSet};S=Object.assign(blank(),srv,keep)}
    S.code=r.student.code;S.student=r.student;if(!S.name)S.name=r.student.name||'';save();if(typeof doSync==='function')doSync();(after||(()=>go(VIEW)))()}
  catch(e){m.textContent=errVi(e);b.disabled=false}}}
const WAIT_TXT=()=>`Cô ở CES sẽ nhắn Zalo cho bố mẹ cậu trong khoảng 1 giờ (8:00–21:00; gửi sau 21:00 thì sáng hôm sau trước 9:00) để gửi kết quả bài đầu vào và chương trình học thử 14 ngày. Trao đổi xong về nhu cầu của cậu, cô gửi <b>mã vào lớp</b>. Nhận được mã thì nhập vào đây:`;
function leadCardHTML(){
  if(!SALES_ON()||!S.diag||S.code)return '';
  if(hasFamily())return `<div class="card hi-card sl-ok"><h3>Cô đã nhận thông tin của bố mẹ cậu</h3><p class="small">${WAIT_TXT()}</p>${codeEntryHTML('dc')}</div>`;
  return `<form class="card hi-card sl-lead" id="leadForm" autocomplete="on"><div class="sl-head">${hungFig('sm')}<div><p class="eyebrow">Dành cho bố mẹ</p><h3>Nhận kết quả bài đầu vào và chương trình học thử 14 ngày</h3>
   <p class="small">Cháu là Hùng ạ. Cô chú để lại thông tin, cô ở CES nhắn Zalo gửi kết quả bài đầu vào, bản phác lộ trình và chương trình học thử 14 ngày, để cả nhà cùng xem con đường chuyên ngữ có phù hợp với bạn nhà mình không ạ.</p></div></div>
   ${leadFieldsHTML('ld')}</form>`}
function wireLead(after){const done=after||(()=>go(VIEW));wireCodeEntry('dc',done);const f=$('#leadForm');if(!f)return;f.onsubmit=async e=>{e.preventDefault();if(await submitLead('ld'))done()}}
/* cửa sổ khi bấm vào bài tập chi tiết của 14 buổi mà chưa có mã */
function openLeadDlg(n){
  let d=document.getElementById('leadDlg');if(d)d.remove();
  d=document.createElement('div');d.id='leadDlg';d.className='gate';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  const head=`<div class="gate-top">${hungFig()}<div><p class="eyebrow">${n?'Buổi '+n+' · ':''}Học thử 14 ngày</p><h2>${hasFamily()?'Nhập mã vào lớp':'Để cô cấp mã vào lớp'}</h2></div></div>`;
  d.innerHTML=hasFamily()?`<div class="gate-card paper tape">${head}<p class="small">${WAIT_TXT()}</p>${codeEntryHTML('lc')}<div class="row"><button class="btn ghost" type="button" id="lmX">Xem tiếp nội dung</button></div></div>`
    :`<form class="gate-card paper tape" id="lmForm">${head}<p class="small">Bài tập chi tiết (video, game, bài dạng đề, bài giấy có máy chấm, kiểm tra cuối buổi) mở khi có mã vào lớp. Cô chú để lại thông tin, giáo viên ở CES liên hệ qua Zalo, trao đổi nhu cầu của bạn nhà mình rồi cấp mã ạ.</p>${leadFieldsHTML('lm')}<div class="row"><button class="btn ghost" type="button" id="lmX">Xem tiếp nội dung</button></div></form>`;
  document.body.appendChild(d);
  const close=()=>d.remove();$('#lmX').onclick=close;d.addEventListener('click',e=>{if(e.target===d)close()});
  wireCodeEntry('lc',()=>{close();CUR_DAY=null;go('days',{day:nextDay()})});
  const f=$('#lmForm');if(f)f.onsubmit=async e=>{e.preventDefault();if(await submitLead('lm')){close();openLeadDlg(n)}};
  try{(hasFamily()?$('#lcCode'):$('#lmChild')).focus()}catch(e){}
}
/* xem trước nội dung một buổi khi chưa có mã: chủ đề, mục tiêu, từ, cụm động từ, ngữ pháp, sẽ làm được gì; bài tập khoá */
function dayDemoHTML(n){const D=DAYS[n-1];
  const vb=(D.vocab||[]).map(v=>`<li><b>${esc(v.word)}</b> <span class="small muted">${esc(v.pos||'')}</span> · ${esc(v.meaning_vi||'')}</li>`).join('');
  const ph=(D.phrasal||[]).map(v=>`<li><b>${esc(v.phrase)}</b> · ${esc(v.meaning_vi||'')}</li>`).join('');
  const cd=(D.can_do_vi||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  return `<div class="card"><div class="dayhead">${dayIcon(n,'dh-ic',80)}<div class="dh-t"><p class="eyebrow">Buổi ${String(n).padStart(2,'0')}/14${D.type==='review'?' · Ôn tập':''} · xem trước</p><h2>${esc(D.theme_vi)}</h2></div></div>
    <p>${esc(D.goal_vi||'')}</p>
    ${D.grammar?`<p><b>Ngữ pháp:</b> ${esc(D.grammar.title||'')}</p>`:''}
    ${vb?`<div class="grid2"><div><h3>8 từ mới</h3><ul class="small">${vb}</ul></div>${ph?`<div><h3>Cụm động từ</h3><ul class="small">${ph}</ul></div>`:''}</div>`:''}
    ${cd?`<h3>Học xong buổi này cậu sẽ</h3><ul class="small">${cd}</ul>`:''}</div>
   <div class="card lockbox">${doodle('lock','lk',56)}<div><p class="eyebrow">Bài tập chi tiết</p><h3>Mở khi có mã vào lớp</h3>
    <p class="small">Mỗi buổi khoảng 40 phút: video ngữ pháp, 3 game ôn từ, bài dạng đề thi và luyện nghe, bài giấy in ra làm (chụp ảnh gửi lên là máy chấm), kiểm tra nhanh cuối buổi. ${hasFamily()?'Cô đã nhận thông tin của bố mẹ cậu; nhận được mã thì nhập ở đây.':'Bố mẹ cậu điền thông tin, giáo viên ở CES liên hệ qua Zalo để cấp mã.'}</p>
    <div class="row"><button class="btn hi" type="button" data-leaddlg="${n}">${hasFamily()?'Nhập mã vào lớp':'Điền thông tin để cô cấp mã'}</button></div></div></div>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-leaddlg]');if(b){e.preventDefault();openLeadDlg(+b.dataset.leaddlg||0)}});

/* ----- thông điệp xuyên suốt: ôn từ sớm (lớp 6, 7) để lớp 8, 9 khỏi chạy nước rút ----- */
function earlyMsgHTML(){const g=gradeNow(),early=S.gradeEarly;
  const head=early||g<=6?'Cậu đang ở thời điểm đẹp nhất để bắt đầu':g===7?'Lớp 7: bắt đầu bây giờ là vừa đẹp':g===8?'Lớp 8: bắt đầu đều từ hôm nay':'Lớp 9: chặng nước rút, đi cho đúng hướng';
  const kid=early||g<=7?'Mỗi ngày 30–40 phút từ lớp 6, 7 là đủ để xây nền chắc. Lên lớp 9 cậu chỉ còn luyện đề, khỏi phải chạy nước rút.':g===8?'Còn hơn một năm học, mỗi ngày đều đặn một buổi là cậu có nền B1–B2 trước mốc chốt trường, sang lớp 9 nhẹ đầu hơn nhiều.':'Bài đầu vào cho tớ biết nền của cậu đang ở đâu, để dồn sức đúng chỗ trong những tháng còn lại.';
  return `<div class="card sl-early"><div class="sl-head">${hungFig('sm')}<div><p class="eyebrow">Ôn sớm, đỡ chạy nước rút</p><h3>${esc(head)}</h3><p class="small">${esc(kid)}</p>
    <p class="small muted"><b>Dành cho bố mẹ:</b> đề chuyên ngữ đòi nền từ vựng, ngữ pháp tích luỹ nhiều năm. Ôn từ lớp 6, 7 thì lớp 8, 9 đỡ phải chạy nước rút; với bạn nền tảng còn mỏng, chỉ nước rút trong năm lớp 9 thường ít cơ hội đỗ lớp chuyên ngữ. Bài kiểm tra đầu vào giúp cả nhà biết con đường chuyên ngữ có phù hợp với con không, và nên bắt đầu từ đâu.</p></div></div></div>`}

/* ----- đặt 15 phút với cô (cửa sổ nhỏ, dùng chung mọi nơi) ----- */
function askBtn(label,about,cls){return `<button type="button" class="btn ${cls||'hi'}" data-askco="${esc(about||'')}">${esc(label||'Đặt 15 phút với cô')}</button>`}
function openAsk(about){
  if(!SALES_ON()){go('share');return}
  let d=document.getElementById('askDlg');if(d)d.remove();
  d=document.createElement('div');d.id='askDlg';d.className='gate';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  const need=!hasFamily();
  d.innerHTML=`<form class="gate-card paper tape" id="askForm"><div class="gate-top">${hungFig()}<div><p class="eyebrow">Nói chuyện với cô</p><h2>Đặt 15 phút với cô</h2></div></div>
   <p class="small">Cô xem dữ liệu học của ${esc(S.name||'bạn nhà mình')} rồi nói chuyện với cô chú khoảng 15–20 phút: bạn ấy đang ở đâu, cần gì để kịp mốc chốt trường, và nên học tiếp thế nào. Cô ở CES gọi xác nhận giờ trong khoảng 1 giờ (8:00–21:00).</p>
   ${need?`<div class="grid2"><label>Số Zalo của bố hoặc mẹ *<br><input id="akPhone" type="tel" inputmode="tel" autocomplete="tel" style="width:100%"></label><label>Cô chú xưng hô là<br><input id="akParent" autocomplete="name" style="width:100%"></label></div>`:''}
   <label>Giờ cô chú tiện nghe máy<br><input id="akWhen" placeholder="Ví dụ: tối thứ 3 sau 20:00, hoặc sáng chủ nhật" style="width:100%"></label>
   <label>Cô chú muốn hỏi gì (không bắt buộc)<br><textarea id="akNote" rows="2" style="width:100%">${esc(about?'Về '+about+'. ':'')}</textarea></label>
   ${need?`<label class="key-item"><input type="checkbox" id="akConsent"><span class="small">${CONSENT_TXT}</span></label>`:''}
   <input type="text" id="akWeb" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
   <div class="row"><button class="btn hi" type="submit" id="akSend">Gửi cho cô</button><button class="btn ghost" type="button" id="akX">Để sau</button><span class="small" id="akMsg"></span></div></form>`;
  document.body.appendChild(d);
  const close=()=>d.remove();$('#akX').onclick=close;d.addEventListener('click',e=>{if(e.target===d)close()});
  $('#askForm').onsubmit=async e=>{e.preventDefault();const msg=$('#akMsg'),b=$('#akSend');
    if(need&&!$('#akConsent').checked){msg.textContent=ERR_VI.need_consent;return}
    b.disabled=true;msg.textContent='Đang gửi…';
    try{const r=await api('consult',Object.assign({website:$('#akWeb').value,code:S.code||'',about:about||'',when:$('#akWhen').value,note:$('#akNote').value,
        phone:need?$('#akPhone').value:'',parent:need?$('#akParent').value:'',consent:need?true:undefined,child:S.name||'',grade:gradeNow(),brief:leadBrief()},srcPayload()));
      S.askAt=Date.now();if(need)S.leadAt=Date.now();if(r.code&&!S.code){S.code=r.code;S.student={code:r.code,name:S.name||'',family:true}}else if(S.student)S.student.family=true;
      save();if(typeof doSync==='function')doSync();
      $('#askForm').innerHTML=`<div class="gate-top">${hungFig()}<div><p class="eyebrow">Đã gửi</p><h2>Cô nhận được rồi ạ!</h2></div></div><p>Cô ở CES gọi hoặc nhắn Zalo để chốt giờ với cô chú trong khoảng 1 giờ (8:00–21:00; gửi sau 21:00 thì sáng mai trước 9:00).</p><div class="row"><button class="btn hi" type="button" id="akOk">Đóng</button></div>`;
      $('#akOk').onclick=close}
    catch(err){msg.textContent=ERR_VI[err.code]||errVi(err);b.disabled=false}};
  try{(need?$('#akPhone'):$('#akWhen')).focus()}catch(e){}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-askco]');if(b){e.preventDefault();openAsk(b.dataset.askco)}
  const g=e.target.closest&&e.target.closest('[data-gogoi]');if(g){e.preventDefault();go('goi')}});

/* ----- nút "Hỏi cô về lộ trình này" cuối tab Lộ trình, Sau 14 ngày, Chọn trường (tab vẽ lại thì gắn lại) ----- */
const ASK_VIEWS={plan:'lộ trình và khả năng kịp mốc',course:'lộ trình sau 14 ngày',school:'chọn trường và nguyện vọng'};
function askCardHTML(k){return `<div class="card sl-ask">${hungFig('sm')}<div><h3>Muốn cô nói kỹ hơn về phần này?</h3><p class="small">Mọi con số ở đây là ước lượng. Cô xem dữ liệu học thật của cậu rồi nói chuyện 15 phút với bố mẹ cậu về ${esc(ASK_VIEWS[k])}.</p>
  <div class="row">${askBtn('Hỏi cô về lộ trình này',ASK_VIEWS[k])}<button type="button" class="btn ghost" data-gogoi="1">Xem gói học sau 14 buổi</button></div></div></div>`}
try{new MutationObserver(()=>{if(!SALES_ON()||!ASK_VIEWS[VIEW])return;const sec=M().querySelector('section.view');if(!sec||sec.querySelector('.sl-ask'))return;sec.insertAdjacentHTML('beforeend',askCardHTML(VIEW))}).observe(M(),{childList:true})}catch(e){}

/* ----- thẻ trên Trang chủ: cổng bản phác, báo cáo giữa kỳ (buổi 7), sau 14 buổi, giới thiệu ----- */
function homeSalesHTML(){
  if(!SALES_ON()||!S.diag)return '';
  const dw=Object.values(S.days).filter(r=>r&&r.web).length;let h='';
  if(!S.code)h+=hasFamily()?`<div class="card hi-card"><h3>Chờ mã vào lớp từ cô</h3><p class="small">${WAIT_TXT()}</p>${codeEntryHTML('hc')}</div>`
    :`<div class="card hi-card"><h3>Nhận kết quả và chương trình học thử 14 ngày</h3><p class="small">Bố mẹ cậu để lại tên và số Zalo, cô ở CES gửi kết quả bài đầu vào và chương trình học thử 14 ngày, rồi cấp mã vào lớp.</p><button class="btn hi" type="button" id="toLead">Mở form cho bố mẹ</button></div>`;
  const book=localLeadScore()>=60;
  if(S.final||dw>=14)h+=`<div class="card"><h3>Xong 14 buổi rồi!</h3><p class="small">Báo cáo thử 14 buổi đã đủ để cô tư vấn: nền tảng, khả năng học, khả năng đỗ và lộ trình nếu theo. Bố mẹ cậu đặt 15 phút với cô, hoặc xem luôn gói học hợp với cậu.</p>
     <div class="row">${book?askBtn('Đặt 15 phút với cô','báo cáo 14 buổi'):'<button type="button" class="btn hi" data-gogoi="1">Xem gói hợp với cậu</button>'}${book?'<button type="button" class="btn ghost" data-gogoi="1">Xem gói hợp với cậu</button>':askBtn('Đặt 15 phút với cô','báo cáo 14 buổi','ghost')}<button class="btn ghost" type="button" data-gorep="1">Xem báo cáo</button></div></div>`;
  else if(dw>=7)h+=`<div class="card"><h3>Báo cáo giữa kỳ: cậu đã đi nửa chặng</h3><p class="small">7/14 buổi rồi. Báo cáo đã có độ đúng, độ nhớ và nhịp học thật của cậu. Bố mẹ muốn nghe cô nhận xét thì đặt 15 phút nói chuyện với cô.</p>
     <div class="row"><button class="btn hi" type="button" data-gorep="1">Xem báo cáo giữa kỳ</button>${askBtn('Đặt 15 phút với cô','báo cáo giữa kỳ','ghost')}</div></div>`;
  h+=referralHTML();return h}
function wireHomeSales(){const t=$('#toLead');if(t)t.onclick=()=>go('diag');wireCodeEntry('hc',()=>go('start'));wireReferral()}

/* ----- giới thiệu: chỉ hiện khi đầu ra tăng, cần con và bố mẹ đồng ý chia sẻ; không ghi họ tên đầy đủ ----- */
function referralHTML(){if(!S.code||!S.final||!S.diag||S.final.total<=S.diag.total)return '';
  const up=S.final.total-S.diag.total;
  return `<div class="card sl-ref"><h3>Chia sẻ thành tích, rủ bạn cùng ôn</h3><p class="small">Sau 14 buổi cậu đúng thêm ${up} câu so với bài đầu vào. Khi một gia đình bắt đầu học qua đường dẫn của cậu, cả hai nhà được tặng thêm một chặng 14 buổi.</p>
   <label class="key-item"><input type="checkbox" id="rfOk"><span class="small">Con và bố mẹ đồng ý chia sẻ đường dẫn này (chỉ có tên gọi, không có họ tên đầy đủ).</span></label>
   <label class="key-item"><input type="checkbox" id="rfScore"><span class="small">Kèm số câu tăng thêm (+${up} câu).</span></label>
   <div class="row" id="rfBox" hidden><input type="text" id="rfTxt" readonly style="flex:1;min-width:220px"><button class="btn" type="button" id="rfCp">Sao chép</button><span class="small" id="rfMsg"></span></div></div>`}
function wireReferral(){const ok=$('#rfOk');if(!ok)return;const draw=()=>{$('#rfBox').hidden=!ok.checked;const up=S.final.total-S.diag.total;
    $('#rfTxt').value=`${S.name?S.name.split(' ').pop()+' ':''}vừa xong 14 buổi Chuyên Anh${$('#rfScore').checked?` (+${up} câu sau 14 buổi)`:''}. Ôn thi chuyên Anh cùng mình nhé: ${location.origin}${location.pathname}?ref=${S.code}`};
  ok.onchange=draw;$('#rfScore').onchange=draw;$('#rfCp').onclick=async()=>{try{await navigator.clipboard.writeText($('#rfTxt').value);$('#rfMsg').textContent='Đã sao chép.'}catch(e){$('#rfTxt').select();$('#rfMsg').textContent='Đã bôi đen, cậu bấm sao chép nhé.'}}}

/* ----- trang Gói học ----- */
let CAPACITY=null;
function recoFor(){if(!S.diag)return null;try{const o=courseInputs(),R=courseCalc(o),P=o.prof;
  const start=R.phases.length?R.phases[0].P.k:4;
  const why=[];if(R.status==='warn'||R.status==='bad')why.push(R.status==='bad'?'theo lịch hiện tại bạn ấy chưa kịp ngày thi':'theo lịch hiện tại bạn ấy kịp ngày thi nhưng chưa kịp mốc chốt trường');
  if(P.stage==='live'&&P.pace==='careful')why.push('3 buổi gần nhất bạn ấy cần thêm thời gian ôn lại câu sai');
  if(P.stage==='live'&&P.habit==='patchy')why.push('nhịp học chưa đều');
  return {start,R,o,qg:why.length>0,why}}catch(e){return null}}
function vGoi(){
  signal('pkg');
  const rc=recoFor(),start=rc?rc.start:1;
  const ph=[...PHASES,{k:4,name:'Luyện đề',band:'đến ngày thi',blurb:'Sau mốc chốt trường: luyện đề sát cấu trúc đề của sở, thi thử chốt trường, chữa từng bài. Không học chủ điểm mới.'}];
  const est=k=>{if(!rc)return '';const x=rc.R.phases.find(p=>p.P.k===k);return x?`dự kiến ${fmtD(x.s)}–${fmtD(x.e)} với lịch hiện tại`:k===4?`từ mốc chốt ${rc.R.g4.toLocaleDateString('vi-VN')} đến ngày thi`:''};
  const reco=rc?(rc.qg?`<div class="card sl-reco"><p class="eyebrow">Đề xuất cho ${esc(S.name||'bạn nhà mình')}</p><h3>Gói Quản gia học tập</h3><p class="small">Vì ${esc(rc.why.join(', '))}. Một cô theo sát hằng tuần sẽ chỉnh lộ trình sớm, trước khi lỗ hổng lộ ra ở kỳ thi thử.</p><div class="row">${askBtn('Đặt 15 phút với cô','Gói Quản gia')}</div></div>`
      :`<div class="card sl-reco"><p class="eyebrow">Đề xuất cho ${esc(S.name||'bạn nhà mình')}</p><h3>Gói Web · GĐ${start} ${esc(ph[start-1].name)}</h3><p class="small">Với lịch tự học hiện tại (${S.plan.min} phút × ${S.plan.dpw} ngày/tuần) bạn ấy đang kịp mốc chốt trường, nên tự học với web là đủ. Theo bài ${S.final?'đầu ra':'đầu vào'}, bạn ấy bắt đầu từ giai đoạn ${start}.</p><div class="row"><a class="btn hi" href="#pkgForm" data-pk="gd${start}">Đăng ký GĐ${start}</a></div></div>`)
    :`<div class="card"><h3>Làm bài đầu vào để web đề xuất gói hợp với con</h3><p class="small">45 câu, khoảng 35 phút, miễn phí. Có kết quả, trang này tự chọn giai đoạn bắt đầu và cách học phù hợp.</p><button class="btn hi" type="button" id="gDiag">Làm bài đầu vào</button></div>`;
  const cap=CAPACITY&&CAPACITY.total>0?`<p class="small"><b>Còn ${CAPACITY.left} chỗ</b> Quản gia (mỗi cô theo sát tối đa 15 học viên).</p>`:'';
  M().innerHTML=`<section class="view sl-goi"><div><p class="eyebrow">Dành cho bố mẹ</p><h2>Gói học sau 14 buổi</h2>
   <div class="hung-say">${hungFig('sm')}<p>Cháu là Hùng ạ. 14 buổi chẩn đoán chính là bước <b>Đánh giá</b> của Quản gia học tập: cô chú đã thấy hệ thống đo được những gì về bạn nhà mình. Sau 14 buổi, bạn ấy đi tiếp theo một trong hai cách dưới đây. Mọi gói đều tính theo lộ trình riêng của bạn ấy, không phải số buổi đứng lớp.</p></div></div>
   ${reco}
   <div class="grid2 sl-two">
    <div class="card"><p class="eyebrow">Tự học với web</p><h3>Gói Web</h3><p class="small">Quyền học trọn một giai đoạn (nhiều chặng 14 buổi) theo lộ trình, máy chấm bài giấy, nhận xét chi tiết bài viết theo tiêu chí đề chuyên, báo cáo tự động hằng tháng. Hùng nhắc nhịp, lộ trình tự đổi tuyến theo kết quả.</p>
     <div class="sl-phs">${ph.map(p=>`<div class="sl-ph ${p.k<start?'sl-past':p.k===start?'sl-here':''}"><div class="sl-ph-t"><b>GĐ${p.k} ${esc(p.name)}</b> <span class="small muted">${esc(p.band)}</span>${p.k===start?' <span class="pill">bạn ấy bắt đầu từ đây</span>':''}<br><span class="small">${esc(p.blurb)}</span>${est(p.k)?`<br><span class="small muted">${esc(est(p.k))}</span>`:''}${p.k<start?'<br><span class="small muted">Bài kiểm tra cho thấy bạn ấy đã qua giai đoạn này.</span>':''}</div><b class="sl-price">${vnd(GD_PRICE[p.k])}</b></div>`).join('')}</div></div>
    <div class="card"><p class="eyebrow">Có cô theo sát</p><h3>Gói Quản gia học tập</h3><p class="small">Gói Web cộng một cô chịu trách nhiệm cho bạn ấy theo mô hình 3T của CES: <b>tổ chức nguồn lực</b> (web, lớp học trực tiếp gần nhà, luyện đề, giáo viên nước ngoài khi cần), <b>theo sát cá nhân</b> (xem tiến độ hằng tuần, chấm bài viết, tin Zalo mỗi tuần cho bố mẹ, gọi mỗi tháng), <b>test sớm, điều chỉnh sớm</b> (bài kiểm tra cửa giai đoạn, đổi nội dung hoặc tốc độ ngay khi số liệu đi xuống).</p>
     <p><b>Học phí:</b> đề xuất rõ ràng sau buổi đánh giá 15–20 phút với cô, theo mục tiêu, thời gian còn lại và nguồn lực cần tổ chức.</p>${cap}
     <div class="row">${askBtn('Đặt 15 phút với cô','Gói Quản gia')}<a class="btn ghost" href="${QG_URL}" target="_blank" rel="noopener">Xem trang Quản gia học tập</a></div></div></div>
   <div class="card"><h3>So sánh hai gói</h3><div class="tbl-wrap"><table><thead><tr><th>Thành phần</th><th>Gói Web</th><th>Gói Quản gia</th></tr></thead><tbody>
    <tr><td>Đánh giá đầu vào và 14 buổi chẩn đoán</td><td>Có</td><td>Có</td></tr>
    <tr><td>Thiết kế lộ trình</td><td>Lộ trình chuẩn, tự đổi tuyến theo kết quả</td><td>Cô thiết kế riêng</td></tr>
    <tr><td>Học liệu và công nghệ</td><td>Có</td><td>Có</td></tr>
    <tr><td>Kiểm tra cuối buổi, bài kiểm tra cửa giai đoạn</td><td>Có, máy chấm</td><td>Có, cô xem lại</td></tr>
    <tr><td>Theo sát</td><td>Hùng nhắc nhịp, báo cáo tháng tự động</td><td>Cô theo sát (tối đa 15 học viên), tin tuần cho bố mẹ, gọi mỗi tháng</td></tr>
    <tr><td>Phân tích và điều chỉnh</td><td>Theo quy tắc tự động</td><td>Cô tìm nguyên nhân rồi điều chỉnh</td></tr>
    <tr><td>Lớp học trực tiếp gần nhà, giáo viên nước ngoài, trợ giảng, luyện đề</td><td>—</td><td>Tổ chức theo nhu cầu của bạn ấy</td></tr>
    <tr><td>Đồng hành ngoài giờ</td><td>—</td><td>Có</td></tr>
    <tr><td>Học phí</td><td>Công khai theo giai đoạn</td><td>Đề xuất rõ ràng sau bước đánh giá</td></tr></tbody></table></div></div>
   <div class="card"><h3>Quy tắc đăng ký Gói Web</h3><ul class="small">
    <li>Bắt đầu từ giai đoạn bài kiểm tra xếp bạn ấy vào; không phải mua giai đoạn đã vượt qua.</li>
    <li>Chặng củng cố (nếu bạn ấy cần thêm thời gian) đã nằm trong giá giai đoạn, không tính thêm.</li>
    <li>Trả một lần, hoặc chia hai lần (lần hai trước chặng giữa giai đoạn).</li>
    <li>Nâng lên Quản gia trong 30 ngày kể từ khi mua: trừ 100% tiền Gói Web vào học phí Quản gia; sau 30 ngày trừ phần chưa dùng.</li>
    <li>Khi còn 2 chặng nữa là tới bài kiểm tra cửa, cô gửi báo cáo giữa giai đoạn và mời đăng ký giai đoạn sau.</li></ul></div>
   ${pkgFormHTML(start)}
   <div class="card"><h3>Cô chú hay hỏi</h3>
    <details><summary><b>Quản gia khác gia sư 1–1 thế nào?</b></summary><p class="small">Gia sư là một người dạy. Quản gia là cả vòng đánh giá, lộ trình, theo sát, kiểm tra và điều chỉnh, có một cô chịu trách nhiệm cho kết quả của bạn ấy.</p></details>
    <details><summary><b>Học trực tiếp hay trực tuyến?</b></summary><p class="small">Gói Web học trực tuyến, làm bài giấy ở nhà. Quản gia kết hợp học trực tiếp tại địa điểm gần nhà của bạn ấy nhất, học trực tuyến và hỗ trợ ngoài giờ.</p></details>
    <details><summary><b>Học phí Quản gia tính thế nào?</b></summary><p class="small">Theo mục tiêu, thời gian còn lại đến mốc chốt trường và nguồn lực cần tổ chức. Cô đề xuất rõ ràng sau buổi đánh giá 15–20 phút.</p></details>
    <details><summary><b>Có cam kết đỗ không?</b></summary><p class="small">CES cam kết minh bạch mục tiêu, theo sát, đo lường và chủ động điều chỉnh; không cam kết đỗ. Mọi dự báo trên web là ước lượng để định hướng.</p></details>
    <details><summary><b>Nếu bạn ấy chưa tiến bộ như dự kiến?</b></summary><p class="small">Hệ thống tìm nguyên nhân trước (nhịp học, chủ điểm sai lặp lại, dạng bài yếu), rồi đổi nội dung, tốc độ hoặc nguồn lực. Với Gói Web, quy tắc tự động gợi ý; với Quản gia, cô phân tích và gọi bố mẹ.</p></details>
    <details><summary><b>Chuyển khoản thế nào?</b></summary><p class="small">Cô chú gửi form đăng ký, cô ở CES nhắn Zalo xác nhận ngày bắt đầu và gửi thông tin chuyển khoản. Tiền về là gói được kích hoạt vào mã học sinh của bạn ấy.</p></details></div></section>`;
  const gd=$('#gDiag');if(gd)gd.onclick=()=>go('diag');
  M().querySelectorAll('[data-pk]').forEach(a=>a.onclick=e=>{e.preventDefault();const r=M().querySelector(`input[name=pk][value="${a.dataset.pk}"]`);if(r)r.checked=true;$('#pkgForm').scrollIntoView({behavior:'smooth'})});
  wirePkgForm();
  if(!CAPACITY&&SALES_ON())api('prices').then(r=>{if(r.capacity){CAPACITY=r.capacity;if(VIEW==='goi')vGoi()}}).catch(()=>{});
}
function pkgFormHTML(start){
  if(!SALES_ON())return `<div class="card"><h3>Đăng ký</h3><p class="small muted">Form đăng ký mở khi trang nối máy chủ của CES.</p></div>`;
  if(S.pkgSentAt)return `<div class="notice">Cô chú đã gửi đăng ký lúc ${new Date(S.pkgSentAt).toLocaleString('vi-VN')}. Cô ở CES sẽ nhắn Zalo xác nhận ngày bắt đầu và gửi thông tin chuyển khoản; cô chú không cần gửi lại.</div>`;
  return `<form class="card" id="pkgForm" autocomplete="on"><h3>Đăng ký Gói Web</h3>
   ${[1,2,3,4].map(k=>`<label class="key-item"><input type="radio" name="pk" value="gd${k}" ${k===start?'checked':''} ${k<start?'disabled':''}><span>GĐ${k} · <b>${vnd(GD_PRICE[k])}</b>${k<start?' <span class="small muted">(đã qua)</span>':''}</span></label>`).join('')}
   <div class="row"><label class="small"><input type="radio" name="pay" value="1" checked> Trả một lần</label><label class="small"><input type="radio" name="pay" value="2"> Chia hai lần</label></div>
   <div class="grid2"><label>Họ tên phụ huynh *<br><input id="pkParent" autocomplete="name" style="width:100%"></label>
    <label>Số Zalo *<br><input id="pkPhone" type="tel" inputmode="tel" autocomplete="tel" style="width:100%"></label>
    <label>Email (không bắt buộc)<br><input id="pkEmail" type="email" autocomplete="email" style="width:100%"></label>
    <label>Tên gọi của con *<br><input id="pkChild" value="${esc(S.name||'')}" style="width:100%"></label>
    <label>Mã học sinh (nếu đã có)<br><input id="pkCode" value="${esc(S.code||'')}" maxlength="10" style="width:100%;text-transform:uppercase"></label>
    <label>Lớp<br><select id="pkGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${gradeNow()===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label></div>
   <label>Lời nhắn cho cô<br><textarea id="pkNote" rows="2" style="width:100%"></textarea></label>
   <input type="text" id="pkWeb" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
   <label class="key-item"><input type="checkbox" id="pkConsent"><span class="small">${CONSENT_TXT}</span></label>
   <div class="row"><button class="btn hi" type="submit" id="pkSend">Gửi đăng ký</button><span class="small" id="pkMsg"></span></div>
   <p class="small muted">Gửi form chưa phải trả tiền. Cô ở CES nhắn Zalo xác nhận ngày bắt đầu và gửi thông tin chuyển khoản trước.</p></form>`}
function wirePkgForm(){const f=$('#pkgForm');if(!f)return;
  f.onsubmit=async e=>{e.preventDefault();const b=$('#pkSend'),msg=$('#pkMsg');
    if(!$('#pkConsent').checked){msg.textContent=ERR_VI.need_consent;return}
    const pk=f.querySelector('input[name=pk]:checked');if(!pk){msg.textContent=ERR_VI.bad_pack;return}
    b.disabled=true;msg.textContent='Đang gửi…';
    try{const r=await api('pkg_order',Object.assign({website:$('#pkWeb').value,pack:pk.value,pay:f.querySelector('input[name=pay]:checked').value,parent:$('#pkParent').value,phone:$('#pkPhone').value,email:$('#pkEmail').value,
        child:$('#pkChild').value,code:$('#pkCode').value.trim().toUpperCase(),grade:+$('#pkGrade').value,note:$('#pkNote').value,consent:true,brief:leadBrief(),region:(()=>{try{return REG().name}catch(e){return ''}})()},srcPayload()));
      S.pkgSentAt=Date.now();if(!S.leadAt)S.leadAt=Date.now();if(r.code&&!S.code){S.code=r.code;S.student={code:r.code,name:$('#pkChild').value,family:true}}else if(S.student)S.student.family=true;
      save();if(typeof doSync==='function')doSync();
      f.outerHTML=`<div class="card"><h3>Cháu đã gửi cho cô rồi ạ!</h3><p>Cô ở CES nhắn Zalo cho cô chú trong khoảng 1 giờ (8:00–21:00) để xác nhận ngày bắt đầu và gửi thông tin chuyển khoản <b>${vnd(r.price)}</b>${pk.value&&f.querySelector('input[name=pay]:checked').value==='2'?' (chia hai lần)':''}. Tiền về là gói được kích hoạt vào mã học sinh <b class="mono">${esc(r.code)}</b>.</p></div>`}
    catch(err){msg.textContent=ERR_VI[err.code]||errVi(err);b.disabled=false}}}
views.goi=vGoi;

/* gợi ý khi dữ liệu đi xuống (độ đúng 3 buổi gần nhất dưới 50%): nói như một cách giúp con, kèm lý do, không gọi là bán thêm */
function upsellHintHTML(){if(!SALES_ON())return '';try{const rs=Object.keys(S.days).map(Number).sort((a,b)=>a-b).map(d=>S.days[d]).filter(r=>r&&r.web&&r.web.total).slice(-3);if(rs.length<3)return '';
  const g={acc:rs.reduce((x,r)=>x+r.web.correct,0)/rs.reduce((x,r)=>x+r.web.total,0)};if(g.acc>=0.5)return '';
  return `<p class="small">3 buổi gần nhất cậu đúng khoảng ${Math.round(g.acc*100)}%. Nếu cậu muốn có người kèm để chữa lỗi gốc, bố mẹ cậu có thể <a href="#" data-askco="độ đúng 3 buổi gần nhất">nói chuyện 15 phút với cô</a>.</p>`}catch(e){return ''}}

/* CSS riêng của phễu bán hàng */
(function(){const st=document.createElement('style');st.textContent=`
.sl-head{display:flex;gap:12px;align-items:flex-start}.sl-head .hung-fig{flex:none}
.sl-ask{display:flex;gap:14px;align-items:flex-start}.sl-ask .hung-fig{flex:none}
.sl-goi .sl-two{align-items:start}.sl-goi .sl-two>*,.sl-goi .card{min-width:0}.sl-goi .tbl-wrap{max-width:100%}.sl-phs{display:flex;flex-direction:column;gap:8px;margin-top:8px}.sl-ph{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:flex-start;justify-content:space-between;padding:10px 12px;border-radius:10px;border:2px solid var(--line)}.sl-ph-t{flex:1 1 220px;min-width:0}.sl-price{font-size:1.1rem;white-space:nowrap}.sl-ph.sl-past{opacity:.55}.sl-ph.sl-here{border-color:#FFD23F;background:var(--surface2)}
.sl-goi details{padding:6px 0;border-bottom:1px dashed var(--line)}.sl-goi details summary{cursor:pointer}
.sl-reco{border-left:6px solid #FFD23F}
#askDlg .gate-card{max-height:92vh;overflow:auto}
@media (max-width:640px){.sl-ask,.sl-head{flex-direction:column}}`;document.head.appendChild(st)})();

/* nút cuối báo cáo (không in): nút nào nổi bật hơn tùy điểm gần đúng; chưa để lại Zalo thì hiện cổng bản phác */
function reportCtaHTML(){if(!SALES_ON())return '';const book=localLeadScore()>=60;
  const a=askBtn('Đặt 15 phút với cô','báo cáo 14 buổi',book?'hi':'ghost'),b=`<button type="button" class="btn ${book?'ghost':'hi'}" data-gogoi="1">Xem gói hợp với cậu</button>`;
  return `<div class="sl-noprint">${hasFamily()?'':leadCardHTML()}<div class="card"><h3>Bước tiếp theo</h3><p class="small">Cô chú muốn nghe cô giải thích báo cáo này, hoặc xem cách học tiếp sau 14 buổi?</p><div class="row">${book?a+b:b+a}</div></div></div>`}
(function(){const st=document.createElement('style');st.textContent='@media print{.sl-noprint,.sl-ask{display:none!important}}';document.head.appendChild(st)})();
