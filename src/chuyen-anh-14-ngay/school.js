/* ----- Chọn trường (school recommender) -----
   Inserted into template.html before the "share code" block by build.py.
   Uses: S, save, $, esc, M, agg, efficiency, ENTRY_H, LEVELS, levelOfHours, CONV, STUDY_FACTOR, pct. */
const SCHOOL_OPTS = __SCHOOLS__;
const LANG_VI = {Anh:'tiếng Anh',Nga:'tiếng Nga',Phap:'tiếng Pháp',Trung:'tiếng Trung',Duc:'tiếng Đức',Nhat:'tiếng Nhật',Han:'tiếng Hàn'};
const LANG_NAME = {Anh:'Anh',Nga:'Nga',Phap:'Pháp',Trung:'Trung',Duc:'Đức',Nhat:'Nhật',Han:'Hàn'};
/* Chuyên paper score ↔ guided hours (inferred from teacher/centre ratings of paper difficulty; ±half a band). */
const SCORE_MAP = {
  so:  [[190,2],[280,3],[375,4],[470,5],[560,6],[660,7],[760,8],[850,9],[950,9.3]],
  cnn: [[190,2.3],[280,3.3],[375,4.3],[450,5],[530,6],[610,7],[720,8],[830,9],[950,9.3]]
};
function scoreFromHours(h,kind){
  const p=SCORE_MAP[kind];if(h<=p[0][0])return Math.max(0,p[0][1]*h/p[0][0]);
  for(let i=1;i<p.length;i++){if(h<=p[i][0]){const a=p[i-1],b=p[i];return a[1]+(b[1]-a[1])*(h-a[0])/(b[0]-a[0])}}
  return p[p.length-1][1];
}
const ACH_CAP=9.3; // thủ khoa các năm đạt 8,8–9,7 môn chuyên
const r1=x=>Math.round(x*10)/10, r2=x=>Math.round(x*100)/100;
const fmtN=x=>(Math.round(x*100)/100).toLocaleString('vi-VN');
function phi(z){const t=1/(1+0.2316419*Math.abs(z));const d=0.3989423*Math.exp(-z*z/2);const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function examDateFor(grade){const now=new Date();const syEnd=now.getMonth()>=7?now.getFullYear()+1:now.getFullYear();return new Date(syEnd+(9-grade),5,1)}
function blankSchool(){return {grade:7,mode:'exam',toan:null,van:null,achSo:null,achCnn:null,acSo:null,acCnn:null,langs:['Anh']}}
/* English estimate from the diagnostic + the 14-day work */
function englishEstimate(mode,grade){
  const A=agg();const eff=efficiency(A);
  const entry=S.final&&S.final.hours>(S.diag?S.diag.hours:0)?S.final:S.diag;
  const h0=entry?entry.hours:220;
  const date=examDateFor(grade);const weeks=Math.max(0,(date-Date.now())/(7*864e5));
  const hpw=S.plan.min*S.plan.dpw/60;
  const h=mode==='exam'?h0+hpw*eff.f*CONV*weeks*STUDY_FACTOR:h0;
  // exam-format practice nudges the estimate a little (±0.3)
  let adj=0;const ex=A.skills&&A.skills.exam, all=A.web;
  if(ex&&ex[1]>=6&&all[1]>=12){adj=Math.max(-0.3,Math.min(0.3,(ex[0]/ex[1]-all[0]/all[1])))}
  const yrs=mode==='exam'?weeks/52:0;
  return {h,entry,eff,weeks,date,adj,sd:0.35+0.15*Math.min(3,yrs),
    achSo:Math.min(ACH_CAP,scoreFromHours(h,'so')+adj),achCnn:Math.min(ACH_CAP,scoreFromHours(h,'cnn')+adj)};
}
function schoolInputs(){
  const P=S.school;const E=englishEstimate(P.mode,P.grade);
  const val=(v,d)=>v==null||v===''||isNaN(v)?d:+v;
  const achSo=val(P.achSo,E.achSo), achCnn=val(P.achCnn,E.achCnn);
  return {E,
    toan:val(P.toan,8), van:val(P.van,8), toanSet:P.toan!=null&&P.toan!=='', vanSet:P.van!=null&&P.van!=='',
    achSo, achCnn, acSo:val(P.acSo,Math.min(10,achSo+2.5)), acCnn:val(P.acCnn,Math.min(9.5,achCnn))};
}
/* total, cut-off spread and chance for one option */
function evalOption(o,I){
  const mean=o.cut.reduce((a,b)=>a+b,0)/o.cut.length;
  const sdCut=o.cut.length>2?Math.sqrt(o.cut.reduce((s,c)=>s+(c-mean)*(c-mean),0)/(o.cut.length-1)):o.sdDefault;
  let total,sdInd,acSlope,ach,ac;
  if(o.f==='so'){ach=I.achSo;ac=I.acSo;total=I.toan+I.van+ac+2*ach;sdInd=1.5;acSlope=ac<10?1:0}
  else if(o.f==='cnn'){ach=I.achCnn;ac=I.acCnn;total=I.toan+I.van+ac+2*ach;sdInd=1.5;acSlope=ac<9.5?1:0}
  else{ach=I.achSo;ac=I.acSo;total=2*ach+ac;sdInd=1.3;acSlope=ac<10?1:0}
  const sdProj=(2+acSlope)*I.E.sd;
  const sd=Math.sqrt(sdCut*sdCut+sdInd*sdInd+sdProj*sdProj);
  const p=phi((total-mean)/sd);
  const need80=mean+0.84*sd;
  const tvNeed=o.f==='sp'?null:need80-(ac+2*ach);
  const cls=p>=0.8?'good':p>=0.5?'hi':p>=0.2?'warn':'bad';
  const lab=p>=0.8?'An toàn':p>=0.5?'Vừa sức':p>=0.2?'Thử thách':'Còn xa';
  return {o,mean,sdCut,total,p,need80,tvNeed,cls,lab,max:o.f==='sp'?30:50};
}
/* exams are separate events; within an exam the student may list up to o.nv options */
function portfolio(rows){
  const byExam={};rows.forEach(r=>{(byExam[r.o.exam]=byExam[r.o.exam]||[]).push(r)});
  const plan=[];
  Object.entries(byExam).forEach(([ex,list])=>{
    const nv=list[0].o.nv||1;
    const sorted=list.slice().sort((a,b)=>b.p-a.p);
    // aim: the most selective option the child still has ≥50% on, then the safest as back-up
    const ambitious=list.filter(r=>r.p>=0.5).sort((a,b)=>a.mean===b.mean?b.p-a.p:b.mean-a.mean)[0]||sorted[0];
    const picks=[ambitious];
    if(nv>1){const rest=list.filter(r=>r!==ambitious);const safe=rest.filter(r=>r.p>=0.8).sort((a,b)=>b.mean-a.mean)[0]||rest.sort((a,b)=>b.p-a.p)[0];if(safe&&safe.p>ambitious.p)picks.push(safe)}
    // within one exam every option uses the same scores, so the chance of getting at least one = the best single chance
    plan.push({exam:ex,label:list[0].o.examLabel,picks,p:Math.max(...picks.map(r=>r.p))});
  });
  plan.sort((a,b)=>b.p-a.p);
  // add exams until the chance of at least one place reaches 90% (exams are correlated, so this is optimistic)
  const chosen=[];let miss=1;
  for(const e of plan){if(e.p<0.05)continue;chosen.push(e);miss*=(1-e.p);if(1-miss>=0.9&&chosen.length>=2)break}
  return {plan,chosen,pAny:1-miss};
}
function vSchool(){
  S.school=Object.assign(blankSchool(),S.school||{});const P=S.school;
  const langs=['Anh','Nga','Phap','Trung','Duc','Nhat','Han'];
  M().innerHTML=`<section class="view">
  <div><p class="eyebrow">Gợi ý trường và lớp chuyên ngữ</p><h2>Con có thể thi trường nào?</h2>
  <p class="lead">Trang ước tính điểm Anh của em từ bài đầu vào và 14 buổi học, cộng với điểm Toán, Văn, rồi tính theo đúng công thức xét tuyển của từng trường. Kết quả là gợi ý để cả nhà bàn bạc, không phải lời khẳng định đỗ hay trượt.</p></div>
  ${S.diag?'':'<div class="notice">Em chưa làm bài đầu vào, nên điểm Anh đang được giả định ở mức A2. Làm bài đầu vào để gợi ý sát với em hơn.</div>'}
  <div class="card"><h3>1. Điểm dùng để tính</h3>
   <div class="sgrid">
    <label class="fld">Em đang học lớp<select id="sGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${P.grade===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
    <label class="fld">Tính điểm Anh theo<select id="sMode"><option value="exam" ${P.mode==='exam'?'selected':''}>Dự báo lúc thi (theo lịch học ở tab Lộ trình)</option><option value="now" ${P.mode==='now'?'selected':''}>Trình độ hiện tại</option></select></label>
   </div>
   <div class="sgrid" id="sScores"></div>
   <p class="small muted" id="sNote"></p>
   <details><summary class="small">Sửa điểm Anh (nếu em đã có điểm thi thử)</summary><div class="sgrid" id="sEng"></div><p class="small muted">Để trống ô nào thì trang dùng số tự tính cho ô đó.</p></details>
   <div class="langs"><p class="small"><b>Em sẵn sàng học thêm ngoại ngữ nào ở cấp 3?</b> Các lớp tiếng Nga, Pháp, Trung, Đức, Nhật, Hàn ở nhiều trường nhận thí sinh thi môn chuyên bằng tiếng Anh. Học sinh đỗ sẽ học ngoại ngữ đó làm môn chuyên suốt 3 năm, nên chỉ đánh dấu khi em thật sự muốn.</p>
   ${langs.map(l=>`<label class="chk"><input type="checkbox" value="${l}" ${P.langs.includes(l)?'checked':''} ${l==='Anh'?'disabled':''}> ${LANG_NAME[l]}</label>`).join('')}</div>
  </div>
  <div class="card"><h3>2. Khả năng đỗ từng lớp</h3><div class="tbl-wrap"><table class="stable"><thead><tr><th>Trường · lớp</th><th>Điểm dự kiến của em</th><th>Điểm chuẩn các năm</th><th>Khả năng</th><th>Toán + Văn cần để an toàn</th></tr></thead><tbody id="sRows"></tbody></table></div>
   <p class="small muted">An toàn: khoảng 80% trở lên · Vừa sức: 50–80% · Thử thách: 20–50% · Còn xa: dưới 20%. "Toán + Văn cần để an toàn" là tổng hai môn để có khoảng 80% khả năng đỗ, với điểm Anh như trên.</p></div>
  <div id="sPlan"></div>
  <details class="card"><summary>Cách trang tính</summary><div class="small" id="sHow"></div></details>
  </section>`;
  const draw=()=>{
    const I=schoolInputs();const E=I.E;
    const fld=(id,label,val,set,hint)=>`<label class="fld">${label}<input type="number" id="${id}" min="0" max="10" step="0.25" inputmode="decimal" value="${set?val:''}" placeholder="${fmtN(val)}"><span class="hint ${set?'':'sug'}">${hint}</span></label>`;
    $('#sScores').innerHTML=fld('sToan','Điểm Toán (đề chung, thang 10)',I.toan,I.toanSet,I.toanSet?'Điểm bố mẹ nhập':'Đang dùng mốc gợi ý 8 — bố mẹ sửa theo điểm thi thử hoặc học bạ của con')+fld('sVan','Điểm Văn (đề chung, thang 10)',I.van,I.vanSet,I.vanSet?'Điểm bố mẹ nhập':'Đang dùng mốc gợi ý 8 — bố mẹ sửa theo điểm thi thử hoặc học bạ của con');
    $('#sNote').innerHTML=`Điểm Anh tự tính (${P.mode==='exam'?'dự báo lúc thi tháng 6/'+E.date.getFullYear()+', với lịch '+S.plan.min+' phút × '+S.plan.dpw+' ngày/tuần':'trình độ hiện tại'}): trình độ khoảng <b>${levelOfHours(E.h).name}</b> · Anh chuyên đề Sở khoảng <b>${fmtN(r1(I.achSo))}</b> · Anh chuyên đề Chuyên Ngoại ngữ khoảng <b>${fmtN(r1(I.achCnn))}</b>. Sai số khoảng ±${fmtN(r1(E.sd*1.5))} điểm.`;
    const eng=(id,label,key,auto)=>`<label class="fld">${label}<input type="number" id="${id}" min="0" max="10" step="0.25" value="${P[key]!=null&&P[key]!==''?P[key]:''}" placeholder="${fmtN(r1(auto))}"></label>`;
    if(!$('#sEng').dataset.on){$('#sEng').innerHTML=eng('sAchSo','Anh chuyên (đề Sở)','achSo',E.achSo)+eng('sAcSo','Anh chung (đề Sở)','acSo',Math.min(10,E.achSo+2.5))+eng('sAchCnn','Anh chuyên (đề Chuyên Ngoại ngữ)','achCnn',E.achCnn)+eng('sAcCnn','Anh chung (đề Chuyên Ngoại ngữ)','acCnn',Math.min(9.5,E.achCnn));$('#sEng').dataset.on='1';
      [['sAchSo','achSo'],['sAcSo','acSo'],['sAchCnn','achCnn'],['sAcCnn','acCnn']].forEach(([id,k])=>{$('#'+id).oninput=e=>{P[k]=e.target.value===''?null:+e.target.value;save();drawRows()}})}
    $('#sToan').oninput=e=>{P.toan=e.target.value===''?null:+e.target.value;save();drawRows();hintUpd()};
    $('#sVan').oninput=e=>{P.van=e.target.value===''?null:+e.target.value;save();drawRows();hintUpd()};
    drawRows();
  };
  const hintUpd=()=>{const I=schoolInputs();const hs=document.querySelectorAll('#sScores .hint');hs[0].textContent=I.toanSet?'Điểm bố mẹ nhập':'Đang dùng mốc gợi ý 8 — bố mẹ sửa theo điểm thi thử hoặc học bạ của con';hs[0].classList.toggle('sug',!I.toanSet);hs[1].textContent=I.vanSet?'Điểm bố mẹ nhập':'Đang dùng mốc gợi ý 8 — bố mẹ sửa theo điểm thi thử hoặc học bạ của con';hs[1].classList.toggle('sug',!I.vanSet)};
  const drawRows=()=>{
    const I=schoolInputs();
    const rows=SCHOOL_OPTS.filter(o=>P.langs.includes(o.lang)).map(o=>evalOption(o,I)).sort((a,b)=>b.p-a.p);
    $('#sRows').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.o.school)}</b><br><span class="small">Lớp ${esc(r.o.cls)}${r.o.lang!=='Anh'?' · thi môn chuyên bằng tiếng Anh':''}</span>${r.o.note?`<br><span class="small muted">${esc(r.o.note)}</span>`:''}</td><td class="num">${fmtN(r1(r.total))}<span class="muted">/${r.max}</span></td><td class="num">${r.o.cut.map(fmtN).join(' · ')}<br><span class="small muted">trung bình ${fmtN(r2(r.mean))}</span></td><td><span class="pill ${r.cls}">${r.lab}</span><br><span class="small muted">khoảng ${Math.round(r.p*100)}%</span></td><td class="num">${r.tvNeed==null?'<span class="small muted">không xét Toán, Văn</span>':r.tvNeed>20?'<span class="small">trên 20: chưa đủ dù Toán, Văn tối đa</span>':fmtN(r1(Math.max(0,r.tvNeed)))+'<span class="muted">/20</span>'}</td></tr>`).join('')||'<tr><td colspan="5">Chưa có lớp nào phù hợp với lựa chọn ngoại ngữ.</td></tr>';
    const PF=portfolio(rows);
    const n=PF.chosen.length;
    const lines=PF.chosen.map(e=>`<li><b>${esc(e.label)}</b>: ${e.picks.map((r,i)=>`${e.picks.length>1?'nguyện vọng '+(i+1)+' ':''}${esc(r.o.school)} – lớp ${esc(r.o.cls)} (${r.lab.toLowerCase()}, khoảng ${Math.round(r.p*100)}%)`).join('; ')}</li>`).join('');
    const pAny=Math.round(PF.pAny*100);
    const cls=PF.pAny>=0.85?'good':PF.pAny>=0.6?'warn':'bad';
    const tv=I.toanSet&&I.vanSet?'':' Điểm Toán, Văn đang là mốc gợi ý; khi bố mẹ nhập điểm thật, gợi ý sẽ thay đổi.';
    $('#sPlan').innerHTML=`<div class="verdict ${cls}"><p class="eyebrow">Gợi ý đăng ký</p><h3>${n?`Nên dự ${n} kỳ thi`:'Chưa có kỳ thi nào đủ khả năng'}</h3>
     ${n?`<ul>${lines}</ul><p>Với bộ lựa chọn này, khả năng đỗ ít nhất một lớp chuyên khoảng <b>${pAny}%</b>. Các kỳ thi có liên quan đến nhau (em làm tốt ở kỳ này thường cũng làm tốt ở kỳ khác), nên con số thật có thể thấp hơn một chút.</p>`:'<p>Với điểm hiện tại, chưa lớp nào có trên 5% khả năng. Hãy xem cột "Toán + Văn cần để an toàn" và tab Lộ trình để biết cần tăng phần nào.</p>'}
     <p class="small">Cách chọn: mỗi kỳ thi lấy lớp khó nhất mà em vẫn có từ 50% khả năng; nếu kỳ thi cho đăng ký 2 nguyện vọng thì nguyện vọng 2 là lớp khó nhất mà em có từ 80% khả năng. Dừng thêm kỳ thi khi khả năng đỗ ít nhất một lớp đạt khoảng 90%.${tv}</p></div>`;
    $('#sHow').innerHTML=`<p>Điểm xét tuyển: các trường của Sở Hà Nội và Chuyên Ngoại ngữ tính Toán + Văn + Anh chung + Anh chuyên × 2 (thang 50). Chuyên Sư phạm từ 2025 tính Anh chuyên × 2 + Anh chung (thang 30).</p><p>Khả năng đỗ so điểm dự kiến của em với điểm chuẩn trung bình các năm, có tính ba loại dao động: điểm chuẩn thay đổi theo năm, điểm của em thay đổi theo ngày thi (khoảng 1,5 điểm tổng), và sai số của dự báo trình độ.</p><p>Điểm Anh chuyên được quy từ trình độ: đề Sở khoảng 6 điểm ở B2, 7 ở B2+, 8 ở C1; đề Chuyên Ngoại ngữ khoảng 6 ở B2, 7 ở B2+/C1, 8 ở C1. Anh chung đề Sở giả định cao hơn Anh chuyên 2,5 điểm (tối đa 10), đề Chuyên Ngoại ngữ bằng Anh chuyên. Đây là các suy luận từ nhận định độ khó đề, sai số khoảng nửa bậc.</p><p>Điểm chuẩn lấy từ báo chí và trang tổng hợp tuyển sinh; năm sau có thể khác.</p>`;
  };
  draw();
  $('#sGrade').onchange=e=>{P.grade=+e.target.value;save();$('#sEng').dataset.on='';draw()};
  $('#sMode').onchange=e=>{P.mode=e.target.value;save();$('#sEng').dataset.on='';draw()};
  document.querySelectorAll('.langs input').forEach(c=>c.onchange=()=>{P.langs=['Anh',...[...document.querySelectorAll('.langs input:checked')].map(x=>x.value).filter(v=>v!=='Anh')];save();drawRows()});
}
