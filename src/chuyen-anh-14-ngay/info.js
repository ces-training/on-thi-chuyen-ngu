/* ================= PHỄU: CHỌN KHU VỰC → THÔNG TIN THI → THỬ 3 CÂU → MỜI BÀI ĐẦU VÀO =================
   - Lần đầu mở trang: popup hỏi khu vực (34 tỉnh, thành mới). Chọn xong mới thấy thông tin, và chỉ của khu vực đó.
   - Thanh công cụ có ô chọn khu vực để đổi bất cứ lúc nào.
   - Tab "Thông tin thi": lịch thi, trường và điểm chuẩn, công thức, đề, mẹo, chia sẻ thật, kinh nghiệm toàn quốc,
     3 câu thử dạng đề, rồi mời làm bài đầu vào. Dữ liệu chi tiết tải riêng từ regions-info.json. */
const VUNG_GROUPS=[['Miền Bắc',['ha-noi','hai-phong','quang-ninh','bac-ninh','hung-yen','ninh-binh','phu-tho','thai-nguyen','tuyen-quang','lao-cai','cao-bang','lang-son','dien-bien','lai-chau','son-la']],
 ['Miền Trung và Tây Nguyên',['thanh-hoa','nghe-an','ha-tinh','quang-tri','hue','da-nang','quang-ngai','gia-lai','dak-lak','khanh-hoa','lam-dong']],
 ['Miền Nam',['tp-ho-chi-minh','dong-nai','tay-ninh','can-tho','vinh-long','dong-thap','an-giang','ca-mau']]];
function regionOptionsHTML(cur){const by=Object.fromEntries(REGION_LIST.map(r=>[r.slug,r]));
  return VUNG_GROUPS.map(([v,ks])=>`<optgroup label="${v}">${ks.filter(k=>by[k]&&by[k].has).map(k=>{const r=by[k];return `<option value="${k}" ${k===cur?'selected':''}>${esc(r.name)}${r.merged_from&&r.merged_from.length?' ('+esc(r.merged_from.slice(1).join(', '))+')':''}</option>`}).join('')}</optgroup>`).join('')}
function setRegion(slug){if(!REGIONS[slug])return;S.region=slug;S.regionSet=true;S.course=Object.assign({},S.course||{});
  const G=REG().goals||[];if(!G.some(g=>g.k===S.course.goal))S.course.goal=REG().goal_default||(G[0]||{}).k;save();renderBrand();renderRegionBar()}
/* ô chọn khu vực trên thanh công cụ */
function renderRegionBar(){let b=document.getElementById('regBar');if(!b){const tb=document.querySelector('header.top .topbar');if(!tb)return;b=document.createElement('label');b.id='regBar';b.className='regbar';tb.appendChild(b)}
  b.innerHTML=`<span>Xem tỉnh, thành khác</span><select id="regTop" aria-label="Xem thông tin thi của tỉnh, thành khác" title="Bấm để chọn tỉnh, thành khác">${regionOptionsHTML(regionKey())}</select>`;
  b.querySelector('select').onchange=e=>{setRegion(e.target.value);GATE_MIN=false;go(VIEW==='diag'?'exam':VIEW)}}
/* popup lần đầu: hỏi khu vực */
function regionGate(){if((S.regionSet&&S.gradeSet)||PREVIEW)return false;let g=document.getElementById('regGate');if(g)return true;
  g=document.createElement('div');g.id='regGate';g.className='gate';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-labelledby','regT');
  g.innerHTML=`<div class="gate-card paper tape"><div class="gate-top">${hungFig()}<div><p class="eyebrow">Chào cậu, chào cô chú!</p><h2 id="regT">Cậu quan tâm bộ đề, chương trình ôn thi chuyên ngữ miễn phí của tỉnh, thành nào?</h2></div></div>
   <p>Tớ là Hùng. Tớ đã gom lịch thi, trường, điểm chuẩn, cấu trúc đề chuyên Anh và chia sẻ của các anh chị đỗ chuyên ở cả 34 tỉnh, thành. Trả lời 2 câu dưới đây để tớ chỉ hiện đúng phần của cậu nhé. Cô chú phụ huynh cũng chọn ở đây ạ.</p>
   <label class="fld"><span class="small muted">1. Tỉnh, thành (theo địa giới mới từ 1/7/2025)</span><select id="regFirst">${regionOptionsHTML(regionKey())}</select></label>
   <label class="fld"><span class="small muted">2. Bạn chuẩn bị ôn chuyên ngữ đang học lớp mấy?</span><select id="gradeFirst"><option value="">Chọn lớp</option><option value="5">Lớp 5 trở xuống</option>${[6,7,8,9].map(g=>`<option value="${g}" ${S.gradeSet&&gradeNow()===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
   <div class="row" style="margin-top:12px"><button class="btn hi big" type="button" id="regGo">Xem thông tin thi</button></div>
   <p class="small muted">Muốn xem tỉnh, thành khác lúc nào cũng được: bấm ô "Xem tỉnh, thành khác" trên thanh công cụ.</p></div>`;
  document.body.appendChild(g);document.body.classList.add('gated');
  const sel=g.querySelector('#regFirst'),gr=g.querySelector('#gradeFirst'),btn=g.querySelector('#regGo');
  const lab=()=>{btn.disabled=!gr.value;btn.textContent=gr.value?'Xem thông tin thi ở '+(REGION_LIST.find(r=>r.slug===sel.value)||{}).name:'Chọn lớp để tiếp tục'};lab();sel.onchange=lab;gr.onchange=lab;
  btn.onclick=()=>{if(!gr.value)return;const gv=+gr.value;S.gradeEarly=gv<6;setGrade(gv<6?6:gv);S.gradeSet=true;setRegion(sel.value);g.remove();document.body.classList.remove('gated');go('exam')};
  try{sel.focus({preventScroll:true})}catch(e){}
  return true}

/* ----- dữ liệu chi tiết (tải khi cần) ----- */
let INFO=null,INFO_P=null;
function loadInfo(){if(INFO)return Promise.resolve(INFO);if(!INFO_P)INFO_P=fetch('regions-info.json').then(r=>r.json()).then(d=>(INFO=d)).catch(()=>{INFO_P=null;return null});return INFO_P}
const fN=x=>x==null?'—':(Math.round(x*100)/100).toLocaleString('vi-VN');
function cutTableHTML(schools){
  const ys=[...new Set(schools.flatMap(s=>(s.classes||[]).flatMap(c=>Object.keys(c.cut||{}))))].sort().filter(y=>+y>=2022);
  const rows=schools.flatMap(s=>(s.classes||[]).map(c=>({s,c})));
  if(!rows.length)return '<p class="muted">Chưa có dữ liệu trường.</p>';
  return `<div class="tbl-wrap"><table class="ix-tbl"><thead><tr><th>Trường</th><th>Lớp</th>${ys.map(y=>`<th class="n">${y}</th>`).join('')}</tr></thead><tbody>${rows.map(({s,c})=>`<tr><td><b>${esc(s.name)}</b>${s.old_province?`<br><span class="small muted">${esc(s.old_province)}</span>`:''}</td><td>${esc(c.lang)}${c.admit_by_english?'<br><span class="small muted">xét bằng điểm Anh</span>':''}</td>${ys.map(y=>{const v=(c.cut||{})[y],sc=(c.scale||{})[y];return `<td class="n">${v==null?'—':fN(v)+(sc?`<span class="small muted">/${sc}</span>`:'')}</td>`}).join('')}</tr>${c.note?`<tr class="ix-note"><td></td><td colspan="${ys.length+1}"><details><summary class="small">Ghi chú về số liệu</summary><span class="small muted">${esc(c.note)}</span></details></td></tr>`:''}`).join('')}</tbody></table></div><p class="small muted">Điểm chuẩn ghi theo thang của từng năm; năm đổi công thức thì không so trực tiếp được.</p>`}
const CONF_VI={'cao':'cao','trung bình':'trung bình','thấp':'thấp'};
/* học sinh, phụ huynh chỉ thấy nhãn; độ tin cậy, lý do và nguồn nằm ở trang của cô và bản xem trước cho giáo viên */
function predHTML(Q){if(!Q)return '';
  const t=!Q.used?`<b>Chưa có đề chuyên Anh công khai.</b> Sở chưa đăng đề hay cấu trúc đề chuyên Anh; tớ chưa đủ thông tin để dự đoán khung đề.`
    :Q.confidence==='cao'?`<b>Cấu trúc theo thông báo của sở.</b> Sở chưa đăng đề mẫu.`
    :`<b>Đề dự đoán.</b> Sở chưa công bố cấu trúc đề chuyên Anh; khung dưới đây tớ dự đoán từ đề các năm trước${(REG().merged_from||[]).length>1?' của các tỉnh cũ nay thuộc sở':''}.`;
  return `<div class="ix-pred"><p>${t}</p></div>`}
function paperCardHTML(P,FMT){if(!P)return '';const sec=P.sections||[];
  return predHTML(P.predicted)+`<div class="ix-kpis">${P.minutes?`<span><b>${P.minutes}</b> phút</span>`:''}<span>Nghe: <b>${P.has_listening==null?'—':P.has_listening?'có':'không'}</b></span>${P.essay_words?`<span>Bài viết <b>~${P.essay_words}</b> từ</span>`:''}${P.difficulty?`<span>Độ khó khoảng <b>${esc(P.difficulty)}</b></span>`:''}</div>
   ${P.difficulty_evidence?`<p class="small">${esc(P.difficulty_evidence)}</p>`:''}
   ${sec.length?`<div class="tbl-wrap"><table class="ix-tbl"><thead><tr><th>Dạng bài</th><th class="n">Số câu</th><th class="n">Điểm</th><th>Ghi chú</th></tr></thead><tbody>${sec.map(x=>`<tr><td>${esc(FMT[x.format]||x.format)}</td><td class="n">${x.items==null?'—':x.items}</td><td class="n">${x.points==null?'—':fN(x.points)}</td><td class="small">${esc(x.note||'')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small">Chưa tìm được cấu trúc đề công khai.</p>'}
   ${(P.sample_links||[]).length?`<p class="small"><b>Đề và đáp án các năm:</b> ${P.sample_links.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">đề ${i+1}</a>`).join(' · ')}</p>`:''}`}
function storiesCardHTML(st){if(!st||!st.length)return '';
  return st.map(s=>`<div class="ix-story"><b>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)}</b><span class="small muted">${esc([s.who,s.school,s.year].filter(Boolean).join(' · '))}</span><p>${esc(s.summary||'')}</p>${(s.takeaways||[]).length?`<ul>${s.takeaways.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</div>`).join('')}
/* 3 câu thử: lấy câu trắc nghiệm của buổi 1 (từ vựng, ngữ pháp, dạng đề) */
function tasteItems(){const W=(DAYS[0].web_check||[]).filter(i=>i.type==='mcq');const pick=[];['vocab','grammar','exam','wordform'].forEach(k=>{const it=W.find(i=>i.skill===k&&!pick.includes(i));if(it&&pick.length<3)pick.push(it)});while(pick.length<3&&W[pick.length])pick.push(W[pick.length]);return pick}
function tasteHTML(){const its=tasteItems();return `<form id="tasteForm">${its.map((it,i)=>renderQ(it,i+1)).join('')}<div class="row"><button class="btn hi" type="submit">Chấm 3 câu</button><span class="small muted" id="tasteMsg"></span></div></form>`}
function wireTaste(){const f=$('#tasteForm');if(!f)return;wireOptionHighlight(f);const its=tasteItems();
  f.addEventListener('submit',e=>{e.preventDefault();let c=0;its.forEach(it=>{const v=readAnswer(f,it);if(showFeedback(f,it,v))c++});f.querySelector('button[type=submit]').disabled=true;
    $('#tasteMsg').innerHTML=`Cậu đúng <b>${c}/3</b>. ${c===3?'Ngon lành! Bài đầu vào sẽ cho tớ biết cậu đang ở level nào thật sự.':'Mỗi câu đều có giải thích như trên: đó là cách 14 buổi học vận hành, câu sai sẽ quay lại cho tới khi cậu nhớ chắc.'}`;
    const cta=$('#ixCta');if(cta)cta.scrollIntoView({behavior:'smooth',block:'center'})})}
function ctaHTML(RG,best){
  if(S.diag)return `<div class="card hi-card ix-cta" id="ixCta"><h3>Cậu đã có bài đầu vào rồi</h3><p>Xem khả năng đỗ từng trường ở ${esc(RG.name)} theo đúng công thức của sở, hoặc học tiếp buổi ${nextDay()}.</p><div class="row"><button class="btn hi" type="button" data-go="school">Xem khả năng đỗ</button><button class="btn ghost" type="button" data-go="days">Học buổi ${nextDay()}</button></div></div>`;
  return `<div class="card hi-card ix-cta" id="ixCta"><div class="gate-top">${hungFig('sm')}<div><p class="eyebrow">Bước tiếp theo</p><h3>Cậu đang ở đâu so với điểm chuẩn ${best?esc(best):'các trường chuyên ở '+esc(RG.name)}?</h3></div></div>
   <p>Làm bài đầu vào 45 câu (khoảng 35 phút, có 5 câu nghe). Tớ sẽ cho cậu biết: level tiếng Anh hiện tại, khả năng đỗ từng trường ở ${esc(RG.name)} theo đúng công thức xét tuyển, và mở 14 buổi học thử theo mức của cậu.</p>
   <div class="row"><button class="btn hi big" type="button" data-go="diag">Làm bài đầu vào (35 phút)</button></div></div>`}
function vExam(){const RG=REG();
  M().innerHTML=`<section class="view ix"><div><p class="eyebrow">Thông tin thi chuyên Anh</p><h2>${esc(RG.name)}</h2>${RG.merged_from&&RG.merged_from.length?`<p class="lead">Gồm các tỉnh, thành cũ: ${esc(RG.merged_from.join(', '))}.</p>`:''}
   <div class="hung-say">${hungFig('sm')}<p>Đây là những gì tớ gom được về kỳ thi vào lớp 10 chuyên Anh ở ${esc(RG.name)}: lịch thi, trường và điểm chuẩn, công thức, đề, và chia sẻ của các anh chị đã đỗ. Đọc xong, thử 3 câu ở dưới rồi làm bài đầu vào để biết cậu đang ở đâu nhé.</p></div></div>
   ${earlyMsgHTML()}
   <div id="ixBody"><div class="card"><p class="muted">Đang tải thông tin…</p></div></div></section>`;
  loadInfo().then(D=>{if(VIEW!=='exam'||regionKey()!==RG.slug)return;
    const R=D&&D.regions&&D.regions[RG.slug];const FMT=(D&&D.fmt)||{};
    const best=(RG.goals||[])[0]?RG.goals[0].name:null;
    let h='';
    if(RG.slug==='ha-noi'){
      const rows=regionOpts().filter(o=>o.lang==='Anh');
      h+=`<div class="card"><h3>Các kỳ thi và trường</h3><ul>${Object.values(RG.exams).map(e=>`<li><b>${esc(e.label)}</b> (${esc(e.date)}). ${esc(e.rule)}</li>`).join('')}</ul>
       <div class="tbl-wrap"><table class="ix-tbl"><thead><tr><th>Trường</th>${rows[0].years.map(y=>`<th class="n">${y}</th>`).join('')}</tr></thead><tbody>${rows.map(o=>`<tr><td><b>${esc(o.school)}</b></td>${o.years.map((y,i)=>`<td class="n">${fN(o.cut[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
       <p class="small muted">Điểm chuẩn lớp chuyên Anh, thang 50 (Toán + Văn + Anh chung + Anh chuyên × 2).</p>
       <p><a class="btn ghost" href="../tuyen-sinh/">Xem đầy đủ: công thức, bảng điểm học sinh đỗ, kinh nghiệm, tài liệu ôn ở Hà Nội</a></p></div>`;
    }else if(R){
      const ex=R.exam_2026||{},P=R.paper||{};const F=R.formula_raw||{};
      h+=`<div class="card"><h3>Tóm tắt nhanh</h3><div class="ix-kpis"><span>Thi năm 2026: <b>${esc(String(ex.dates||'—').split(/[;(]/)[0].slice(0,60))}</b></span><span><b>${(R.schools_raw||[]).length}</b> trường chuyên</span>${F.max?`<span>Thang xét tuyển <b>${F.max}</b></span>`:''}${P.difficulty?`<span>Đề chuyên Anh khoảng <b>${esc(P.difficulty)}</b></span>`:''}<span>Nghe: <b>${P.has_listening==null?'—':P.has_listening?'có':'không'}</b></span></div>
        <dl class="ix-dl"><dt>Cách tổ chức</dt><dd>${esc(ex.organisation||'—')}</dd><dt>Năm 2027</dt><dd>${esc(R.plan_2027||'Sở chưa công bố (đến 10/2026).')}</dd></dl></div>`;
      h+=`<div class="card"><h3>Trường và điểm chuẩn lớp chuyên Anh</h3>${cutTableHTML(R.schools_raw||[])}</div>`;
      h+=`<div class="card"><h3>Công thức xét tuyển</h3><p><b>${esc(F.text||'')}</b></p>${F.conditions?`<p class="small">${esc(F.conditions)}</p>`:''}${R.nv_rule?`<p class="small"><b>Nguyện vọng:</b> ${esc(R.nv_rule)}</p>`:''}</div>`;
      h+=`<div class="card"><h3>Đề chuyên Anh</h3>${paperCardHTML(P,FMT)}</div>`;
      h+=coverageCardHTML();
    }
    h+=`<div class="card"><h3>Thử nhanh 3 câu</h3><p class="small muted">Câu lấy từ buổi 1 của chương trình 14 buổi. Chấm xong có giải thích từng câu.</p>${tasteHTML()}</div>`;
    h+=ctaHTML(RG,best);
    if(R&&(R.prep_tips||[]).length)h+=`<div class="card"><h3>Ôn sát đề ${esc(RG.name)}</h3><ul>${R.prep_tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`;
    if(R&&(R.stories||[]).length)h+=`<div class="card"><h3>Chia sẻ của người đi trước</h3>${storiesCardHTML(R.stories)}</div>`;
    (R&&R.uni||[]).forEach(u=>{h+=`<div class="card"><p class="eyebrow">Trường thuộc đại học, thi riêng</p><h3>${esc(u.name)}</h3>${(u.formula_raw||{}).text?`<p><b>${esc(u.formula_raw.text)}</b></p>`:''}${cutTableHTML(u.schools_raw||[])}<h4>Đề chuyên Anh</h4>${paperCardHTML(u.paper,FMT)}${storiesCardHTML(u.stories)}</div>`});
    if(D&&D.national)h+=`<details class="card ix-nat"><summary><h3>Kinh nghiệm ôn chuyên Anh trên cả nước</h3></summary><div class="ix-natb">${D.national}</div></details>`;
    if(R)h+=`<details class="card"><summary><h3>Còn thiếu và nguồn</h3></summary>${(R.gaps||[]).length?`<p class="small"><b>Còn thiếu:</b></p><ul class="small">${R.gaps.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:''}<p class="small"><b>Nguồn:</b></p><ol class="small ix-src">${(R.sources||[]).concat(...(R.uni||[]).map(u=>u.sources||[])).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title||s.url)}</a></li>`).join('')}</ol><p class="small muted">Tổng hợp từ báo chí, website sở và trường, cập nhật ${esc(D.updated||'')}. Trước khi đăng ký, cả nhà nên đọc văn bản tuyển sinh chính thức của sở trong năm thi.</p></details>`;
    $('#ixBody').innerHTML=h;wireTaste();
    $('#ixBody').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  });
}
views.exam=vExam;
(function(){const st=document.createElement('style');st.textContent=`
.regbar{display:flex;flex-direction:column;gap:4px;font-size:.95rem;font-weight:700;color:var(--ink);min-width:170px;line-height:1.25}
.regbar select{font:inherit;font-size:1.08rem;font-weight:800;color:var(--ink);background:var(--gold-tint);border:2.5px solid var(--ink);border-radius:12px;padding:9px 8px;max-width:100%;cursor:pointer;box-shadow:0 3px 0 var(--ink)}
.regbar select:hover{background:var(--gold)}
@media (min-width:1100px){.regbar{width:100%;min-width:0;margin-top:6px}.regbar span{text-align:center}}
@media (max-width:600px){.regbar{min-width:0;max-width:46vw}.regbar span{display:none}.regbar select{font-size:.95rem;padding:6px}}
.ix .card{margin-top:14px}.ix-tbl{width:100%;font-size:.92rem}.ix-tbl td,.ix-tbl th{vertical-align:top}.ix-tbl td.n,.ix-tbl th.n{text-align:right;white-space:nowrap}
.ix-tbl td:first-child{min-width:150px}
.ix-pred{margin:0 0 12px;padding:10px 14px;border-radius:12px;background:#FFF6D6;color:#4a3b00;border:1.5px solid #e9cf6a}.ix-pred a{color:inherit}
.ix-kpis{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}.ix-kpis span{background:var(--agent-tint);border-radius:999px;padding:4px 12px;font-size:.92rem}
.ix-dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:0}.ix-dl dt{font-weight:700;color:var(--ink-2)}.ix-dl dd{margin:0}
@media (max-width:560px){.ix-dl{grid-template-columns:1fr}}
.ix-story{border-left:4px solid var(--agent);padding:4px 0 4px 12px;margin:12px 0}.ix-story b,.ix-story span{display:block}.ix-story p{margin:.3em 0}.ix-story ul{margin:0;padding-left:1.2em}
.ix-cta{border:3px solid var(--ink)!important}
.ix details>summary{cursor:pointer;list-style:none}.ix details>summary h3{display:inline;margin:0}.ix details>summary::before{content:'▸ ';color:var(--agent)}.ix details[open]>summary::before{content:'▾ '}
.ix-natb h2{font-size:1.2rem;margin:16px 0 6px}.ix-natb h3{font-size:1.02rem;margin:12px 0 4px}.ix-natb ul{margin:0 0 6px;padding-left:1.2em}.ix-natb table{width:100%;font-size:.9rem}
.ix-src{word-break:break-word;padding-left:1.4em}
#regGate .fld select{width:100%;font:inherit;font-size:1.05rem;padding:10px;border:2px solid var(--ink);border-radius:12px;background:var(--surface);color:var(--ink)}
`;document.head.appendChild(st)})();
