/* ================= BẢN XEM TRƯỚC CHO GIÁO VIÊN =================
   Chỉ có trong xem-truoc.html (build.py thay PREVIEW=true và chèn file này).
   - Dữ liệu lưu ở khoá riêng 'chuyenAnh14_preview', không đồng bộ lên máy chủ.
   - Thanh công cụ dưới đáy: chọn tình huống học sinh, chọn lớp, mở mọi buổi.
   - Mục "Toàn bộ nội dung": 14 buổi + 2 bài kiểm tra, có đáp án và giải thích. */
const PV_KEY='ca14_pv';
try{Object.assign(PV,JSON.parse(localStorage.getItem(PV_KEY)||'{}'))}catch(e){}
const pvSave=()=>{try{localStorage.setItem(PV_KEY,JSON.stringify(PV))}catch(e){}};
const PV_SC=[
  {k:'moi',t:'Học sinh mới vào, chưa làm bài đầu vào'},
  {k:'phac',t:'Vừa làm bài đầu vào (bản phác lộ trình)'},
  {k:'nhanh',t:'Đã học 6 buổi · đúng nhiều, học đều'},
  {k:'nhip',t:'Đã học 6 buổi · nhịp ổn'},
  {k:'cham',t:'Đã học 6 buổi · sai nhiều, học ngắt quãng'},
  {k:'xong',t:'Xong cả 14 buổi và bài đầu ra'}
];
/* xác suất làm đúng theo mức A2/B1/B2 của bài kiểm tra, độ đúng trên web, số buổi, khoảng cách ngày */
const PV_P={phac:{b:[.9,.6,.2],acc:0,n:0,gap:1,st:null},
  nhanh:{b:[1,.9,.6],acc:.92,n:6,gap:1,st:{retry:[9,10],spiral:[9,10]}},
  nhip:{b:[.9,.7,.3],acc:.72,n:6,gap:1,st:{retry:[6,10],spiral:[7,10]}},
  cham:{b:[.7,.4,.1],acc:.42,n:6,gap:3,st:{retry:[3,10],spiral:[4,10]}},
  xong:{b:[.9,.7,.3],acc:.78,n:14,gap:1,st:{retry:[7,10],spiral:[8,10]},fin:[1,.8,.5]}};
function pvRand(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function pvAns(it,ok){if(ok)return it.type==='mcq'?it.answer:(Array.isArray(it.answer)?it.answer[0]:it.answer);
  return it.type==='mcq'?((it.answer+1)%((it.options||[1,2]).length)):'—'}
function pvTest(kind,b,r){const T=TESTS[kind];const ans={};const L={A2:0,B1:1,B2:2};
  T.items.forEach(it=>{ans[it.id]=pvAns(it,r()<b[L[it.level]||0])});const res=testScore(T,ans);res.answers=ans;return res}
function pvBuild(k){
  const st=blank();st.school={grade:PV.grade};if(k==='moi')return st;
  const P=PV_P[k],r=pvRand(7+k.length*31),DAY=864e5,now=Date.now();
  st.name='Linh';st.plan={min:40,dpw:6,cls:0};
  const keep=S;S=st; /* updateQueue ghi vào S */
  try{
    st.diag=pvTest('diag',P.b,r);st.diag.at=now-(P.n*P.gap+1)*DAY;
    for(let i=1;i<=P.n;i++){const D=DAYS[i-1],at=now-(P.n-i)*P.gap*DAY-3600e3;
      const items=(D.web_check||[]).map(x=>ITEM[x.id]).filter(Boolean);const ans={},bySkill={};let correct=0;
      items.forEach(it=>{const ok=r()<P.acc;ans[it.id]=pvAns(it,ok);if(ok)correct++;const sk=it.skill||'other';bySkill[sk]=bySkill[sk]||[0,0];bySkill[sk][1]++;if(ok)bySkill[sk][0]++;updateQueue(it,ok,i,false)});
      const pt=Object.values(D.paper||{}).reduce((a,s)=>a+((s&&s.items)||[]).length,0)||30;
      st.days[i]={web:{ids:items.map(x=>x.id),reviewIds:[],answers:ans,correct,total:items.length,bySkill,at},
        paper:{ticks:{},correct:Math.round(pt*P.acc),total:pt,by:{},writing:{},self:{},at}}}
    if(P.st)st.stats=JSON.parse(JSON.stringify(P.st));
    if(P.fin){st.final=pvTest('final',P.fin,r)}
  }finally{S=keep}
  return st}
function pvApply(){S=pvBuild(PV.sc);saveLocal();GATE_MIN=false;CUR_DAY=null;pvSave();go(VIEW==='catalog'?'catalog':'start')}

const PV_CSS=`.pd-tbl{border-collapse:collapse;width:100%;font-size:.95rem}.pd-tbl th,.pd-tbl td{border-bottom:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}.pd-tbl td:nth-child(3){width:58%;line-height:1.55}.pd-tbl td:nth-child(4){width:22%}.pd-st{font-size:.85rem;color:var(--muted)}.pd-src a{display:inline-block;margin:0 4px 4px 0}

.pv-bar{position:fixed;left:0;right:0;bottom:0;z-index:70;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 16px;background:#14303A;color:#fff;border-top:4px solid #FFD23F;font-size:.92rem;box-shadow:0 -4px 0 rgba(0,0,0,.12)}
.pv-bar label{display:flex;align-items:center;gap:6px;font-weight:600}
.pv-bar select{font:inherit;font-size:.9rem;border-radius:8px;border:2px solid #FFD23F;padding:4px 6px;background:#fff;color:#14303A;max-width:62vw}
.pv-bar .btn{min-height:36px;padding:6px 14px}
.pv-ck input{width:18px;height:18px;accent-color:#FFD23F}
.pv-tag{background:#FFD23F;color:#14303A;font-weight:800;border-radius:999px;padding:3px 12px}
.pv-note{font-size:.8rem;opacity:.8}
body.pv{padding-bottom:84px}
body.pv .h-toast{bottom:90px}body.pv .gate-pill{bottom:90px}
@media (min-width:1100px){body.pv header.top{bottom:84px}}
@media (max-width:700px){.pv-note,.pv-tag{display:none}.pv-bar label:first-of-type{flex:1 1 100%}.pv-bar label:first-of-type select{flex:1;max-width:none}.pv-bar{gap:6px 10px;padding:8px 10px}body.pv{padding-bottom:128px}body.pv .h-toast,body.pv .gate-pill{bottom:134px}}
.pv-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.pv-chip{all:unset;box-sizing:border-box;cursor:pointer;border:2px solid var(--ink);border-radius:10px;padding:5px 10px;background:var(--surface,#fff);font-weight:700;display:flex;flex-direction:column;line-height:1.15;max-width:150px}
.pv-chip small{font-weight:500;font-size:.72rem;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pv-chip[aria-selected="true"]{background:#FFD23F;color:#14303A}
.pv-chip:focus-visible{outline:3px solid var(--agent);outline-offset:2px}
.pv-sec{margin-top:12px}.pv-sec>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px}
.pv-sec>summary::before{content:'▸';font-size:1.1rem;transition:transform .15s}.pv-sec[open]>summary::before{transform:rotate(90deg)}
.pv-sec>summary h3{margin:0;font-size:1.12rem}
.pv-head{margin-top:12px}.pv-head h2{margin:.2em 0}
.pv-qs{padding-left:1.6em;margin:.4em 0}.pv-q{margin:0 0 12px;line-height:1.55}
.pv-qt{font-weight:600}.pv-meta{font-weight:400;font-size:.74rem;color:var(--muted,#667);margin-left:4px}
.pv-opts{margin:4px 0;padding-left:1.6em}.pv-opts li.ok{font-weight:700;color:#1B7A3E}
.pv-ans{margin-top:2px}.pv-ans b{color:#1B7A3E}
.pv-ex{font-size:.9rem;background:var(--surface2,#F3F7F8);border-radius:8px;padding:6px 10px;margin-top:4px}
.pv-dl{display:grid;grid-template-columns:minmax(90px,max-content) 1fr;gap:6px 14px;margin:.4em 0}
.pv-dl dt{font-weight:700;font-size:.85rem;color:var(--agent)}.pv-dl dd{margin:0;min-width:0}
.pv-dl .pv-dl{grid-template-columns:1fr}
@media (max-width:640px){.pv-dl{grid-template-columns:1fr;gap:2px}.pv-dl dd{margin-bottom:8px}}
.pv-ul{margin:.2em 0;padding-left:1.3em}.pv-blk{border-top:1px dashed var(--line,#ccd);padding-top:6px;margin-top:6px}
.pv-part{border-top:2px solid var(--line,#dde);padding-top:8px;margin-top:10px}.pv-part h4{margin:.2em 0 .4em;font-size:1.02rem}
.pv-pass{max-width:none}.pv-script p{margin:.2em 0}
.pv-tbl{width:100%;font-size:.9rem}.pv-tbl td,.pv-tbl th{vertical-align:top}
@media print{.pv-bar,header.top,.gate,.gate-pill,.h-toast,.pv-chips,.pv-cat .row{display:none!important}body.pv{padding:0}main.wrap{margin:0!important;max-width:none!important}html{background:#fff!important}.pv-sec{break-inside:auto;box-shadow:none}.pv-q{break-inside:avoid}}
`;
/* ---------- thanh công cụ ---------- */
function pvBar(){const b=document.createElement('div');b.className='pv-bar';b.setAttribute('role','region');b.setAttribute('aria-label','Công cụ xem trước cho giáo viên');
  b.innerHTML=`<span class="pv-tag">Xem trước · giáo viên</span>
   <label>Tình huống <select id="pvSc">${PV_SC.map(x=>`<option value="${x.k}" ${x.k===PV.sc?'selected':''}>${x.t}</option>`).join('')}</select></label>
   <label>Lớp <select id="pvGr">${[6,7,8,9].map(g=>`<option ${g==PV.grade?'selected':''}>${g}</option>`).join('')}</select></label>
   <label class="pv-ck"><input type="checkbox" id="pvOpen" ${PV.open?'checked':''}> Mở mọi buổi</label>
   <button class="btn hi" type="button" id="pvCat">Toàn bộ nội dung &amp; đáp án</button>
   <span class="pv-note">Dữ liệu ở đây là giả lập, không ghi vào tài khoản học sinh nào.</span>`;
  document.body.appendChild(b);document.body.classList.add('pv');
  b.querySelector('#pvSc').onchange=e=>{PV.sc=e.target.value;pvApply()};
  b.querySelector('#pvGr').onchange=e=>{PV.grade=+e.target.value;S.school=Object.assign(S.school||{},{grade:PV.grade});saveLocal();pvSave();go(VIEW)};
  b.querySelector('#pvOpen').onchange=e=>{PV.open=e.target.checked;pvSave();GATE_MIN=false;go(VIEW==='diag'?'start':VIEW)};
  b.querySelector('#pvCat').onclick=()=>go('catalog')}

/* ---------- Toàn bộ nội dung ---------- */
let PV_CAT='d1';
const LTR='ABCDEFGH';
const pvLabel=k=>({theme_en:'Chủ đề (Anh)',theme_vi:'Chủ đề',goal_vi:'Mục tiêu',minutes:'Phút',title:'Tên',title_vi:'Tên',intro_vi:'Giới thiệu',tip_vi:'Mẹo',instruction_vi:'Hướng dẫn',
  rule_vi:'Quy tắc',examples:'Ví dụ',bank:'Khung từ',text:'Bài đọc',task_en:'Đề (Anh)',task_vi:'Đề',model:'Bài mẫu',checklist_vi:'Danh sách tự kiểm',min_words:'Số từ tối thiểu',
  self_check_vi:'Tự đánh giá',hints:'Gợi ý',reading_gloss:'Chú giải bài đọc',writing_starters:'Câu mở đầu gợi ý',focus:'Trọng tâm',format:'Dạng bài',kind:'Kiểu',
  groups:'Nhóm',items:'Câu',name:'Tên',script:'Lời thoại',speakers:'Người nói',questions:'Câu hỏi',passage:'Bài đọc',level:'Mức',skill:'Kỹ năng',
  answer:'Đáp án',accept:'Chấp nhận thêm',explain_vi:'Giải thích',why_vi:'Vì sao',fix:'Sửa thành',ok:'Câu đúng?',sentence:'Câu',common_mistake_vi:'Lỗi hay gặp',hint_vi:'Gợi ý',
  base:'Từ gốc',family:'Họ từ',headings:'Tiêu đề',lines:'Dòng',paragraphs:'Đoạn',start:'Mở đầu',sort:'Game xếp nhóm',truefalse:'Game đúng hay sai',unjumble:'Game sắp xếp câu',voice:'Giọng',type:'Loại',tag:'Nhãn',
  word:'Từ',phrase:'Cụm',meaning_vi:'Nghĩa',example:'Ví dụ',pos:'Loại từ',ipa:'Phiên âm',day:'Buổi',passages:'Bài đọc',options:'Lựa chọn',
  nen:'Mức Nền tảng',chuan:'Mức Chuẩn',nang:'Mức Nâng cao',part1:'Phần 1',part2:'Phần 2',part3:'Phần 3'}[k]||k.replace(/_vi$/,'').replace(/_/g,' '));
function pvAnsTxt(it){const a=it.answer;
  if(Array.isArray(it.options)){let i=typeof a==='number'?a:(typeof a==='string'&&/^[A-H]$/.test(a)?LTR.indexOf(a):it.options.indexOf(a));
    return i>=0?`${LTR[i]}. ${it.options[i]}`:String(a)}
  const s=Array.isArray(a)?a.join(' / '):(a&&typeof a==='object'?JSON.stringify(a):String(a==null?'':a));
  return s+((it.accept&&it.accept.length)?` (chấp nhận thêm: ${it.accept.join(' / ')})`:'')}
function pvQ(it,i){const a=it.answer;let ci=-1;
  if(Array.isArray(it.options))ci=typeof a==='number'?a:(typeof a==='string'&&/^[A-H]$/.test(a)?LTR.indexOf(a):it.options.indexOf(a));
  const meta=[it.id,it.level,it.skill,it.from_day!=null?(it.from_day?'ôn từ buổi '+it.from_day:'ôn nền A2'):'',it.passage].filter(Boolean).map(esc).join(' · ');
  return `<li class="pv-q"><div class="pv-qt">${xU(it.q||it.question||it.sentence||'Chỗ trống')}${meta?` <span class="pv-meta">${meta}</span>`:''}</div>
   ${it.listen?`<div class="passage pv-pass"><b>Lời nghe:</b> ${esc(it.listen)}</div>`:''}
   ${Array.isArray(it.options)?`<ol class="pv-opts" type="A">${it.options.map((o,j)=>`<li class="${j===ci?'ok':''}">${xU(o)}${j===ci?' ✓':''}</li>`).join('')}</ol>`:''}
   ${a!=null&&!Array.isArray(it.options)?`<div class="pv-ans">Đáp án: <b>${esc(pvAnsTxt(it))}</b></div>`:''}
   ${it.hint_vi?`<div class="small muted">Gợi ý: ${fmtVi(it.hint_vi)}</div>`:''}${(it.explain_vi||it.why_vi)?`<div class="pv-ex">${fmtVi(it.explain_vi||it.why_vi)}</div>`:''}</li>`}
const isQ=o=>o&&typeof o==='object'&&!Array.isArray(o)&&('answer' in o);
function pvGen(v,k){
  if(v==null||v==='')return'';
  if(typeof v==='boolean')return `<span>${v?'Có':'Không'}</span>`;
  if(typeof v!=='object'){const s=String(v);return /\n/.test(s)&&s.length>80?`<div class="passage pv-pass">${esc(s)}</div>`:`<span>${k&&/_vi$/.test(k)?fmtVi(s):esc(s)}</span>`}
  if(Array.isArray(v)){
    if(v.every(isQ))return `<ol class="pv-qs">${v.map(pvQ).join('')}</ol>`;
    if(v.every(x=>x&&typeof x==='object'&&'ok' in x&&'s' in x))return `<ol class="pv-qs">${v.map(x=>`<li class="pv-q"><div class="pv-qt">${esc(x.s)}</div><div class="pv-ans">${x.ok?'<b>Câu đúng</b>':`Câu sai · sửa thành: <b>${esc(x.fix||'')}</b>`}</div>${x.why_vi?`<div class="pv-ex">${fmtVi(x.why_vi)}</div>`:''}</li>`).join('')}</ol>`;
    if(v.every(x=>x&&typeof x==='object'&&'t' in x&&('s' in x)))return `<div class="pv-script">${v.map(x=>`<p><b>${esc(typeof x.s==='number'?'Người '+(x.s+1):x.s)}:</b> ${esc(x.t)}</p>`).join('')}</div>`;
    if(v.every(x=>typeof x!=='object'))return `<ul class="pv-ul">${v.map(x=>`<li>${k&&/_vi$/.test(k)?fmtVi(String(x)):esc(x)}</li>`).join('')}</ul>`;
    if(v.every(x=>Array.isArray(x)&&x.every(y=>typeof y!=='object')))return `<ul class="pv-ul">${v.map(x=>`<li>${x.map(esc).join(' → ')}</li>`).join('')}</ul>`;
    return v.map(x=>`<div class="pv-blk">${pvGen(x)}</div>`).join('')}
  if(isQ(v))return `<ol class="pv-qs">${pvQ(v)}</ol>`;
  return `<dl class="pv-dl">${Object.entries(v).filter(([kk])=>kk!=='id').map(([kk,vv])=>`<dt>${esc(pvLabel(kk))}</dt><dd>${pvGen(vv,kk)}</dd>`).join('')}</dl>`}
const pvSec=(t,body,open)=>body?`<details class="card pv-sec" ${open?'open':''}><summary><h3>${t}</h3></summary>${body}</details>`:'';
function pvWords(arr,ph){if(!arr||!arr.length)return'';
  return `<div class="tbl-wrap"><table class="pv-tbl"><thead><tr><th>${ph?'Cụm':'Từ'}</th>${ph?'':'<th>Loại</th><th>Phiên âm</th>'}<th>Nghĩa</th><th>Ví dụ</th></tr></thead><tbody>${arr.map(w=>`<tr><td><b>${esc(w.word||w.phrase)}</b></td>${ph?'':`<td>${esc(w.pos||'')}</td><td>${esc(w.ipa||'')}</td>`}<td>${esc(w.meaning_vi||'')}</td><td>${esc(w.example||'')}${w.example_vi?`<br><span class="muted">${esc(w.example_vi)}</span>`:''}</td></tr>`).join('')}</tbody></table></div>`}
function pvDay(n){const D=DAYS[n-1],W=(C.web||{})[n]||{},nn=String(n).padStart(2,'0');const P=D.paper||{};
  const pdf=`<p class="row">${[['','Bài giấy mức Chuẩn'],['-nen','mức Nền tảng'],['-nang','mức Nâng cao']].map(([s,t])=>`<a class="btn ghost" href="pdf/buoi-${nn}${s}.pdf" target="_blank" rel="noopener">PDF ${t}</a>`).join('')}</p>`;
  let h=`<div class="card pv-head"><p class="eyebrow">Buổi ${n} · ${D.type==='review'?'Vòng ôn':'Buổi thường'} · ${D.minutes||30} phút giấy</p><h2>${esc(D.theme_vi)} <span class="muted">· ${esc(D.theme_en||'')}</span></h2><p>${fmtVi(D.goal_vi||'')}</p>${D.can_do_vi?`<p class="small"><b>Sau buổi này cậu có thể:</b></p><ul class="pv-ul small">${D.can_do_vi.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${pdf}</div>`;
  h+=pvSec('Từ mới và cụm động từ',pvWords(D.vocab)+pvWords(D.phrasal,true),true);
  h+=pvSec('Ngữ pháp',D.grammar?pvGen(D.grammar):'');
  h+=pvSec('Cấu tạo từ',D.wordform?pvGen(D.wordform):'');
  h+=pvSec(`Kiểm tra cuối buổi trên web (${(D.web_check||[]).length} câu)`,(D.web_check||[]).length?`<ol class="pv-qs">${D.web_check.map(pvQ).join('')}</ol>`:'',true);
  const ord=Object.keys(P);
  h+=pvSec('Bài giấy (bản Chuẩn) kèm đáp án',ord.map(k=>`<div class="pv-part"><h4>${esc(SECTION_NAMES[k]||(k==='F_writing'?'F · Viết':k==='self_check_vi'?'Tự đánh giá':k))}</h4>${pvGen(P[k],k)}</div>`).join(''));
  if(W.paper_plus)h+=pvSec('Bài giấy · phần thêm cho mức Nâng cao',pvGen(W.paper_plus));
  if(W.paper_easy)h+=pvSec('Bài giấy · gợi ý cho mức Nền tảng',pvGen(W.paper_easy));
  if(W.grammar_games)h+=pvSec('Game ngữ pháp',pvGen(W.grammar_games));
  [['exam','Dạng bài thi trên web · mức Chuẩn'],['exam_easy','Dạng bài thi trên web · mức Nền tảng'],['exam_plus','Dạng bài thi trên web · mức Nâng cao']].forEach(([k,t])=>{if(W[k])h+=pvSec(t,pvGen(W[k]))});
  if(W.listening)h+=pvSec('Bài nghe (lời thoại và câu hỏi)',pvGen(W.listening));
  return h}
function pvTestHTML(kind){const T=TESTS[kind];
  return `<div class="card pv-head"><p class="eyebrow">${T.minutes} phút · ${T.items.length} câu</p><h2>${esc(T.title_vi)}</h2></div>`+
   pvSec('Bài đọc',(T.passages||[]).map(p=>`<p class="small"><b>${esc(p.id)}</b> · mức ${esc(p.level)}</p><div class="passage pv-pass">${esc(p.text)}</div>`).join(''),true)+
   ['A2','B1','B2'].map(L=>pvSec(`Câu mức ${L}`,`<ol class="pv-qs">${T.items.filter(i=>i.level===L).map(pvQ).join('')}</ol>`,true)).join('')}
function pvPackHTML(){const P=C.local_pack||{};const plan=localPlan();const RG=REG();
  const sched=Object.keys(plan).sort((a,b)=>a-b).map(d=>`<li>Buổi ${d}: ${plan[d].map(x=>esc(LP_NAME[x.f])+' '+(x.i+1)).join(', ')}</li>`).join('');
  const blk=(f,B)=>{if(f==='gap_sent'||B.kind==='gap_sent')return `<div class="passage pv-pass">${esc(B.text)}</div><ol class="pv-opts" type="A">${B.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol><ol class="pv-qs">${B.items.map((it,i)=>`<li class="pv-q"><div class="pv-ans">Chỗ (${i+1}): <b>${LTR[it.answer]}. ${esc(B.options[it.answer])}</b></div><div class="pv-ex">${fmtVi(it.explain_vi||'')}</div></li>`).join('')}</ol>`;
    return pvGen(B)};
  return `<div class="card pv-head"><p class="eyebrow">Gói bù theo đề từng sở</p><h2>Dạng bài riêng của đề ${esc(RG.name)}</h2><p class="small">Đang xem theo khu vực <b>${esc(RG.name)}</b> (đổi khu vực ở thanh trên để xem lịch của sở khác). Dạng được chọn: ${(RG.pack||[]).map(f=>esc(LP_NAME[f])).join(', ')}.</p><ul class="pv-ul small">${sched}</ul></div>`+
   Object.keys(P).map(f=>pvSec(`${esc(LP_NAME[f]||f)} (${P[f].length} bài)${(RG.pack||[]).includes(f)?' · sở này dùng':''}`,P[f].map((B,i)=>`<div class="pv-part"><h4>Bài ${i+1} · ${esc(B.theme||'')}</h4>${blk(f,B)}</div>`).join(''),(RG.pack||[]).includes(f))).join('')}
function vCatalog(){const tabs=[['diag','Đầu vào']].concat(DAYS.map(d=>['d'+d.day,'B'+d.day])).concat([['final','Đầu ra'],['pack','Dạng riêng theo sở'],['pred','Đề dự đoán']]);
  M().innerHTML=`<section class="pv-cat"><div class="card"><p class="eyebrow">Bản cho giáo viên</p><h2>Toàn bộ nội dung và đáp án</h2>
   <p class="small muted">Mọi câu hỏi trên web, bài giấy, game và bài nghe của từng buổi, kèm đáp án và giải thích đúng như học sinh thấy. Bấm từng mục để mở, hoặc dùng nút In để in hay lưu PDF.</p>
   <div class="pv-chips" role="tablist">${tabs.map(([k,t])=>`<button type="button" class="pv-chip" data-k="${k}" aria-selected="${k===PV_CAT}">${t}${k[0]==='d'&&k!=='diag'?`<small>${esc(DAYS[+k.slice(1)-1].theme_vi)}</small>`:''}</button>`).join('')}</div>
   <div class="row"><button class="btn ghost" type="button" id="pvAll">Mở hết các mục</button><button class="btn ghost" type="button" id="pvPrint">In trang này</button></div></div>
   <div id="pvBody"></div></section>`;
  const show=()=>{$('#pvBody').innerHTML=PV_CAT==='diag'?pvTestHTML('diag'):PV_CAT==='final'?pvTestHTML('final'):PV_CAT==='pack'?pvPackHTML():PV_CAT==='pred'?'<div class="card" id="pvPred"><p class="muted">Đang tải…</p></div>':pvDay(+PV_CAT.slice(1));
    if(PV_CAT==='pred')loadInfo().then(D=>{const el=$('#pvPred');if(el)el.innerHTML=`<p class="eyebrow">Chỉ giáo viên thấy</p><h2>Đề dự đoán theo sở: độ tin cậy và lý do</h2>${(D&&D.pred_html)||'<p>Chưa có dữ liệu.</p>'}`});
    document.querySelectorAll('.pv-chip').forEach(b=>b.setAttribute('aria-selected',b.dataset.k===PV_CAT?'true':'false'))};
  M().querySelector('.pv-chips').onclick=e=>{const b=e.target.closest('.pv-chip');if(b){PV_CAT=b.dataset.k;show()}};
  $('#pvAll').onclick=()=>document.querySelectorAll('#pvBody details').forEach(d=>d.open=true);
  $('#pvPrint').onclick=()=>{document.querySelectorAll('#pvBody details').forEach(d=>d.open=true);setTimeout(()=>window.print(),50)};
  show()}
views.catalog=vCatalog;
(function pvInit(){
  const stl=document.createElement('style');stl.textContent=PV_CSS;document.head.appendChild(stl);
  const nav=document.getElementById('tabs');const b=document.createElement('button');b.setAttribute('role','tab');b.dataset.view='catalog';
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/></svg>Nội dung (cô)';
  nav.appendChild(b);
  const br=document.querySelector('.brand span');if(br)br.textContent='Bản xem trước cho giáo viên';
  /* lần đầu mở: dựng tình huống đã chọn */
  /* ?mo-het: mở hết mọi khoá, dùng học sinh giả lập đã xong 14 buổi và bài đầu ra (đổi bằng &tinh-huong=moi|phac|nhanh|nhip|cham|xong) */
  const qp=new URLSearchParams(location.search);
  if(qp.has('mo-het')){const k=qp.get('tinh-huong');PV.open=true;PV.sc=PV_SC.some(x=>x.k===k)?k:'xong';pvSave();S=pvBuild(PV.sc);saveLocal()}
  else{let have=false;try{have=!!localStorage.getItem(KEY)}catch(e){}
  if(!have){S=pvBuild(PV.sc);saveLocal()}}
  pvBar()})();
