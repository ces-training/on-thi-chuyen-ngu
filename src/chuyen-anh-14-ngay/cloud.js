/* ----- kết nối máy chủ của cô (Google Apps Script) -----
   Chèn vào template.html bởi build.py. Dùng: S, save, saveLocal, $, esc, M, go, DAYS, agg, efficiency, summary, LEVELS, renderDay. */
const API = __API_URL__;
function cloudOn(){return !PREVIEW&&!!(API&&S.code)}
async function api(action,data){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},data||{}))});
  const j=await r.json();
  if(!j.ok){const e=new Error(j.error||'error');e.code=j.error;throw e}
  return j;
}
const ERR_VI={no_credit:'Mã của cậu đã hết lượt máy chấm. Bố mẹ cậu mua thêm lượt ở form xin mã nhé.',missing_name:'Cô chú điền giúp cháu họ tên phụ huynh và tên con nhé.',missing_contact:'Cô chú để lại số điện thoại/Zalo hoặc email để cô liên hệ nhé.',need_consent:'Cô chú tích ô đồng ý ở cuối form giúp cháu nhé.',busy:'Đang có nhiều yêu cầu, cô chú thử lại sau ít phút nhé.',writing_too_short:'Bài viết hơi ngắn, cậu kiểm tra xem đã chép đủ chưa nhé.',not_paid:'Phần này dành cho bản trả phí.',bad_code:'Mã học sinh không đúng. Cậu kiểm tra lại mã cô gửi nhé.',image_too_big:'Ảnh quá lớn, cậu chụp lại nhé.',too_many_images:'Mỗi lần gửi tối đa 6 ảnh.',no_images:'Cậu chưa chọn ảnh nào.'};
function errVi(e){return ERR_VI[e&&e.code]||'Chưa kết nối được với máy chủ. Cậu kiểm tra mạng rồi thử lại.'}

/* ---- đồng bộ tiến độ ---- */
let syncTimer=null,syncing=false,syncState='';
function kpi(){
  const A=agg(),eff=efficiency(A);let w=0,p=0;
  for(let i=1;i<=14;i++){const d=S.days[i];if(d&&d.web)w++;if(d&&d.paper)p++}
  const pc=a=>a&&a[1]?Math.round(1000*a[0]/a[1])/1000:null;
  return {daysWeb:w,daysPaper:p,webAcc:pc(A.web),retryAcc:pc(A.retry),mastered:A.mastered,eff:eff.f,entryLevel:S.diag?S.diag.level:'',finalLevel:S.final?S.final.level:'',planMin:S.plan.min,planDpw:S.plan.dpw};
}
function scheduleSync(){if(!cloudOn())return;clearTimeout(syncTimer);syncTimer=setTimeout(doSync,2000)}
async function doSync(){
  if(!cloudOn()||syncing)return;syncing=true;setSync('sending');
  try{await api('sync',{code:S.code,state:S,kpi:kpi(),sum:summary()});S.syncedAt=Date.now();saveLocal();setSync('ok')}
  catch(e){setSync(e.code==='bad_code'?'badcode':'fail')}
  finally{syncing=false}
}
function setSync(s){syncState=s;renderHello()}
function syncLabel(){
  if(!cloudOn())return '';
  if(syncState==='sending')return '<span class="sync">Đang gửi cho cô…</span>';
  if(syncState==='fail')return '<span class="sync bad">Chưa gửi được, sẽ tự thử lại</span>';
  if(syncState==='badcode')return '<span class="sync bad">Mã học sinh không còn đúng</span>';
  if(S.syncedAt)return `<span class="sync ok">Đã gửi cho cô · ${new Date(S.syncedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span>`;
  return '';
}
try{window.addEventListener('online',()=>{if(cloudOn())doSync()})}catch(e){}
setInterval(()=>{if(cloudOn()&&(!S.syncedAt||(S.savedAt||0)>S.syncedAt))doSync()},60000);

/* ---- đăng nhập bằng mã ---- */
function loginCard(){
  if(!API)return '';
  if(S.code)return `<div class="card"><h3>Mã học sinh</h3><p>Cậu đang học với mã <b class="mono">${esc(S.code)}</b>${S.student&&S.student.name?` (${esc(S.student.name)})`:''}. Kết quả tự gửi cho cô sau mỗi lần cậu làm bài. Em học trên máy khác thì nhập lại mã này là tiếp tục được.</p><button class="btn ghost" id="logout">Đổi mã khác</button></div>`;
  return `<div class="card hi-card"><h3>Nhập mã học sinh cô gửi</h3><p class="small">Mã gồm 6 chữ và số. Có mã thì kết quả tự về với cô, cậu chụp bài giấy để được chấm tự động và nhắn tin được với cô. <b>Chưa có mã?</b> <a href="#" id="toReq">Bố mẹ cậu điền form xin mã</a>.</p>
   <div class="row"><input type="text" id="codeLogin" maxlength="10" placeholder="Ví dụ: K7M2QX" autocomplete="off" style="max-width:200px;text-transform:uppercase"><button class="btn hi" id="doLogin">Vào học</button><span class="small" id="loginMsg"></span></div></div>`;
}
function wireLogin(){
  const tr=$('#toReq');if(tr)tr.onclick=e=>{e.preventDefault();go('xinma')};
  const b=$('#doLogin');
  if(b)b.onclick=async()=>{
    const code=$('#codeLogin').value.trim().toUpperCase();if(!code){$('#loginMsg').textContent='Cậu nhập mã nhé.';return}
    b.disabled=true;$('#loginMsg').textContent='Đang kiểm tra mã…';
    try{
      const r=await api('login',{code});
      const srv=r.state;
      if(srv&&(srv.savedAt||0)>(S.savedAt||0)){S=Object.assign(blank(),srv)}
      S.code=r.student.code;S.student=r.student;if(!S.name)S.name=r.student.name||'';
      save();doSync();go('start');
    }catch(e){$('#loginMsg').textContent=errVi(e);b.disabled=false}
  };
  const lo=$('#logout');if(lo)lo.onclick=()=>{if(!confirmInline(lo,'Bấm lần nữa để đổi mã'))return;S.code='';S.student=null;saveLocal();go('start')};
}
function confirmInline(btn,txt){if(btn.dataset.sure)return true;btn.dataset.sure='1';btn.textContent=txt;return false}

/* ---- dữ liệu bài giấy và tin nhắn ---- */
let CLOUD={uploads:[],messages:[],at:0,unseen:0,paid:false,orderPending:false,credits:null};
async function loadMy(){
  if(!cloudOn())return CLOUD;
  const r=await api('my',{code:S.code});
  CLOUD={uploads:r.uploads||[],messages:r.messages||[],at:Date.now(),paid:!!r.paid,orderPending:!!r.orderPending,credits:r.credits==null?null:Number(r.credits),unseen:(r.messages||[]).filter(m=>m.from==='teacher'&&!m.seenStudent).length+(CLOUD.unseen||0)};
  // kết quả chấm mới nhất của mỗi buổi điền vào bài giấy
  latestByDay().forEach(u=>applyAiResult(u));
  updateBadge();
  return CLOUD;
}
function latestByDay(){const m={};CLOUD.uploads.filter(u=>u.status==='graded'&&u.result).forEach(u=>{if(!m[u.day]||u.ts>m[u.day].ts)m[u.day]=u});return Object.values(m)}
function applyAiResult(u){
  const n=u.day,res=u.result;if(!res||!res.items)return;
  const prev=S.days[n]&&S.days[n].paper;
  if(prev&&prev.source==='ai'&&prev.uploadId===u.id&&prev.updated===u.updated&&prev.correct===u.score)return;
  const ticks={},by={};
  res.items.forEach(it=>{ticks[it.id]=it.correct===true;const k=(it.section||'').split(' ')[0];by[k]=by[k]||[0,0];by[k][1]++;if(it.correct===true)by[k][0]++});
  S.days[n]=Object.assign(S.days[n]||{},{paper:{ticks,correct:u.score,total:u.total,by,writing:{},self:(prev&&prev.self)||{},at:Date.parse(u.ts)||Date.now(),source:'ai',uploadId:u.id,updated:u.updated,wscore:res.writing&&res.writing.status!=='confirm'?res.writing.score:null}});
  save();
}
function updateBadge(){const b=document.querySelector('#tabs button[data-view="share"] .tb');if(!b)return;b.innerHTML=CLOUD.unseen?`<span class="badge">${CLOUD.unseen}</span>`:''}

/* ---- chụp và gửi bài giấy ---- */
function compressImage(file){
  if(window.__compress)return window.__compress(file);
  return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const m=1600,sc=Math.min(1,m/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);const d=c.toDataURL('image/jpeg',0.8);res({mime:'image/jpeg',data:d.split(',')[1],preview:d})};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('img'))};img.src=url});
}
function uploadCardHTML(n){
  const ups=CLOUD.uploads.filter(u=>u.day===n).sort((a,b)=>a.ts<b.ts?1:-1);const last=ups[0];
  return `<div class="up-box"><h3 class="ih">${em('camera-with-flash')}Bước 7 · Chụp bài giấy để được chấm</h3>
   <p class="small">Chụp rõ từng trang bài làm buổi ${n} (tối đa 6 ảnh), đủ sáng, thẳng trang, không che chữ. Chỉ chụp trang bài làm. Máy chấm phần trắc nghiệm và điền từ, giải thích câu sai, rồi chép đoạn viết của cậu thành chữ để cậu kiểm tra trước khi chấm.</p>
   ${creditLine()}
   <div class="row"><label class="btn" for="upFiles">Chọn hoặc chụp ảnh</label><input type="file" id="upFiles" accept="image/*" capture="environment" multiple hidden><button class="btn hi" id="upSend" disabled>Gửi chấm</button><span class="small" id="upMsg"></span></div>
   <div class="thumbs" id="upThumbs"></div>
   ${last?`<div id="upResult">${uploadResultHTML(last)}</div>`:'<div id="upResult"></div>'}
   ${ups.length>1?`<p class="small muted">Cậu đã gửi ${ups.length} lần cho buổi này; trang hiện lần mới nhất.</p>`:''}</div>`;
}
function creditLine(){
  const c=CLOUD.credits;if(c==null)return '';
  if(c<=0)return `<div class="notice"><b>Mã của cậu đã hết lượt máy chấm.</b> Máy chấm 4.000đ mỗi bài; gói thử 14 bài 50.000đ. <button class="linkbtn" data-buy-credit>Bố mẹ cậu mua thêm lượt ở đây</button>. Trong lúc chờ, cậu tự chấm bằng đáp án bên dưới nhé.</div>`;
  return `<p class="small">Còn <b>${c}</b> lượt máy chấm. Mỗi bài máy chấm xong trừ 1 lượt; ảnh không đọc được thì không trừ.</p>`;
}
function wireUpload(n){
  document.querySelectorAll('[data-buy-credit]').forEach(b=>b.onclick=()=>go('xinma'));
  let picked=[];
  const inp=$('#upFiles'),send=$('#upSend');if(!inp)return;
  inp.onchange=async()=>{const files=[...inp.files].slice(0,6);$('#upMsg').textContent=files.length?'Đang chuẩn bị ảnh…':'';picked=[];
    for(const f of files){try{picked.push(await compressImage(f))}catch(e){}}
    $('#upThumbs').innerHTML=picked.map(p=>`<img src="${p.preview||''}" alt="Ảnh bài làm">`).join('');
    $('#upMsg').textContent=picked.length?`${picked.length} ảnh sẵn sàng.`:'Không đọc được ảnh, cậu chụp lại nhé.';send.disabled=!picked.length};
  send.onclick=async()=>{
    send.disabled=true;$('#upMsg').textContent='Đang gửi và chấm… thường mất 30–60 giây, cậu đừng tắt trang.';
    try{
      const r=await api('upload',{code:S.code,day:n,images:picked.map(p=>({mime:p.mime,data:p.data}))});
      CLOUD.uploads.push(r.upload);if(CLOUD.credits!=null&&r.upload.status==='graded'&&!(r.upload.result&&r.upload.result.unreadable))CLOUD.credits=Math.max(0,CLOUD.credits-1);
      if(r.upload.status==='graded'){applyAiResult(r.upload);$('#upMsg').textContent='Đã chấm xong.'}
      else{$('#upMsg').textContent='Bài đã gửi. Máy đang chấm, kết quả sẽ hiện ở đây và ở tab Trao đổi với cô sau ít phút.';pollDay(n)}
      $('#upResult').innerHTML=uploadResultHTML(r.upload);wireResult($('#upResult'));picked=[];$('#upThumbs').innerHTML='';
      doSync();
    }catch(e){$('#upMsg').textContent=errVi(e);send.disabled=e.code==='no_credit';if(e.code==='no_credit'){CLOUD.credits=0;$('#upMsg').innerHTML=esc(errVi(e))+' <button class="linkbtn" id="upBuy">Mở form</button>';$('#upBuy').onclick=()=>go('xinma')}}
  };
  wireResult($('#upResult'));
}
function pollDay(n){let k=0;const t=setInterval(async()=>{k++;try{await loadMy()}catch(e){}const u=CLOUD.uploads.filter(x=>x.day===n).sort((a,b)=>a.ts<b.ts?1:-1)[0];
  if(u&&(u.status==='graded'||u.status==='error'||k>20)){clearInterval(t);const box=$('#upResult');if(box&&VIEW==='days'&&CUR_DAY===n){box.innerHTML=uploadResultHTML(u);wireResult(box)}}},15000)}

function uploadResultHTML(u){
  if(!u)return '';
  if(u.status==='pending'||u.status==='grading')return `<div class="notice">Bài gửi lúc ${new Date(u.ts).toLocaleString('vi-VN')} đang được chấm.</div>`;
  if(u.status==='error')return `<div class="notice">Máy chưa chấm được bài gửi lúc ${new Date(u.ts).toLocaleString('vi-VN')}. Máy sẽ tự thử lại; cô cũng thấy bài này. Nếu ảnh mờ, cậu chụp lại và gửi lần nữa.</div>`;
  const R=u.result||{};const items=R.items||[];
  if(R.unreadable)return `<div class="notice">Máy không đọc được ảnh bài làm. Cậu chụp lại rõ hơn, đủ sáng và thẳng trang nhé.</div>`;
  const wrong=items.filter(it=>it.correct!==true),right=items.filter(it=>it.correct===true);
  const msgs=CLOUD.messages.filter(m=>m.uploadId===u.id);
  const EX={};try{const D=DAYS[u.day-1]||{};const PP=((C.web&&C.web[u.day])||{}).paper_plus;[...Object.values(D.paper||{}),PP||{}].forEach(s=>((s&&s.items)||[]).forEach(x=>{if(x.id&&x.explain_vi)EX[x.id]=x.explain_vi}))}catch(e){}
  const it1=it=>`<li class="ai-item ${it.correct===false?'bad':'unk'}"><div><b>${esc(it.label)}</b> ${esc(it.q)}</div>
     <div class="small">Cậu viết: <b>${esc(it.read||'—')}</b> · Đáp án: <b>${esc(it.answer)}</b>${it.teacher?' · <span class="pill good">Cô đã xem</span>':''}</div>
     ${EX[it.id]?`<div class="small kx">${fmtVi(EX[it.id])}</div>`:''}
     ${it.note?`<div class="small">${esc(it.note)}</div>`:''}
     <button class="linkbtn" data-dispute="${esc(it.id)}" data-label="${esc(it.label)}">Mình chưa đồng ý</button></li>`;
  const W=R.writing;
  return `<div class="ai-res" data-up="${esc(u.id)}">
   <div class="row" style="justify-content:space-between"><h3 style="margin:0">Kết quả chấm</h3><span class="pill good">Đúng ${u.score}/${u.total}${W&&W.status!=='confirm'&&W.score!=null?` · Bài viết ${W.score}/10`:''}</span></div>
   ${R.overall?`<p>${esc(R.overall)}</p>`:''}
   ${u.teacherNote?`<div class="t-note"><b>Cô nhận xét:</b> ${esc(u.teacherNote)}</div>`:''}
   ${W&&W.status==='confirm'?'<div class="notice"><b>Còn một bước:</b> kéo xuống phần Bài viết, kiểm tra bản máy chép rồi bấm xác nhận để được chấm bài viết.</div>':''}
   ${wrong.length?`<h4>Câu cần xem lại (${wrong.length}) · có giải thích</h4><ul class="ai-list">${wrong.map(it1).join('')}</ul>`:'<p><b>Cậu làm đúng tất cả các câu. Giỏi lắm!</b></p>'}
   ${W?writingHTML(u,W):''}
   ${right.length?`<details><summary class="small">Xem ${right.length} câu đúng</summary><ul class="ai-list">${right.map(it=>`<li class="ai-item ok"><b>${esc(it.label)}</b> ${esc(it.read||it.answer)}</li>`).join('')}</ul></details>`:''}
   <div class="thread">${msgs.map(msgHTML).join('')}</div>
   <div class="dispute" hidden><textarea rows="3" placeholder="Cậu giải thích vì sao cậu nghĩ mình đúng…"></textarea><div class="row"><button class="btn hi" data-send>Gửi cô</button><button class="btn ghost" data-cancel>Thôi</button><span class="small" data-msg></span></div></div>
   <p class="small muted">Máy chấm có thể đọc nhầm chữ viết tay. Câu nào cậu thấy chấm chưa đúng, bấm "Mình chưa đồng ý" để nhắn cô.</p></div>`;
}
/* bài viết: bước xác nhận bản chép → kết quả bản thường → bản trả phí */
function wc(t){const m=String(t||'').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g);return m?m.length:0}
function writingHTML(u,W){
  if(W.status==='confirm'){
    return `<div class="w-box" data-wbox><h4>Bài viết · máy đã chép lại, chờ cậu xác nhận</h4>
     <p class="small">Tớ chép đoạn viết trên giấy của cậu thành chữ như dưới đây. Cậu đọc lại thật kỹ: <b>đây đã là toàn bộ bài cậu viết chưa?</b> Chỗ nào máy đọc nhầm hoặc bỏ sót thì sửa cho <b>giống hệt trên giấy</b>, kể cả lỗi cậu đã viết. Đừng viết thêm hay sửa cho hay hơn nhé: cô sẽ đối chiếu với ảnh bài làm.</p>
     ${(W.unclear||[]).length?`<p class="small">Máy chưa đọc chắc: ${W.unclear.map(x=>`<span class="pill warn">${esc(x)}</span>`).join(' ')} (chỗ ghi [?] trong bài).</p>`:''}
     <textarea rows="8" data-wtext style="width:100%">${esc(W.text||W.aiRead||'')}</textarea>
     <div class="row"><span class="small muted" data-wcount>${wc(W.text||W.aiRead)} từ</span></div>
     <div class="row"><button class="btn hi" data-wconfirm>Đúng rồi, đây là toàn bộ bài mình viết · chấm giúp mình</button><button class="btn ghost" data-wreset>Trả lại bản máy chép</button><span class="small" data-wmsg></span></div></div>`;
  }
  const D=W.detail;
  return `<div class="w-box" data-wbox><h4>Bài viết · ${W.score}/10 · ${W.words} từ <span class="pill">bản thường</span></h4>
   ${W.summary?`<p>${esc(W.summary)}</p>`:''}
   <div class="grid2"><div><b>Điểm tốt</b><ul>${(W.strengths||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><div><b>Cần sửa</b><ul>${(W.improve||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div>
   <details><summary class="small">Xem bài cậu đã xác nhận</summary><div class="passage" style="white-space:pre-wrap;margin-top:8px">${esc(W.text)}</div></details>
   ${D?detailHTML(D):paidOfferHTML()}</div>`;
}
function detailHTML(D){
  return `<div class="w-detail"><h4>Nhận xét chi tiết theo tiêu chí bài viết đề chuyên · ${D.total}/10 <span class="pill hi">bản trả phí</span></h4>
   ${D.summary?`<p>${esc(D.summary)}</p>`:''}
   <div class="tw"><table><tbody>${(D.criteria||[]).map(c=>`<tr><td><b>${esc(c.name)}</b><br><span class="small">${esc(c.comment)}</span>${(c.evidence||[]).length?`<br><span class="small muted">Trong bài: ${c.evidence.map(e=>'“'+esc(e)+'”').join(' · ')}</span>`:''}</td><td class="n"><b>${c.score}</b>/${c.max}</td></tr>`).join('')}</tbody></table></div>
   ${(D.errors||[]).length?`<h4>Lỗi cần sửa</h4><ul class="ai-list">${D.errors.map(e=>`<li class="ai-item bad"><div><s>${esc(e.quote)}</s> → <b>${esc(e.fix)}</b>${e.type?` <span class="pill">${esc(e.type)}</span>`:''}</div><div class="small">${esc(e.why)}</div></li>`).join('')}</ul>`:''}
   ${(D.upgrades||[]).length?`<h4>Nâng câu lên mức đề chuyên</h4><ul class="ai-list">${D.upgrades.map(e=>`<li class="ai-item"><div class="small">Cậu viết: ${esc(e.from)}</div><div>Có thể viết: <b>${esc(e.to)}</b></div><div class="small">${esc(e.why)}</div></li>`).join('')}</ul>`:''}
   ${(D.next||[]).length?`<h4>Bài viết sau, cậu thử</h4><ul>${D.next.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
   <p class="small muted">Thang 4 tiêu chí do CES đề xuất theo cách chấm bài viết đề chuyên Anh, không phải hướng dẫn chấm chính thức của Sở.</p></div>`;
}
function paidOfferHTML(){
  if(CLOUD.paid)return `<div class="w-offer"><button class="btn hi" data-wdetail>Xem nhận xét chi tiết theo tiêu chí đề chuyên</button><span class="small" data-wmsg></span></div>`;
  return `<div class="w-offer card"><h4 style="margin-top:0">Muốn biết bài này được mấy điểm nếu chấm như đề chuyên?</h4>
   <p class="small">Bản trả phí chấm bài viết theo 4 tiêu chí của bài viết đề chuyên Anh (nội dung, bố cục và liên kết, từ vựng, ngữ pháp), chỉ ra từng lỗi kèm cách sửa, và gợi ý nâng câu lên mức đề chuyên. Áp dụng cho mọi bài viết cậu gửi.</p>
   ${CLOUD.orderPending?'<p class="small"><b>Cậu đã gửi yêu cầu.</b> Cô sẽ liên hệ bố mẹ cậu để hoàn tất. Khi được kích hoạt, nút xem nhận xét chi tiết sẽ hiện ngay ở đây.</p>':'<div class="row"><button class="btn" data-wbuy>Mình muốn mua bản trả phí</button><span class="small" data-wmsg></span></div>'}</div>`;
}
function wireWriting(res){
  const box=res.querySelector('[data-wbox]');if(!box)return;const up=res.dataset.up;const msg=box.querySelector('[data-wmsg]');
  const redraw=w=>{const u=CLOUD.uploads.find(x=>x.id===up);if(u&&u.result){u.result.writing=w;applyAiResult(u)}const host=res.parentElement;if(host&&u){host.innerHTML=uploadResultHTML(u);wireResult(host)}};
  const ta=box.querySelector('[data-wtext]');
  if(ta){const cnt=box.querySelector('[data-wcount]');ta.oninput=()=>{cnt.textContent=wc(ta.value)+' từ'};
    box.querySelector('[data-wreset]').onclick=()=>{const u=CLOUD.uploads.find(x=>x.id===up);if(u)ta.value=u.result.writing.aiRead||'';ta.oninput()};
    box.querySelector('[data-wconfirm]').onclick=async e=>{const b=e.target;b.disabled=true;msg.textContent='Đang chấm bài viết… khoảng 10–20 giây.';
      try{const r=await api('confirm_writing',{code:S.code,uploadId:up,text:ta.value});redraw(r.writing);doSync()}catch(err){msg.textContent=errVi(err);b.disabled=false}}}
  const d=box.querySelector('[data-wdetail]');
  if(d)d.onclick=async()=>{d.disabled=true;msg.textContent='Đang chấm theo tiêu chí đề chuyên… khoảng 30 giây.';
    try{const r=await api('writing_detail',{code:S.code,uploadId:up});redraw(r.writing)}catch(err){if(err.code==='not_paid'){CLOUD.paid=false;redraw(CLOUD.uploads.find(x=>x.id===up).result.writing)}else{msg.textContent=errVi(err);d.disabled=false}}};
  const buy=box.querySelector('[data-wbuy]');
  if(buy)buy.onclick=async()=>{buy.disabled=true;msg.textContent='Đang gửi…';
    try{await api('buy_request',{code:S.code,product:'writing_detail',uploadId:up});CLOUD.orderPending=true;redraw(CLOUD.uploads.find(x=>x.id===up).result.writing)}catch(err){msg.textContent=errVi(err);buy.disabled=false}};
}
function msgHTML(m){return `<div class="msg ${m.from==='teacher'?'from-t':'from-s'}"><span class="small muted">${m.from==='teacher'?'Cô':'Cậu'} · ${new Date(m.ts).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}${m.itemId?` · câu ${esc(labelOf(m.itemId))}`:''}</span><div>${esc(m.text)}</div></div>`}
function labelOf(id){return String(id).replace(/^d\d+/,'').replace(/^([A-Z]\d?)_?(\d+)$/,'$1.$2')}
function wireResult(box){
  if(!box)return;const res=box.querySelector('.ai-res');if(!res)return;
  wireWriting(res);
  const dz=res.querySelector('.dispute'),ta=dz.querySelector('textarea');let cur=null;
  res.querySelectorAll('[data-dispute]').forEach(b=>b.onclick=()=>{cur={id:b.dataset.dispute,label:b.dataset.label};dz.hidden=false;ta.value=`Câu ${cur.label}: `;ta.focus()});
  dz.querySelector('[data-cancel]').onclick=()=>{dz.hidden=true;cur=null};
  dz.querySelector('[data-send]').onclick=async()=>{const text=ta.value.trim();if(!text)return;const msg=dz.querySelector('[data-msg]');msg.textContent='Đang gửi…';
    try{await api('message',{code:S.code,uploadId:res.dataset.up,itemId:cur?cur.id:'',text});CLOUD.messages.push({from:'student',ts:new Date().toISOString(),uploadId:res.dataset.up,itemId:cur?cur.id:'',text});
      res.querySelector('.thread').innerHTML=CLOUD.messages.filter(m=>m.uploadId===res.dataset.up).map(msgHTML).join('');dz.hidden=true;msg.textContent='';}
    catch(e){msg.textContent=errVi(e)}};
}

/* ---- tab Trao đổi với cô ---- */
function vShareCloud(){
  M().innerHTML=`<section class="view"><div><p class="eyebrow">Trao đổi với cô</p><h2>Kết quả của cậu và tin nhắn với cô</h2>
   <p class="lead">Kết quả trên web tự gửi cho cô. Bài giấy cậu chụp ở bước 3 của mỗi buổi; máy chấm, nhận xét, rồi gửi cho cô. Chỗ nào cậu chưa đồng ý, cậu nhắn cô ngay dưới bài đó.</p></div>
   <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Gửi kết quả</h3><span>${syncLabel()||'<span class="sync">Chưa gửi lần nào</span>'}</span></div>
    <div class="row"><button class="btn" id="syncNow">Gửi ngay</button><span class="small muted">Trang tự gửi sau mỗi lần cậu làm bài; nút này để gửi lại khi mạng chập chờn.</span></div></div>
   <div class="card"><h3>Bài giấy đã chấm</h3><div id="cloudUps"><p class="muted">Đang tải…</p></div></div>
   <div class="card"><h3>Nhắn cô</h3><div class="thread" id="genThread"></div><textarea id="genMsg" rows="3" placeholder="Cậu muốn hỏi cô điều gì?"></textarea><div class="row"><button class="btn hi" id="genSend">Gửi cô</button><span class="small" id="genInfo"></span></div></div>
   ${reportCardHTML()}
   ${resetCardHTML()}</section>`;
  CLOUD.unseen=0;updateBadge();
  $('#syncNow').onclick=async()=>{await doSync();go('share')};
  const draw=()=>{
    const ups=CLOUD.uploads.slice().sort((a,b)=>a.day-b.day||(a.ts<b.ts?1:-1));
    const seen={};const latest=ups.filter(u=>seen[u.day]?false:(seen[u.day]=1));
    $('#cloudUps').innerHTML=latest.length?latest.map(u=>`<details class="up-row"><summary><b>Buổi ${u.day}</b> · ${esc(DAYS[u.day-1].theme_vi)} · ${u.status==='graded'?`<span class="pill good">${u.score}/${u.total}</span>`:u.status==='error'?'<span class="pill bad">chưa chấm được</span>':'<span class="pill warn">đang chấm</span>'}${CLOUD.messages.some(m=>m.uploadId===u.id&&m.from==='teacher')?' <span class="pill hi">cô đã trả lời</span>':''}</summary><div class="up-in">${uploadResultHTML(u)}</div></details>`).join(''):'<p class="muted">Cậu chưa gửi bài giấy nào. Ở mỗi buổi, sau phần kiểm tra trên web, cậu chụp bài giấy ở bước 3.</p>';
    document.querySelectorAll('#cloudUps .up-in').forEach(wireResult);
    $('#genThread').innerHTML=CLOUD.messages.filter(m=>!m.uploadId).map(msgHTML).join('')||'<p class="small muted">Chưa có tin nhắn.</p>';
  };
  loadMy().then(draw).catch(()=>{$('#cloudUps').innerHTML='<p class="muted">Chưa tải được. Cậu kiểm tra mạng rồi mở lại tab này.</p>'});
  $('#genSend').onclick=async()=>{const t=$('#genMsg').value.trim();if(!t)return;$('#genInfo').textContent='Đang gửi…';
    try{await api('message',{code:S.code,text:t});CLOUD.messages.push({from:'student',ts:new Date().toISOString(),text:t,uploadId:'',itemId:''});$('#genMsg').value='';$('#genInfo').textContent='Đã gửi.';draw()}
    catch(e){$('#genInfo').textContent=errVi(e)}};
  wireReset();
}

/* ---- form của bố mẹ: xin mã máy chấm (có thu phí) hoặc nhờ cô xem bài ---- */
function vRequest(){
  const reg=(typeof REGIONS!=='undefined'&&S.region&&REGIONS[S.region])?REGIONS[S.region].name:'';
  const sent=S.reqSentAt;
  M().innerHTML=`<section class="view"><div><p class="eyebrow">Dành cho bố mẹ</p><h2>Xin mã chấm bài giấy</h2>
   <p class="lead">Cháu là Hùng. Cô chú điền form này để nhận mã học sinh cho con, hoặc gửi ảnh bài để cô xem và nhận xét. Số điện thoại và email của cô chú chỉ cô ở CES xem được, không hiện trên trang.</p></div>
   <div class="card"><h3>Bảng giá máy chấm bài giấy</h3>
    <div class="tw"><table><tbody>
     <tr><td><b>Gói thử 14 bài</b><br><span class="small">Đủ cả chặng 14 buổi: chấm trắc nghiệm có giải thích câu sai, chép và chấm đoạn viết</span></td><td class="n"><b>50.000đ</b></td></tr>
     <tr><td><b>Chấm lẻ</b></td><td class="n"><b>4.000đ</b> / bài</td></tr></tbody></table></div>
    <p class="small muted">Mỗi bài máy chấm xong mới trừ 1 lượt; ảnh không đọc được thì không trừ. Nhận xét chi tiết bài viết theo tiêu chí đề chuyên thuộc gói học trả phí, cô tư vấn riêng.</p></div>
   ${sent?`<div class="notice">Cô chú đã gửi form lúc ${new Date(sent).toLocaleString('vi-VN')}. Cô sẽ liên hệ sớm; cô chú không cần gửi lại.</div>`:''}
   <form class="card" id="reqForm" autocomplete="on">
    <h3>Cô chú cần gì?</h3>
    <label class="key-item"><input type="radio" name="want" value="ma_may" checked><span><b>Nhận mã để máy chấm bài</b><br><span class="small">Con chụp bài giấy sau mỗi buổi, máy chấm ngay. Cô liên hệ hướng dẫn chuyển khoản; thanh toán xong cô gửi mã.</span></span></label>
    <div id="packBox" style="margin:4px 0 10px 28px">
     <label class="key-item"><input type="radio" name="pack" value="thu14" checked><span>Gói thử 14 bài · <b>50.000đ</b></span></label>
     <label class="key-item"><input type="radio" name="pack" value="le"><span>Chấm lẻ · 4.000đ/bài · số bài <input type="number" id="rqQty" min="1" max="200" value="5" style="width:70px"> = <b id="rqSum">20.000đ</b></span></label>
    </div>
    <label class="key-item"><input type="radio" name="want" value="cham_tay"><span><b>Nhờ cô xem bài và nhận xét</b><br><span class="small">Cô chú gửi ảnh bài làm của con; cô xem và phản hồi qua email hoặc Zalo.</span></span></label>
    <div id="photoBox" hidden style="margin:4px 0 10px 28px"><div class="row"><label class="btn" for="rqFiles">Chọn ảnh bài làm (tối đa 6)</label><input type="file" id="rqFiles" accept="image/*" multiple hidden><span class="small" id="rqPicked"></span></div><div class="thumbs" id="rqThumbs"></div></div>
    <h3>Thông tin</h3>
    <div class="grid2">
     <label>Họ tên phụ huynh *<br><input id="rqParent" autocomplete="name" style="width:100%"></label>
     <label>Số điện thoại / Zalo<br><input id="rqPhone" type="tel" autocomplete="tel" style="width:100%"></label>
     <label>Email (để nhận mã và nhận xét)<br><input id="rqEmail" type="email" autocomplete="email" style="width:100%"></label>
     <label>Tên gọi của con *<br><input id="rqChild" value="${esc(S.name||'')}" style="width:100%"></label>
     <label>Lớp<br><select id="rqGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${(+((S.course&&S.course.grade)||7))===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
     <label>Tỉnh, thành nơi con thi<br><input id="rqRegion" value="${esc(reg)}" style="width:100%"></label>
     <label>Trường con nhắm<br><input id="rqSchool" style="width:100%"></label>
    </div>
    <label>Lời nhắn cho cô<br><textarea id="rqNote" rows="3" style="width:100%"></textarea></label>
    <input type="text" id="rqWeb" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <label class="key-item"><input type="checkbox" id="rqConsent"><span class="small">Tôi đồng ý cho CES (Học viện Đa ngữ Anh–Trung) lưu thông tin trên và ảnh bài làm (nếu gửi) để chấm bài, cấp mã và liên hệ tư vấn học tập cho con. Thông tin được giữ đến hết kỳ thi vào lớp 10 của con; tôi có thể yêu cầu sửa hoặc xoá bất cứ lúc nào bằng cách nhắn cô.</span></label>
    <p class="small muted">* bắt buộc. Cần ít nhất một trong hai: số điện thoại/Zalo hoặc email.</p>
    <div class="row"><button class="btn hi" type="submit" id="rqSend">Gửi cho cô</button><span class="small" id="rqMsg"></span></div>
   </form></section>`;
  let picked=[];
  const f=$('#reqForm'),qty=()=>Math.max(1,Math.min(200,+$('#rqQty').value||1));
  const pack=()=>f.querySelector('input[name=pack]:checked').value==='le'?'le:'+qty():'thu14';
  const want=()=>f.querySelector('input[name=want]:checked').value;
  const sync=()=>{$('#packBox').hidden=want()!=='ma_may';$('#photoBox').hidden=want()!=='cham_tay';$('#rqSum').textContent=(qty()*4000).toLocaleString('vi-VN')+'đ'};
  f.querySelectorAll('input[name=want],input[name=pack]').forEach(i=>i.onchange=sync);$('#rqQty').oninput=()=>{f.querySelector('input[name=pack][value=le]').checked=true;sync()};sync();
  $('#rqFiles').onchange=async()=>{picked=[];for(const x of [...$('#rqFiles').files].slice(0,6)){try{picked.push(await compressImage(x))}catch(e){}}
    $('#rqThumbs').innerHTML=picked.map(p=>`<img src="${p.preview||''}" alt="Ảnh bài làm">`).join('');$('#rqPicked').textContent=picked.length?picked.length+' ảnh':''};
  f.onsubmit=async e=>{e.preventDefault();const b=$('#rqSend'),msg=$('#rqMsg');
    if(!$('#rqConsent').checked){msg.textContent=ERR_VI.need_consent;return}
    b.disabled=true;msg.textContent='Đang gửi…';
    try{
      const w=want();
      await api('request',{website:$('#rqWeb').value,want:w,pack:pack(),parent:$('#rqParent').value,phone:$('#rqPhone').value,email:$('#rqEmail').value,child:$('#rqChild').value,
        grade:+$('#rqGrade').value,region:$('#rqRegion').value,school:$('#rqSchool').value,note:$('#rqNote').value,consent:true,images:w==='cham_tay'?picked.map(p=>({mime:p.mime,data:p.data})):[]});
      S.reqSentAt=Date.now();saveLocal();
      f.outerHTML=`<div class="card"><h3>Cháu đã gửi cho cô rồi ạ!</h3><p>${w==='ma_may'?'Cô sẽ liên hệ cô chú qua Zalo hoặc email để hướng dẫn chuyển khoản. Thanh toán xong, cô gửi mã học sinh cho con; con nhập mã ở Trang chủ là chụp bài gửi chấm được.':'Cô sẽ xem bài của con và phản hồi qua email hoặc Zalo cô chú để lại.'}</p><button class="btn" id="rqHome">Về trang học</button></div>`;
      $('#rqHome').onclick=()=>go('start');
    }catch(err){msg.textContent=ERR_VI[err.code]||errVi(err);b.disabled=false}};
}
