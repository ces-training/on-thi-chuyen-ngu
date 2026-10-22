/* ----- Chọn trường (school recommender) -----
   Inserted into template.html before the "share code" block by build.py.
   Uses: S, save, $, esc, M, agg, efficiency, ENTRY_H, LEVELS, levelOfHours, CONV, STUDY_FACTOR, pct. */
const SCHOOL_OPTS = __SCHOOLS__;
const EXAMS = __EXAMS__;
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
  const h=mode==='exam'?h0+(hpw*eff.f*CONV+(S.plan.cls||0)*classF())*weeks*STUDY_FACTOR:h0;
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
/* total, cut-off spread and chance for one option; bump = extra points needed (NV2 rule) */
function evalOption(o,I,bump){
  bump=bump||0;
  const mean=o.cut.reduce((a,b)=>a+b,0)/o.cut.length;
  const sample=o.cut.length>1?Math.sqrt(o.cut.reduce((s,c)=>s+(c-mean)*(c-mean),0)/(o.cut.length-1)):0;
  const sdCut=o.cut.length>2?sample:Math.max(o.sdDefault||1.3,sample);
  let total,sdInd,acSlope,ach,ac;
  if(o.f==='so'){ach=I.achSo;ac=I.acSo;total=I.toan+I.van+ac+2*ach;sdInd=1.5;acSlope=ac<10?1:0}
  else if(o.f==='cnn'){ach=I.achCnn;ac=I.acCnn;total=I.toan+I.van+ac+2*ach;sdInd=1.5;acSlope=ac<9.5?1:0}
  else{ach=I.achSo;ac=I.acSo;total=2*ach+ac;sdInd=1.3;acSlope=ac<10?1:0}
  const sdProj=(2+acSlope)*I.E.sd;
  const sd=Math.sqrt(sdCut*sdCut+sdInd*sdInd+sdProj*sdProj);
  const bar=mean+bump;
  const p=phi((total-bar)/sd);
  const need80=bar+0.84*sd;
  const tvNeed=o.f==='sp'?null:need80-(ac+2*ach);
  const cls=p>=0.8?'good':p>=0.5?'hi':p>=0.2?'warn':'';
  const lab=p>=0.8?'An toàn':p>=0.5?'Vừa sức':p>=0.2?'Thử thách':'Cần thêm thời gian';
  return {o,mean,sdCut,total,p,need80,tvNeed,cls,lab,bump,max:o.f==='sp'?30:50};
}
/* One suggestion per exam. The three exams are on different days, so a student can sit all of them.
   Within one exam every option uses the same scores: the chance of at least one place = the best single chance. */
function portfolio(rows,I,langs){
  const rank=r=>{const i=langs.indexOf(r.o.lang);return i<0?99:i};
  const pickBest=list=>{const ok=list.filter(r=>r.p>=0.5).sort((a,b)=>rank(a)-rank(b)||b.mean-a.mean);return ok[0]||list.slice().sort((a,b)=>b.p-a.p)[0]};
  const plan=[];
  ['so','sp','cnn'].forEach(ex=>{
    const list=rows.filter(r=>r.o.exam===ex);if(!list.length)return;
    let picks=[];
    if(ex==='so'){
      const anh=list.filter(r=>r.o.group==='nv');
      const nv1=pickBest(anh);if(!nv1)return;picks.push(Object.assign({},nv1,{role:'Nguyện vọng 1'}));
      // NV2 is a back-up: only schools with a lower cut-off than NV1, judged with the extra 1 point
      const others=anh.filter(r=>r.o.sk!==nv1.o.sk&&r.mean<nv1.mean).map(r=>evalOption(r.o,I,1.0));
      const nv2=others.filter(r=>r.p>=0.8).sort((a,b)=>b.mean-a.mean)[0]||others.sort((a,b)=>b.p-a.p)[0];
      if(nv2)picks.push(Object.assign({},nv2,{role:'Nguyện vọng 2 (phải hơn điểm chuẩn 1 điểm)'}));
      const schools=picks.map(r=>r.o.sk);
      list.filter(r=>r.o.group==='extra'&&schools.includes(r.o.sk)).forEach(r=>picks.push(Object.assign({},r,{role:'Đăng ký thêm, xét bằng điểm chuyên Anh'})));
    }else{
      const b=pickBest(list);if(b)picks.push(Object.assign({},b,{role:'Lớp đăng ký'}));
    }
    plan.push({exam:ex,label:(EXAMS[ex]||{}).label||ex,date:(EXAMS[ex]||{}).date||'',picks,p:Math.max(...picks.map(r=>r.p))});
  });
  // the exams are on different days: sit every exam where the best class gives a real chance (≥20%)
  const chosen=plan.filter(e=>e.p>=0.2);
  chosen.forEach(e=>{e.tier=e.p>=0.5?'Nên thi':'Có thể thử'});
  const pAny=1-chosen.reduce((m,e)=>m*(1-e.p),1);
  return {plan,chosen,pAny};
}
function vSchool(){
  S.school=Object.assign(blankSchool(),S.school||{});const P=S.school;
  const langs=['Anh','Nga','Phap','Trung','Duc','Nhat','Han'];
  M().innerHTML=`<section class="view">
  <div><p class="eyebrow">Gợi ý trường và lớp chuyên ngữ</p><h2>Cậu có thể thi trường nào?</h2>
  <p class="lead">Tab này cậu mở cùng bố mẹ nhé.</p><div class="hung-say">${hungFig('sm')}<p>Cháu chào cô chú ạ! Cháu là Hùng, Hùng trong "Hùng dũng" chứ không phải "Hùng hổ" đâu ạ. Cháu ước điểm Anh của bạn nhà mình từ bài đầu vào và các buổi đã học, cộng điểm Toán, Văn, rồi tính đúng công thức xét tuyển của từng trường. Đây là gợi ý để cả nhà cùng bàn, chứ không phải lời "phán" đỗ hay trượt, và nó đổi theo từng buổi bạn ấy học ạ.</p></div></div>
  <div class="card"><h3>1. Điểm dùng để tính</h3>
   <div class="sgrid">
    <label class="fld">Cậu đang học lớp<select id="sGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${P.grade===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
    <label class="fld">Tính điểm Anh theo<select id="sMode"><option value="exam" ${P.mode==='exam'?'selected':''}>Dự báo lúc thi (theo lịch học ở tab Lộ trình)</option><option value="now" ${P.mode==='now'?'selected':''}>Trình độ hiện tại</option></select></label>
   </div>
   <div class="sgrid" id="sScores"></div>
   <p class="small muted" id="sNote"></p>
   <details><summary class="small">Sửa điểm Anh (nếu cậu đã có điểm thi thử)</summary><div class="sgrid" id="sEng"></div><p class="small muted">Để trống ô nào thì trang dùng số tự tính cho ô đó.</p></details>
   <div class="langs"><p class="small"><b>Cậu sẵn sàng học thêm ngoại ngữ nào ở cấp 3?</b> Các lớp tiếng Nga, Pháp, Trung, Đức, Nhật, Hàn ở nhiều trường nhận thí sinh thi môn chuyên bằng tiếng Anh. Học sinh đỗ sẽ học ngoại ngữ đó làm môn chuyên suốt 3 năm, nên chỉ đánh dấu khi cậu thật sự muốn.</p>
   ${langs.map(l=>`<label class="chk"><input type="checkbox" value="${l}" ${P.langs.includes(l)?'checked':''} ${l==='Anh'?'disabled':''}> ${LANG_NAME[l]}</label>`).join('')}</div>
  </div>
  <div class="card"><h3>2. Khả năng đỗ từng lớp</h3><div class="slist" id="sRows"></div>
   <p class="small muted">An toàn: khoảng 80% trở lên · Vừa sức: 50–80% · Thử thách: 20–50% · Cần thêm thời gian: dưới 20%. "Toán + Văn cần" là tổng hai môn để có khoảng 80% khả năng đỗ, với điểm Anh như trên.</p></div>
  <div id="sPlan"></div>
  <details class="card"><summary>Cách trang tính</summary><div class="small" id="sHow"></div></details>
  </section>`;
  const draw=()=>{
    const I=schoolInputs();const E=I.E;
    const fld=(id,label,val,set,hint)=>`<label class="fld">${label}<input type="number" id="${id}" min="0" max="10" step="0.25" inputmode="decimal" value="${set?val:''}" placeholder="${fmtN(val)}"><span class="hint ${set?'':'sug'}">${hint}</span></label>`;
    $('#sScores').innerHTML=fld('sToan','Điểm Toán (đề chung, thang 10)',I.toan,I.toanSet,I.toanSet?'Điểm cô chú nhập':'Đang dùng mốc gợi ý 8 — cô chú sửa giúp cháu theo điểm thi thử hoặc học bạ nhé ạ')+fld('sVan','Điểm Văn (đề chung, thang 10)',I.van,I.vanSet,I.vanSet?'Điểm cô chú nhập':'Đang dùng mốc gợi ý 8 — cô chú sửa giúp cháu theo điểm thi thử hoặc học bạ nhé ạ');
    $('#sNote').innerHTML=!known()?'':`Điểm Anh tự tính (${P.mode==='exam'?'dự báo lúc thi tháng 6/'+E.date.getFullYear()+', với lịch '+S.plan.min+' phút × '+S.plan.dpw+' ngày/tuần'+(S.plan.cls?' cộng '+String(S.plan.cls).replace('.',',')+' giờ học trên lớp':''):'trình độ hiện tại'}): trình độ khoảng <b>${levelOfHours(E.h).name}</b> · Anh chuyên đề Sở khoảng <b>${fmtN(r1(I.achSo))}</b> · Anh chuyên đề Chuyên Ngoại ngữ khoảng <b>${fmtN(r1(I.achCnn))}</b>. Sai số khoảng ±${fmtN(r1(E.sd*1.5))} điểm.`;
    const eng=(id,label,key,auto)=>`<label class="fld">${label}<input type="number" id="${id}" min="0" max="10" step="0.25" value="${P[key]!=null&&P[key]!==''?P[key]:''}" placeholder="${fmtN(r1(auto))}"></label>`;
    if(!$('#sEng').dataset.on){$('#sEng').innerHTML=eng('sAchSo','Anh chuyên (đề Sở)','achSo',E.achSo)+eng('sAcSo','Anh chung (đề Sở)','acSo',Math.min(10,E.achSo+2.5))+eng('sAchCnn','Anh chuyên (đề Chuyên Ngoại ngữ)','achCnn',E.achCnn)+eng('sAcCnn','Anh chung (đề Chuyên Ngoại ngữ)','acCnn',Math.min(9.5,E.achCnn));$('#sEng').dataset.on='1';
      [['sAchSo','achSo'],['sAcSo','acSo'],['sAchCnn','achCnn'],['sAcCnn','acCnn']].forEach(([id,k])=>{$('#'+id).oninput=e=>{P[k]=e.target.value===''?null:+e.target.value;save();drawRows()}})}
    $('#sToan').oninput=e=>{P.toan=e.target.value===''?null:+e.target.value;save();drawRows();hintUpd()};
    $('#sVan').oninput=e=>{P.van=e.target.value===''?null:+e.target.value;save();drawRows();hintUpd()};
    drawRows();
  };
  const hintUpd=()=>{const I=schoolInputs();const hs=document.querySelectorAll('#sScores .hint');hs[0].textContent=I.toanSet?'Điểm cô chú nhập':'Đang dùng mốc gợi ý 8 — cô chú sửa giúp cháu theo điểm thi thử hoặc học bạ nhé ạ';hs[0].classList.toggle('sug',!I.toanSet);hs[1].textContent=I.vanSet?'Điểm cô chú nhập':'Đang dùng mốc gợi ý 8 — cô chú sửa giúp cháu theo điểm thi thử hoặc học bạ nhé ạ';hs[1].classList.toggle('sug',!I.vanSet)};
  const known=()=>!!(S.diag||S.final)||['achSo','achCnn','acSo','acCnn'].some(k=>P[k]!=null&&P[k]!=='');
  const drawRows=()=>{
    if(!known()){$('#sRows').innerHTML=`<div class="lockbox" style="border:0;padding:0">${doodle('lock','lk',48)}<div><p>Tớ chưa biết level tiếng Anh của cậu, nên chưa dám đoán trường vội. Làm bài đầu vào 30 câu, hoặc nhập điểm thi thử tiếng Anh ở mục "Sửa điểm Anh" phía trên, là phần này mở khoá.</p><div class="row"><button class="btn hi" id="sDiag">Làm bài đầu vào</button></div></div></div>`;$('#sPlan').innerHTML='';const b=$('#sDiag');if(b)b.onclick=()=>go('diag');return}
    const I=schoolInputs();
    const rows=SCHOOL_OPTS.filter(o=>P.langs.includes(o.lang)).map(o=>evalOption(o,I)).sort((a,b)=>b.p-a.p);
    $('#sRows').innerHTML=rows.map(r=>{const lo=Math.min(...r.o.cut),hi=Math.max(...r.o.cut);return `<div class="srow"><div class="sp"><span class="pill ${r.cls}">${r.lab}</span><span class="pc">${Math.round(r.p*100)}%</span></div><div><b>${esc(r.o.school)}</b> <span class="small">· lớp ${esc(r.o.cls)}${r.o.lang!=='Anh'&&r.o.f==='so'?' (xét bằng điểm chuyên Anh)':''}</span>
      <div class="sfacts"><span>Điểm dự kiến của cậu <b>${fmtN(r1(r.total))}</b>/${r.max}</span><span>Điểm chuẩn trung bình <b>${fmtN(r2(r.mean))}</b> <span class="muted">(${r.o.years[0]}–${r.o.years[r.o.years.length-1]}: ${fmtN(lo)}–${fmtN(hi)})</span></span><span>${r.tvNeed==null?'Không xét Toán, Văn':r.tvNeed>20?'Toán + Văn: chưa đủ dù đạt tối đa':'Toán + Văn cần <b>'+fmtN(r1(Math.max(0,r.tvNeed)))+'</b>/20'}</span></div>${r.o.note?`<div class="small muted">${esc(r.o.note)}</div>`:''}</div></div>`}).join('')||'<p>Chưa có lớp nào phù hợp với lựa chọn ngoại ngữ.</p>';
    const PF=portfolio(rows,I,P.langs);
    const n=PF.chosen.length;
    const lines=PF.chosen.map(e=>`<li><span class="pill ${e.tier==='Nên thi'?'good':'warn'}">${e.tier}</span> <b>${esc(e.label)}</b>${e.date?` <span class="small">(${esc(e.date)})</span>`:''}<ul>${e.picks.map(r=>`<li>${esc(r.role)}: ${esc(r.o.school)} – lớp ${esc(r.o.cls)} · ${r.lab.toLowerCase()}, khoảng ${Math.round(r.p*100)}%</li>`).join('')}</ul></li>`).join('');
    const pAny=Math.round(PF.pAny*100);
    const cls=PF.pAny>=0.85?'good':'warn';
    const tv=I.toanSet&&I.vanSet?'':' Điểm Toán, Văn đang là mốc gợi ý; khi cô chú nhập điểm thật, gợi ý sẽ đổi theo ạ.';
    $('#sPlan').innerHTML=`<div class="verdict ${cls}"><p class="eyebrow">Gợi ý đăng ký</p><h3>${n?`Nên dự ${n} kỳ thi`:'Chưa có kỳ thi nào chắc tay, nhưng còn thời gian mà'}</h3>
     ${n?`<ul>${lines}</ul><p>Với bộ lựa chọn này, khả năng đỗ ít nhất một lớp chuyên khoảng <b>${pAny}%</b>. Các kỳ thi có liên quan đến nhau (cậu làm tốt ở kỳ này thường cũng làm tốt ở kỳ khác), nên con số thật có thể thấp hơn một chút.</p>${PF.pAny<0.85?'<p><b>Để thêm phần chắc ăn,</b> cả nhà nên đăng ký thêm nguyện vọng trường THPT không chuyên, và xem cột "Toán + Văn cần để an toàn" để biết cần tăng phần nào.</p>':''}`:'<p>Với điểm lúc này, các lớp còn ở phía trước một quãng. Điểm này đổi theo từng chặng cậu học: xem cột "Toán + Văn cần" và tab Sau 14 ngày để biết đi tiếp thế nào cho nhanh.</p>'}
     <p class="small">Cách chọn: ở mỗi kỳ thi, trang ưu tiên lớp tiếng Anh, rồi đến các ngoại ngữ cậu đã đánh dấu, và chọn lớp có điểm chuẩn cao nhất mà cậu vẫn có từ 50% khả năng. Ở kỳ thi của Sở, nguyện vọng 2 là trường dự phòng: điểm chuẩn thấp hơn nguyện vọng 1, và là trường cao nhất trong số đó mà cậu vẫn có từ 80% khả năng sau khi cộng thêm 1 điểm theo quy định. Ba kỳ thi diễn ra vào các ngày khác nhau, nên cậu dự được cả ba. Cháu gợi ý dự mọi kỳ thi mà cậu có từ 20% khả năng trở lên: từ 50% là \"nên thi\", 20–50% là \"có thể thử\". Nếu khả năng đỗ ít nhất một lớp dưới 85%, cả nhà nên chuẩn bị thêm nguyện vọng trường THPT không chuyên.${tv}</p></div>`;
    $('#sHow').innerHTML=`<p>Điểm xét tuyển: các trường của Sở Hà Nội và Chuyên Ngoại ngữ tính Toán + Văn + Anh chung + Anh chuyên × 2 (thang 50). Chuyên Sư phạm từ 2025 tính Anh chuyên × 2 + Anh chung (thang 30).</p><p>Khả năng đỗ so điểm dự kiến của cậu với điểm chuẩn trung bình các năm, có tính ba loại dao động: điểm chuẩn thay đổi theo năm, điểm của cậu thay đổi theo ngày thi (khoảng 1,5 điểm tổng), và sai số của dự báo trình độ.</p><p>Điểm Anh chuyên được quy từ trình độ: đề Sở khoảng 6 điểm ở B2, 7 ở B2+, 8 ở C1; đề Chuyên Ngoại ngữ khoảng 6 ở B2, 7 ở B2+/C1, 8 ở C1. Anh chung đề Sở giả định cao hơn Anh chuyên 2,5 điểm (tối đa 10), đề Chuyên Ngoại ngữ bằng Anh chuyên. Đây là các suy luận từ nhận định độ khó đề, sai số khoảng nửa bậc.</p><p>Lớp Trung, Nga ở Amsterdam, Chu Văn An, Nguyễn Huệ và lớp Pháp ở Nguyễn Huệ xét bằng điểm chuyên Anh khi cậu đăng ký thêm. Ở Chuyên Ngoại ngữ, môn chuyên thi bằng tiếng Anh dùng được cho mọi lớp. Các lớp Pháp, Nhật của Amsterdam và Chu Văn An, lớp Hàn của Chu Văn An bắt buộc thi môn chuyên bằng chính ngoại ngữ đó, nên trang chưa tính.</p><p>Năm 2026 Sở Hà Nội có thêm vòng sơ tuyển; cô chú nhớ đọc quy chế của năm thi để biết điều kiện cụ thể ạ. Ngày nhận hồ sơ nhập học của các trường thường trùng nhau, nên cả nhà nên quyết thứ tự ưu tiên trước khi có điểm.</p><p>Điểm chuẩn lấy từ báo chí và trang tổng hợp tuyển sinh, giai đoạn 2022–2026; năm sau có thể khác. Xem toàn bộ số liệu và nguồn ở trang <a href="../tuyen-sinh/">Tuyển sinh chuyên ngữ Hà Nội</a>.</p>`;
  };
  draw();
  $('#sGrade').onchange=e=>{P.grade=+e.target.value;save();$('#sEng').dataset.on='';draw()};
  $('#sMode').onchange=e=>{P.mode=e.target.value;save();$('#sEng').dataset.on='';draw()};
  document.querySelectorAll('.langs input').forEach(c=>c.onchange=()=>{P.langs=['Anh',...[...document.querySelectorAll('.langs input:checked')].map(x=>x.value).filter(v=>v!=='Anh')];save();drawRows()});
}
