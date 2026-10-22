/* ----- kết nối máy chủ của cô (Google Apps Script) -----
   Chèn vào template.html bởi build.py. Dùng: S, save, saveLocal, $, esc, M, go, DAYS, agg, efficiency, summary, LEVELS, renderDay. */
const API = __API_URL__;
function cloudOn(){return !!(API&&S.code)}
async function api(action,data){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},data||{}))});
  const j=await r.json();
  if(!j.ok){const e=new Error(j.error||'error');e.code=j.error;throw e}
  return j;
}
const ERR_VI={bad_code:'Mã học sinh không đúng. Bạn kiểm tra lại mã cô gửi nhé.',image_too_big:'Ảnh quá lớn, bạn chụp lại nhé.',too_many_images:'Mỗi lần gửi tối đa 6 ảnh.',no_images:'Bạn chưa chọn ảnh nào.'};
function errVi(e){return ERR_VI[e&&e.code]||'Chưa kết nối được với máy chủ. Bạn kiểm tra mạng rồi thử lại.'}

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
  if(S.code)return `<div class="card"><h3>Mã học sinh</h3><p>Bạn đang học với mã <b class="mono">${esc(S.code)}</b>${S.student&&S.student.name?` (${esc(S.student.name)})`:''}. Kết quả tự gửi cho cô sau mỗi lần bạn làm bài. Em học trên máy khác thì nhập lại mã này là tiếp tục được.</p><button class="btn ghost" id="logout">Đổi mã khác</button></div>`;
  return `<div class="card hi-card"><h3>Nhập mã học sinh cô gửi</h3><p class="small">Mã gồm 6 chữ và số. Có mã thì kết quả tự về với cô, bạn chụp bài giấy để được chấm tự động và nhắn tin được với cô.</p>
   <div class="row"><input type="text" id="codeLogin" maxlength="10" placeholder="Ví dụ: K7M2QX" autocomplete="off" style="max-width:200px;text-transform:uppercase"><button class="btn hi" id="doLogin">Vào học</button><span class="small" id="loginMsg"></span></div></div>`;
}
function wireLogin(){
  const b=$('#doLogin');
  if(b)b.onclick=async()=>{
    const code=$('#codeLogin').value.trim().toUpperCase();if(!code){$('#loginMsg').textContent='Bạn nhập mã nhé.';return}
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
let CLOUD={uploads:[],messages:[],at:0,unseen:0};
async function loadMy(){
  if(!cloudOn())return CLOUD;
  const r=await api('my',{code:S.code});
  CLOUD={uploads:r.uploads||[],messages:r.messages||[],at:Date.now(),unseen:(r.messages||[]).filter(m=>m.from==='teacher'&&!m.seenStudent).length+(CLOUD.unseen||0)};
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
  S.days[n]=Object.assign(S.days[n]||{},{paper:{ticks,correct:u.score,total:u.total,by,writing:{},self:(prev&&prev.self)||{},at:Date.parse(u.ts)||Date.now(),source:'ai',uploadId:u.id,updated:u.updated,wscore:res.writing?res.writing.score:null}});
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
   <p class="small">Chụp rõ từng trang bài làm buổi ${n} (tối đa 6 ảnh), đủ sáng, thẳng trang, không che chữ. Chỉ chụp trang bài làm. Máy sẽ đọc bài, chấm, nhận xét và gửi kết quả cho cô.</p>
   <div class="row"><label class="btn" for="upFiles">Chọn hoặc chụp ảnh</label><input type="file" id="upFiles" accept="image/*" capture="environment" multiple hidden><button class="btn hi" id="upSend" disabled>Gửi chấm</button><span class="small" id="upMsg"></span></div>
   <div class="thumbs" id="upThumbs"></div>
   ${last?`<div id="upResult">${uploadResultHTML(last)}</div>`:'<div id="upResult"></div>'}
   ${ups.length>1?`<p class="small muted">Bạn đã gửi ${ups.length} lần cho buổi này; trang hiện lần mới nhất.</p>`:''}</div>`;
}
function wireUpload(n){
  let picked=[];
  const inp=$('#upFiles'),send=$('#upSend');if(!inp)return;
  inp.onchange=async()=>{const files=[...inp.files].slice(0,6);$('#upMsg').textContent=files.length?'Đang chuẩn bị ảnh…':'';picked=[];
    for(const f of files){try{picked.push(await compressImage(f))}catch(e){}}
    $('#upThumbs').innerHTML=picked.map(p=>`<img src="${p.preview||''}" alt="Ảnh bài làm">`).join('');
    $('#upMsg').textContent=picked.length?`${picked.length} ảnh sẵn sàng.`:'Không đọc được ảnh, bạn chụp lại nhé.';send.disabled=!picked.length};
  send.onclick=async()=>{
    send.disabled=true;$('#upMsg').textContent='Đang gửi và chấm… thường mất 30–60 giây, bạn đừng tắt trang.';
    try{
      const r=await api('upload',{code:S.code,day:n,images:picked.map(p=>({mime:p.mime,data:p.data}))});
      CLOUD.uploads.push(r.upload);
      if(r.upload.status==='graded'){applyAiResult(r.upload);$('#upMsg').textContent='Đã chấm xong.'}
      else{$('#upMsg').textContent='Bài đã gửi. Máy đang chấm, kết quả sẽ hiện ở đây và ở tab Trao đổi với cô sau ít phút.';pollDay(n)}
      $('#upResult').innerHTML=uploadResultHTML(r.upload);wireResult($('#upResult'));picked=[];$('#upThumbs').innerHTML='';
      doSync();
    }catch(e){$('#upMsg').textContent=errVi(e);send.disabled=false}
  };
  wireResult($('#upResult'));
}
function pollDay(n){let k=0;const t=setInterval(async()=>{k++;try{await loadMy()}catch(e){}const u=CLOUD.uploads.filter(x=>x.day===n).sort((a,b)=>a.ts<b.ts?1:-1)[0];
  if(u&&(u.status==='graded'||u.status==='error'||k>20)){clearInterval(t);const box=$('#upResult');if(box&&VIEW==='days'&&CUR_DAY===n){box.innerHTML=uploadResultHTML(u);wireResult(box)}}},15000)}

function uploadResultHTML(u){
  if(!u)return '';
  if(u.status==='pending'||u.status==='grading')return `<div class="notice">Bài gửi lúc ${new Date(u.ts).toLocaleString('vi-VN')} đang được chấm.</div>`;
  if(u.status==='error')return `<div class="notice">Máy chưa chấm được bài gửi lúc ${new Date(u.ts).toLocaleString('vi-VN')}. Máy sẽ tự thử lại; cô cũng thấy bài này. Nếu ảnh mờ, bạn chụp lại và gửi lần nữa.</div>`;
  const R=u.result||{};const items=R.items||[];
  if(R.unreadable)return `<div class="notice">Máy không đọc được ảnh bài làm. Bạn chụp lại rõ hơn, đủ sáng và thẳng trang nhé.</div>`;
  const wrong=items.filter(it=>it.correct!==true),right=items.filter(it=>it.correct===true);
  const msgs=CLOUD.messages.filter(m=>m.uploadId===u.id);
  const EX={};try{const D=DAYS[u.day-1]||{};const PP=((C.web&&C.web[u.day])||{}).paper_plus;[...Object.values(D.paper||{}),PP||{}].forEach(s=>((s&&s.items)||[]).forEach(x=>{if(x.id&&x.explain_vi)EX[x.id]=x.explain_vi}))}catch(e){}
  const it1=it=>`<li class="ai-item ${it.correct===false?'bad':'unk'}"><div><b>${esc(it.label)}</b> ${esc(it.q)}</div>
     <div class="small">Bạn viết: <b>${esc(it.read||'—')}</b> · Đáp án: <b>${esc(it.answer)}</b>${it.teacher?' · <span class="pill good">Cô đã xem</span>':''}</div>
     ${EX[it.id]?`<div class="small kx">${fmtVi(EX[it.id])}</div>`:''}
     ${it.note?`<div class="small">${esc(it.note)}</div>`:''}
     <button class="linkbtn" data-dispute="${esc(it.id)}" data-label="${esc(it.label)}">Mình chưa đồng ý</button></li>`;
  const W=R.writing;
  return `<div class="ai-res" data-up="${esc(u.id)}">
   <div class="row" style="justify-content:space-between"><h3 style="margin:0">Kết quả chấm</h3><span class="pill good">Đúng ${u.score}/${u.total}${W?` · Bài viết ${W.score}/10`:''}</span></div>
   ${R.overall?`<p>${esc(R.overall)}</p>`:''}
   ${u.teacherNote?`<div class="t-note"><b>Cô nhận xét:</b> ${esc(u.teacherNote)}</div>`:''}
   ${wrong.length?`<h4>Câu cần xem lại (${wrong.length})</h4><ul class="ai-list">${wrong.map(it1).join('')}</ul>`:'<p><b>Bạn làm đúng tất cả các câu. Giỏi lắm!</b></p>'}
   ${W?`<h4>Bài viết · ${W.score}/10 · ${W.words} từ</h4><div class="grid2"><div><b>Điểm tốt</b><ul>${(W.strengths||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><div><b>Cần sửa</b><ul>${(W.improve||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div>`:''}
   ${right.length?`<details><summary class="small">Xem ${right.length} câu đúng</summary><ul class="ai-list">${right.map(it=>`<li class="ai-item ok"><b>${esc(it.label)}</b> ${esc(it.read||it.answer)}</li>`).join('')}</ul></details>`:''}
   <div class="thread">${msgs.map(msgHTML).join('')}</div>
   <div class="dispute" hidden><textarea rows="3" placeholder="Bạn giải thích vì sao bạn nghĩ mình đúng…"></textarea><div class="row"><button class="btn hi" data-send>Gửi cô</button><button class="btn ghost" data-cancel>Thôi</button><span class="small" data-msg></span></div></div>
   <p class="small muted">Máy chấm có thể đọc nhầm chữ viết tay. Câu nào bạn thấy chấm chưa đúng, bấm "Mình chưa đồng ý" để nhắn cô.</p></div>`;
}
function msgHTML(m){return `<div class="msg ${m.from==='teacher'?'from-t':'from-s'}"><span class="small muted">${m.from==='teacher'?'Cô':'Bạn'} · ${new Date(m.ts).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}${m.itemId?` · câu ${esc(labelOf(m.itemId))}`:''}</span><div>${esc(m.text)}</div></div>`}
function labelOf(id){return String(id).replace(/^d\d+/,'').replace(/^([A-Z]\d?)_?(\d+)$/,'$1.$2')}
function wireResult(box){
  if(!box)return;const res=box.querySelector('.ai-res');if(!res)return;
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
  M().innerHTML=`<section class="view"><div><p class="eyebrow">Trao đổi với cô</p><h2>Kết quả của bạn và tin nhắn với cô</h2>
   <p class="lead">Kết quả trên web tự gửi cho cô. Bài giấy bạn chụp ở bước 3 của mỗi buổi; máy chấm, nhận xét, rồi gửi cho cô. Chỗ nào bạn chưa đồng ý, bạn nhắn cô ngay dưới bài đó.</p></div>
   <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Gửi kết quả</h3><span>${syncLabel()||'<span class="sync">Chưa gửi lần nào</span>'}</span></div>
    <div class="row"><button class="btn" id="syncNow">Gửi ngay</button><span class="small muted">Trang tự gửi sau mỗi lần bạn làm bài; nút này để gửi lại khi mạng chập chờn.</span></div></div>
   <div class="card"><h3>Bài giấy đã chấm</h3><div id="cloudUps"><p class="muted">Đang tải…</p></div></div>
   <div class="card"><h3>Nhắn cô</h3><div class="thread" id="genThread"></div><textarea id="genMsg" rows="3" placeholder="Bạn muốn hỏi cô điều gì?"></textarea><div class="row"><button class="btn hi" id="genSend">Gửi cô</button><span class="small" id="genInfo"></span></div></div>
   ${resetCardHTML()}</section>`;
  CLOUD.unseen=0;updateBadge();
  $('#syncNow').onclick=async()=>{await doSync();go('share')};
  const draw=()=>{
    const ups=CLOUD.uploads.slice().sort((a,b)=>a.day-b.day||(a.ts<b.ts?1:-1));
    const seen={};const latest=ups.filter(u=>seen[u.day]?false:(seen[u.day]=1));
    $('#cloudUps').innerHTML=latest.length?latest.map(u=>`<details class="up-row"><summary><b>Buổi ${u.day}</b> · ${esc(DAYS[u.day-1].theme_vi)} · ${u.status==='graded'?`<span class="pill good">${u.score}/${u.total}</span>`:u.status==='error'?'<span class="pill bad">chưa chấm được</span>':'<span class="pill warn">đang chấm</span>'}${CLOUD.messages.some(m=>m.uploadId===u.id&&m.from==='teacher')?' <span class="pill hi">cô đã trả lời</span>':''}</summary><div class="up-in">${uploadResultHTML(u)}</div></details>`).join(''):'<p class="muted">Bạn chưa gửi bài giấy nào. Ở mỗi buổi, sau phần kiểm tra trên web, bạn chụp bài giấy ở bước 3.</p>';
    document.querySelectorAll('#cloudUps .up-in').forEach(wireResult);
    $('#genThread').innerHTML=CLOUD.messages.filter(m=>!m.uploadId).map(msgHTML).join('')||'<p class="small muted">Chưa có tin nhắn.</p>';
  };
  loadMy().then(draw).catch(()=>{$('#cloudUps').innerHTML='<p class="muted">Chưa tải được. Bạn kiểm tra mạng rồi mở lại tab này.</p>'});
  $('#genSend').onclick=async()=>{const t=$('#genMsg').value.trim();if(!t)return;$('#genInfo').textContent='Đang gửi…';
    try{await api('message',{code:S.code,text:t});CLOUD.messages.push({from:'student',ts:new Date().toISOString(),text:t,uploadId:'',itemId:''});$('#genMsg').value='';$('#genInfo').textContent='Đã gửi.';draw()}
    catch(e){$('#genInfo').textContent=errVi(e)}};
  wireReset();
}
