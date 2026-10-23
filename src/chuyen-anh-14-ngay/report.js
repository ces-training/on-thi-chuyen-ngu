/* ================= NHỊP HỌC · ĐỘ CHẮC CỦA BÀI ĐẦU VÀO · BÁO CÁO THỬ 14 BUỔI =================
   Lời hứa với phụ huynh: làm bài đầu vào → học 14 buổi (liền mạch hoặc 1–2 ngày một buổi, khoảng 3 tuần)
   → bài kiểm tra đầu ra → cô biết nền tảng, khả năng học, khả năng đỗ (kèm Toán, Văn) và lộ trình nếu theo. */

/* ----- nhịp học: không bắt học mỗi ngày; 1 buổi mỗi 1–2 ngày vẫn là đều ----- */
const RH_GAP_OK=2.2, RH_BREAK=5, RH_WEEKS=3;
function rhythm(A){
  const ds=[...new Set((A.dates||[]).map(t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()}))].sort((a,b)=>a-b);
  const n=A.done?Math.max(A.done.length,ds.length):ds.length;
  const sessions=Object.values(S.days).filter(r=>r&&(r.web||r.paper)).length;
  let gap=null,maxGap=0;
  if(ds.length>1){for(let i=1;i<ds.length;i++)maxGap=Math.max(maxGap,Math.round((ds[i]-ds[i-1])/864e5));gap=(ds[ds.length-1]-ds[0])/864e5/Math.max(1,sessions-1)}
  const perDay=gap?Math.min(1,1/gap):1;
  const state=sessions<3||ds.length<2?'new':(gap<=RH_GAP_OK&&maxGap<=RH_BREAK)?'regular':'patchy';
  const first=ds[0]||null,left=14-sessions;
  const eta=first&&left>0?new Date(Date.now()+left*Math.max(1,Math.min(gap||1.5,3))*864e5):null;
  const target=first?new Date(first+RH_WEEKS*7*864e5):null;
  const gapTxt=gap==null?'':gap<=1.15?'gần như mỗi ngày một buổi':`trung bình ${String(Math.round(gap*10)/10).replace('.',',')} ngày một buổi`;
  return {sessions,gap,maxGap,perDay,state,first,eta,target,gapTxt,n};
}
const fmtDay=d=>d?d.toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'}):'—';
function rhythmLine(){const A=agg(),R=rhythm(A);
  if(!R.sessions)return 'Nhịp gợi ý: làm liền 14 ngày, hoặc 1–2 ngày một buổi. Khoảng 3 tuần là xong 14 buổi.';
  let t=`${R.sessions} buổi, ${R.gapTxt||'mới bắt đầu'}.`;
  if(R.sessions>=14)return t+' Xong cả 14 buổi rồi!';
  if(R.eta)t+=` Giữ nhịp này thì khoảng <b>${fmtDay(R.eta)}</b> xong buổi 14`+(R.target&&R.eta>R.target?` (mốc gợi ý 3 tuần là ${fmtDay(R.target)}, chậm một chút cũng không sao).`:'.');
  if(R.maxGap>RH_BREAK)t+=` Có lần nghỉ ${R.maxGap} ngày; nghỉ lâu dễ quên bài cũ, nên vòng ôn sẽ đưa câu cũ quay lại nhiều hơn.`;
  return t}

/* ----- độ chắc của bài đầu vào / đầu ra -----
   Đề mới 45 câu, mỗi mức 15 câu (trắc nghiệm, nghe, câu tự viết); đề cũ 30 câu, mỗi mức 10 câu. Sai số đo khoảng ±1,5 câu mỗi mức,
   nên trang thử dịch mỗi mức ±1 câu: kết quả không đổi → độ chắc cao; đổi sang mức kề → vừa; xa hơn → thấp.
   Thêm cờ: làm quá nhanh, bỏ trống nhiều, câu khó đúng nhiều hơn câu dễ (dấu hiệu đoán). */
const LV_ORDER=['preA2','A2','A2+','B1','B1+','B2'];
function placement(r){
  if(!r||!r.bands)return null;const a=r.bands.A2[0],b=r.bands.B1[0],c=r.bands.B2[0],na=r.bands.A2[1],nb=r.bands.B1[1],nc=r.bands.B2[1];
  const set=new Set([levelFromBands(a,b,c,na,nb,nc)]);
  [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(([x,y,z])=>set.add(levelFromBands(Math.max(0,a+x),Math.max(0,b+y),Math.max(0,c+z),na,nb,nc)));
  const idx=[...set].map(k=>LV_ORDER.indexOf(k)).sort((p,q)=>p-q);const lo=LV_ORDER[idx[0]],hi=LV_ORDER[idx[idx.length-1]];
  let score=idx[idx.length-1]-idx[0]===0?2:idx[idx.length-1]-idx[0]===1?1:0;const flags=[];
  if(c/nc>b/nb+0.12||b/nb>a/na+0.12){flags.push('Câu khó đúng nhiều hơn câu dễ hơn: có thể có câu đoán trúng.');score--}
  const mins=r.of>=40?35:25;if(r.dur!=null&&r.dur<mins*0.3){flags.push(`Làm xong trong ${Math.max(1,Math.round(r.dur))} phút (đề tính khoảng ${mins} phút).`);score--}
  if(r.noAudio)flags.push('Máy không phát được tiếng nên phần nghe được đọc thay; điểm nghe có thể cao hơn thực tế.');
  if(r.blank!=null&&r.blank>=10)flags.push(`Bỏ trống ${r.blank} câu: kết quả phản ánh đúng phần chắc chắn biết.`);
  if(c/nc<=0.3&&b/nb>=0.7)flags.push('Câu mức B2 mới đúng ít, mức B1 đã vững: đang ở ngưỡng chuyển lên B2.');
  score=Math.max(0,score);
  return {lv:r.level,lo,hi,conf:['thấp','vừa','cao'][score],score,flags,range:lo===hi?LEVELS.find(l=>l.k===lo).name:`${LEVELS.find(l=>l.k===lo).name} – ${LEVELS.find(l=>l.k===hi).name}`}}
function placementNote(r){const p=placement(r);if(!p)return'';
  return `<p class="small"><b>Độ chắc của ước tính: ${p.conf}</b>${p.lo!==p.hi?` · có thể nằm trong khoảng <b>${esc(p.range)}</b>`:''}. ${p.score<2?'Không sao đâu: 3 buổi đầu tớ sẽ xem cậu làm bài thật, thấy mức chưa vừa là tớ gợi ý đổi ngay.':'Đủ chắc để chọn mức học cho 14 buổi.'}</p>${p.flags.length?`<ul class="small muted">${p.flags.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}`}

/* ----- sau 3 buổi: gợi ý đổi mức theo độ đúng thật trên web (cùng đề cho mọi mức) ----- */
function trackSuggest(){
  if(!S.diag)return null;const rs=Object.keys(S.days).map(Number).sort((a,b)=>a-b).map(d=>S.days[d]).filter(r=>r&&r.web&&r.web.total).slice(-3);
  if(rs.length<3)return null;const acc=rs.reduce((s,r)=>s+r.web.correct,0)/rs.reduce((s,r)=>s+r.web.total,0);const t=curTrack();
  if(acc>=0.85&&t!=='nang')return {to:t==='nen'?'chuan':'nang',acc,up:true};
  if(acc<0.5&&t!=='nen')return {to:t==='nang'?'chuan':'nen',acc,up:false};
  return null}
function trackSuggestHTML(){const g=trackSuggest();if(!g)return'';const p=Math.round(g.acc*100);
  return `<div class="tsug ${g.up?'up':'down'}">${g.up?`3 buổi gần nhất cậu đúng ${p}%. Bài đang hơi "nhẹ đô" với cậu đấy. Thử mức <b>${TRACKS[g.to].name}</b> cho máu không?`:`3 buổi gần nhất cậu đúng ${p}%, hơi khó nhằn. Cậu có thể chuyển sang mức <b>${TRACKS[g.to].name}</b> vài buổi cho chắc tay, rồi lên lại sau.`} <button class="btn ${g.up?'hi':''}" type="button" id="tsGo" data-to="${g.to}">Đổi sang mức ${TRACKS[g.to].name}</button></div>`}

/* ----- báo cáo thử 14 buổi (cho cô và gia đình) ----- */
const PACE_NAME={fast:'Tuyến nhanh',steady:'Tuyến giữ nhịp',careful:'Tuyến chậm mà chắc'};
const SK_RP={listening:'Nghe',cloze:'Điền một từ',transform:'Viết lại câu',vocab:'Từ vựng',grammar:'Ngữ pháp',wordform:'Cấu tạo từ',exam:'Dạng bài thi',reading:'Đọc hiểu',review:'Ôn xoắn ốc',retry:'Câu từng sai làm lại'};
function rpTestRow(label,r){if(!r)return `<tr><td>${label}</td><td colspan="6" class="muted">Chưa làm</td></tr>`;const p=placement(r);const L=LEVELS.find(l=>l.k===r.level);
  return `<tr><td>${label}</td><td><b>${r.total}/${r.of}</b></td>${['A2','B1','B2'].map(k=>`<td>${r.bands[k][0]}/${r.bands[k][1]}</td>`).join('')}<td><b>${esc(L?L.name:r.level)}</b>${p&&p.lo!==p.hi?`<br><span class="small muted">${esc(p.range)}</span>`:''}</td><td>${p?p.conf:'—'}</td></tr>`}
/* tiến bộ nhờ 14 buổi: hai bài là hai dạng song song cùng nội dung khoá, nên chênh lệch phản ánh việc học */
function rpProgress(d,f,A){const bd=k=>{const r=S[k];return r&&(r.byDay||txByDay(k))};const D0=bd('diag'),D1=f?bd('final'):null;
  const sg=(a,b)=>{const x=b-a;return `<b class="${x>0?'rp-up':x<0?'rp-dn':''}">${x>0?'+':''}${x}</b>`};
  const rows=[];
  rows.push(`<tr><td>Phần chung: 45 câu bám nội dung 14 buổi</td><td>${d.total}/${d.of}</td><td>${f?f.total+'/'+f.of:'—'}</td><td>${f?sg(d.total,f.total):'—'}</td></tr>`);
  const F=d.locF||Object.keys(d.loc||{});F.forEach(k=>{const a=(d.loc||{})[k],b=f&&(f.loc||{})[k];rows.push(`<tr><td>Dạng đề của sở: ${esc(LP_NAME[k]||k)}</td><td>${a?a.correct+'/'+a.total:'chưa làm'}</td><td>${b?b.correct+'/'+b.total:'—'}</td><td>${a&&b?sg(a.correct,b.correct):'—'}</td></tr>`)});
  rows.push(`<tr><td>Viết đoạn văn (tự chấm, cô xem lại)</td><td>${d.wr?d.wr.score+'/'+d.wr.of:'chưa làm'}</td><td>${f&&f.wr?f.wr.score+'/'+f.wr.of:'—'}</td><td>${d.wr&&f&&f.wr?sg(d.wr.score,f.wr.score):'—'}</td></tr>`);
  let dayTxt='';if(D0&&D1&&Object.keys(D0).length){const up=[],flat=[];Object.keys(D0).map(Number).sort((a,b)=>a-b).forEach(n=>{const a=D0[n],b=D1[n];if(!b)return;(b[0]>a[0]?up:flat).push(n)});
    const nm=n=>`buổi ${n} (${esc((DAYS[n-1]||{}).theme_vi||'')})`;
    dayTxt=`<p><b>Theo từng buổi:</b> ${up.length?`tiến bộ rõ ở ${up.map(nm).join(', ')}`:'chưa thấy buổi nào tăng rõ'}${flat.length?`; chưa tăng ở ${flat.map(nm).join(', ')} — nên ôn lại các buổi này`:''}.</p>`}
  return `<h4>Tiến bộ nhờ 14 buổi</h4><p class="small muted">Bài đầu vào và đầu ra là hai đề song song: câu khác nhau nhưng cùng hỏi từ vựng, ngữ pháp, dạng đề của từng buổi, cùng độ khó. Phần 4 hỏi đúng các dạng trong gói riêng của đề ${esc(REG().name)}.</p>
   <div class="tbl-wrap"><table class="rp-tbl"><thead><tr><th>Phần</th><th>Đầu vào</th><th>Đầu ra</th><th>Thay đổi</th></tr></thead><tbody>${rows.join('')}
   <tr><td>Nắm nội dung từng buổi (kiểm tra cuối buổi)</td><td colspan="3">${pctTxt(pct(A.web))} câu đúng trong ${Object.values(S.days).filter(r=>r&&r.web).length} buổi</td></tr></tbody></table></div>${dayTxt}`}
function reportBody(){
  const nm=S.name||'Học sinh';const A=agg(),RH=rhythm(A),eff=efficiency(A);
  const o=courseInputs(),P=o.prof,g=o.grade;const d=S.diag,f=S.final;
  const doneN=A.done.length,webN=Object.values(S.days).filter(r=>r&&r.web).length;
  const stage=!d?'none':(!f||webN<10)?'so-bo':'chot';
  const head=`<div class="card rp-head"><p class="eyebrow">Báo cáo thử 14 buổi · ${new Date().toLocaleDateString('vi-VN')}</p><h2>${esc(nm)} · lớp ${g}</h2>
   <p>${doneN}/14 buổi xong cả web và giấy · ${webN} buổi có kiểm tra web · bài đầu ra: <b>${f?'đã làm':'chưa làm'}</b></p>
   <p class="rp-stage ${stage}">${stage==='chot'?'Đủ dữ liệu để tư vấn: đã có bài đầu vào, bài đầu ra và từ 10 buổi học.':stage==='so-bo'?'Bản sơ bộ. Kết luận chắc hơn khi có bài đầu ra và ít nhất 10 buổi học.':'Chưa có bài đầu vào.'}</p></div>`;
  if(!d)return head;
  /* 1. nền tảng */
  const sk=Object.entries(A.skills||{}).filter(([k,v])=>v[1]>=4&&SK_RP[k]).map(([k,v])=>({k,n:SK_RP[k],p:v[0]/v[1],v}));
  const sks=sk.slice().sort((a,b)=>b.p-a.p);
  const s1=`<div class="card rp-sec"><h3>1. Nền tảng tiếng Anh</h3>
   <div class="tbl-wrap"><table class="rp-tbl"><thead><tr><th>Bài</th><th>Đúng</th><th>Câu A2</th><th>Câu B1</th><th>Câu B2</th><th>Ước tính</th><th>Độ chắc</th></tr></thead><tbody>${rpTestRow('Đầu vào',d)}${rpTestRow('Đầu ra',f)}</tbody></table></div>
   ${f?`<p>Sau 14 buổi: ${f.total-d.total>=0?'+':''}${f.total-d.total} câu so với đầu vào${f.hours>d.hours?', lên một mức ước tính':''}.</p>`:''}
   ${rpProgress(d,f,A)}
   ${sks.length?`<p><b>Theo kỹ năng trên web:</b> ${sks.map(x=>`${x.n} ${Math.round(x.p*100)}%`).join(' · ')}.</p>${sks.length>=2?`<p>Mạnh nhất: <b>${sks[0].n}</b>. Cần thêm thời gian: <b>${sks[sks.length-1].n}</b>.</p>`:''}`:''}
   ${[placement(d),placement(f)].filter(Boolean).flatMap(p=>p.flags).length?`<p class="small muted">Lưu ý khi đọc điểm: ${[...new Set([placement(d),placement(f)].filter(Boolean).flatMap(p=>p.flags))].map(esc).join(' ')}</p>`:''}</div>`;
  /* 2. khả năng học */
  const pap=pct(A.paper),ret=A.retry&&A.retry[1]>=3?pct(A.retry):null;
  const s2=`<div class="card rp-sec"><h3>2. Khả năng học</h3>
   <ul class="rp-kv"><li><span>Đúng trong kiểm tra web</span><b>${pctTxt(pct(A.web))}</b></li><li><span>Đúng trong bài giấy</span><b>${pctTxt(pap)}</b></li>
   <li><span>Câu từng sai, làm lại đúng (độ nhớ)</span><b>${pctTxt(ret)}</b></li><li><span>Câu sai đã nhớ chắc</span><b>${A.mastered}</b></li>
   <li><span>Nhịp học</span><b>${RH.sessions?esc(RH.gapTxt||'—'):'—'}</b></li><li><span>Xu hướng 3 buổi gần nhất</span><b>${P.trend==null?'—':(P.trend>=0?'+':'')+Math.round(P.trend*100)+'%'}</b></li>
   <li><span>Hệ số tốc độ học (1 = trung bình)</span><b>${String(eff.f).replace('.',',')}</b></li><li><span>Tuyến lộ trình phù hợp</span><b>${P.stage==='live'?PACE_NAME[P.pace]:'Chưa đủ 3 buổi'}</b></li></ul>
   <p class="small muted">${rhythmLine()}</p></div>`;
  /* 3. khả năng đỗ */
  schoolP();S.school.grade=g;const I=schoolInputs();
  const rows=regionOpts().filter(x=>S.school.langs.includes(x.lang)&&x.cut&&x.cut.length).map(x=>evalOption(x,I)).sort((a,b)=>b.p-a.p);
  const PF=portfolio(rows,I,S.school.langs);
  const top=rows.filter(r=>r.o.lang==='Anh').slice(0,6);
  const s3=`<div class="card rp-sec"><h3>3. Khả năng đỗ ở ${esc(REG().name)} (tính cả Toán, Văn)</h3>
   <p>Toán <b>${fmtN(I.toan)}</b>${I.toanSet?'':' (mốc gợi ý)'} · Văn <b>${fmtN(I.van)}</b>${I.vanSet?'':' (mốc gợi ý)'} · Anh chuyên dự báo lúc thi: ${Object.entries(regionPapers()).map(([k,pp])=>`${esc(pp.label)} khoảng <b>${fmtN(r1(I.ach[k]))}</b>`).join(', ')}.${I.toanSet&&I.vanSet?'':' <span class="muted">Toán, Văn đang để áng chừng; gia đình nhập điểm thật ở tab Chọn trường để kết quả sát hơn.</span>'}</p>
   <div class="tbl-wrap"><table class="rp-tbl"><thead><tr><th>Trường · lớp</th><th>Khả năng</th><th>Điểm dự kiến / điểm chuẩn TB</th></tr></thead><tbody>${top.map(r=>`<tr><td>${esc(r.o.school)} · ${esc(r.o.cls)}</td><td><span class="pill ${r.cls}">${r.lab}</span> ${Math.round(r.p*100)}%</td><td>${fmtN(r1(r.total))} / ${fmtN(r2(r.mean))} (thang ${r.max})</td></tr>`).join('')}</tbody></table></div>
   ${PF.chosen.length?`<p><b>Gợi ý đăng ký:</b> ${PF.chosen.map(e=>`${esc(e.label)} (${e.picks.map(r=>esc(r.o.school)).join(', ')})`).join('; ')}. Khả năng đỗ ít nhất một lớp chuyên khoảng <b>${Math.round(PF.pAny*100)}%</b>.</p>`:''}
   <p class="small muted">Dự báo này giả định giữ lịch học hiện tại (${S.plan.min} phút × ${S.plan.dpw} ngày/tuần${S.plan.cls?`, cộng ${String(S.plan.cls).replace('.',',')} giờ lớp CES/tuần`:''}) tới ngày thi.</p></div>`;
  /* 4. lộ trình nếu theo */
  const lo=g<=7?40:60,hi=g<=7?60:90;
  const opts=CLS_OPTS.map(([c,t])=>{const R=courseCalc(Object.assign({},o,{cls:c}));return {c,t,R,req:R.req}});
  const pick=opts.find(x=>x.req<=hi)||null;const R=(pick||opts[opts.length-1]).R;
  const reqTxt=x=>x.req===Infinity?'cần đổi đích hoặc thêm giờ':x.req<=0.5?'không cần thêm':`khoảng ${Math.round(x.req)} phút/ngày`;
  const s4=`<div class="card rp-sec"><h3>4. Lộ trình nếu theo CES</h3>
   <p>Đích đang chọn: <b>${esc(o.goal.name)}</b> (cần khoảng <b>${esc(lvName(o.targetH))}</b>). Hiện tại: <b>${esc(o.lv?(LEVELS.find(l=>l.k===o.lv)||{name:o.lv}).name:'—')}</b>. Mốc chốt trường: <b>${R.g4.toLocaleDateString('vi-VN')}</b> · ngày thi khoảng <b>${R.exam.toLocaleDateString('vi-VN')}</b>.</p>
   <div class="tbl-wrap"><table class="rp-tbl"><thead><tr><th>Cách học</th><th>Tự học cần thêm (${S.plan.dpw} ngày/tuần) để đạt đích trước mốc chốt</th></tr></thead><tbody>${opts.map(x=>`<tr class="${x===pick?'rp-pick':''}"><td>${esc(x.t)}${x===pick?' <b>· gợi ý</b>':''}</td><td>${reqTxt(x)}${x.req!==Infinity&&x.req>hi?' <span class="muted">(nặng với lớp '+g+')</span>':''}</td></tr>`).join('')}</tbody></table></div>
   ${R.phases.length?`<ol class="rp-ph">${R.phases.map(ph=>`<li><b>GĐ${ph.P.k} ${esc(ph.P.name)}</b> (${esc(ph.P.band)}): ${fmtD(ph.s)} – ${fmtD(ph.e)}, khoảng ${ph.nCh===Infinity?'—':ph.nCh} chặng 14 buổi</li>`).join('')}<li><b>Mốc chốt trường</b> ${R.g4.toLocaleDateString('vi-VN')} → <b>GĐ4 Luyện đề</b> đến ngày thi.</li></ol>`:'<p>Trình độ hiện tại đã đạt mức cần của đích; phần còn lại là giữ phong độ và luyện đề.</p>'}
   ${P.stage==='live'&&P.pace==='careful'?'<p class="small">Theo khả năng học trong 14 buổi, mỗi giai đoạn thêm 1 chặng củng cố (đã tính ở trên).</p>':''}</div>`;
  /* 5. gợi ý khi trao đổi với gia đình */
  const pd=placement(f||d);
  const pts=[
    `Nền tảng: ${f?`đầu vào ${esc(LEVELS.find(l=>l.k===d.level).name)}, đầu ra ${esc(LEVELS.find(l=>l.k===f.level).name)}`:`đầu vào ${esc(LEVELS.find(l=>l.k===d.level).name)}`} (khoảng <b>${esc(pd?pd.range:'—')}</b>, độ chắc ${pd?pd.conf:'—'}). Lộ trình tính theo <b>${esc(o.lv?(LEVELS.find(l=>l.k===o.lv)||{name:o.lv}).name:'—')}</b>${f&&d&&f.level!==d.level?' (mức cao hơn của hai bài)':''}.`,
    P.stage==='live'?`Khả năng học: ${PACE_NAME[P.pace].toLowerCase()}; đúng ${pctTxt(P.acc)} câu web${ret!=null?`, làm lại đúng ${pctTxt(ret)} câu từng sai`:''}; ${esc(RH.gapTxt||'')}.`:'Khả năng học: chưa đủ 3 buổi để nhận xét.',
    PF.chosen.length?`Khả năng đỗ: ít nhất một lớp chuyên khoảng ${Math.round(PF.pAny*100)}% nếu giữ lịch hiện tại đến ngày thi${I.toanSet&&I.vanSet?'':' (Toán, Văn đang áng chừng)'}.${pick&&(pick.c>0||pick.req>S.plan.min+5)?' CES muốn đạt trình độ sớm hơn, trước mốc chốt trường, nên đề xuất dưới đây cần nhiều giờ hơn lịch hiện tại.':''}`:'Khả năng đỗ: các lớp chuyên Anh đang ở mức cần thêm thời gian với lịch hiện tại; xem phần 4 để biết cần bao nhiêu giờ.',
    pick?`Đề xuất: ${pick.c?`học lớp CES ${String(pick.c).replace('.',',')} giờ/tuần và `:''}${pick.req<=0.5?'giữ nhịp tự học hiện tại':`tự học với web ${reqTxt(pick)} (${S.plan.dpw} ngày/tuần)`}${pick.c?'':', chưa cần thêm lớp'}, để đạt ${esc(lvName(o.targetH))} trước mốc chốt ${R.g4.toLocaleDateString('vi-VN')}.`:`Đề xuất: với đích ${esc(o.goal.name)}, các cách học trong bảng đều nặng với lớp ${g}. Có thể chọn đích gần hơn trước rồi nâng dần, hoặc thêm giờ học trên lớp.`,
    stage==='chot'?'Đủ dữ liệu để chốt tư vấn.':'Nên chốt sau khi có bài đầu ra và từ 10 buổi học.'];
  const s5=`<div class="card rp-sec rp-advice"><h3>5. Tóm tắt để cô trao đổi với gia đình</h3><ul>${pts.map(x=>`<li>${x}</li>`).join('')}</ul>
   <p class="small muted">Mọi con số là ước lượng để định hướng, không phải cam kết. Cách tính: giờ học có hướng dẫn theo Cambridge, tự học tính 0,6 giờ, học trên lớp CES 0,8 giờ, trừ 15% thời gian nghỉ; công thức xét tuyển và điểm chuẩn từng trường 2022–2026.</p></div>`;
  return head+s1+s2+s3+s4+s5}
function vReport(){
  M().innerHTML=`<section class="view rp"><div class="row rp-bar"><button class="btn ghost" type="button" id="rpBack">← Tiến bộ</button><button class="btn hi" type="button" id="rpPrint">In / lưu PDF</button></div>
   <div class="hung-say">${hungFig('sm')}<p>Cháu chào cô chú ạ! Đây là báo cáo sau đợt thử 14 buổi: nền tảng tiếng Anh, cách bạn ấy học, khả năng đỗ từng trường và lộ trình nếu theo. Cô chú in hoặc lưu PDF để trao đổi với cô nhé ạ.</p></div>
   ${S.diag?reportBody():`<div class="card lockbox">${doodle('lock','lk',56)}<div><h3>Báo cáo mở khi có bài đầu vào</h3><p>Làm bài đầu vào xong là có bản sơ bộ; học đủ 14 buổi và làm bài đầu ra là có bản để tư vấn.</p></div></div>`}</section>`;
  $('#rpBack').onclick=()=>go('progress');$('#rpPrint').onclick=()=>window.print()}
views.report=vReport;

/* ----- dựng lại hồ sơ từ mã kết quả (cô dán mã, hoặc mở từ trang theo dõi của cô) ----- */
function sFromSummary(o){const st=blank();st.name=o.n||'';
  const t=x=>x&&{total:x.t,of:x.o,level:x.l,bands:x.b,hours:ENTRY_H[x.l]!=null?ENTRY_H[x.l]:220,dur:x.u,blank:x.k,answers:{},loc:x.lc||null,locF:x.lf||null,wr:x.w?{score:x.w.s,of:x.w.of,words:x.w.n}:null,byDay:x.bd||null};
  st.diag=t(o.d);st.final=t(o.f);if(o.p)st.plan=Object.assign({min:40,dpw:6,cls:0},o.p);
  st.region=o.rg||'ha-noi';st.school=Object.assign(blankSchool(),o.sc||{},{grade:o.g||7});st.course=Object.assign({goal:o.gl||'cva',lv:null},o.cs||{});
  if(o.tr&&o.d&&o.tr!==trackFromLevel(o.d.l))st.track=o.tr;
  st.stats={retry:o.rt||[0,0],spiral:[0,0]};for(let i=0;i<(o.mq||0);i++)st.mastered['m'+i]=1;
  (o.q||[]).forEach(([id,w])=>{st.queue[id]={stage:0,due:99,wrong:w}});
  let skDone=false;
  Object.entries(o.days||{}).forEach(([d,v])=>{const r={};if(v[0]!=null){r.web={correct:v[0],total:v[1],at:v[4],bySkill:skDone?{}:(o.sk||{})};skDone=true}
    if(v[2]!=null)r.paper={correct:v[2],total:v[3],at:v[4]};st.days[d]=r});
  return st}
function withS(st,fn){const k=S;S=st;try{return fn()}finally{S=k}}
function reportFromSummary(o){return withS(sFromSummary(o),()=>reportBody())}
/* mở trang với #bc=<mã> → chỉ hiện báo cáo, không đụng dữ liệu trên máy */
function bootReport(){const h=location.hash||'';if(!h.startsWith('#bc='))return false;
  M().innerHTML='<p class="muted">Đang mở báo cáo…</p>';
  unpack(decodeURIComponent(h.slice(4))).then(o=>{M().dataset.v='report';M().innerHTML=`<section class="view rp"><div class="row rp-bar"><button class="btn hi" type="button" id="rpPrint">In / lưu PDF</button></div>${reportFromSummary(o)}</section>`;$('#rpPrint').onclick=()=>window.print()})
   .catch(()=>{M().innerHTML='<div class="card"><p>Mã báo cáo không đọc được.</p></div>'});
  return true}
(function(){const st=document.createElement('style');st.textContent=`
.rp-head h2{margin:.1em 0}.rp-stage{font-weight:700;border-radius:10px;padding:6px 10px;background:#FFF3B0;color:#14303A;display:inline-block}.rp-stage.chot{background:#D6F2DF}
.rp-up{color:#1a7f3c}.rp-dn{color:#b3261e}
.rp-sec{margin-top:12px}.rp-sec h3{margin-top:0}.rp-tbl{width:100%;font-size:.92rem}.rp-tbl td,.rp-tbl th{vertical-align:top}.rp-pick td{background:#FFF7CC}
.rp-kv{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.rp-kv li{display:flex;justify-content:space-between;gap:10px;border:2px solid var(--line,#dde);border-radius:10px;padding:8px 12px}.rp-kv b{white-space:nowrap}
.rp-ph{padding-left:1.4em}.rp-ph li{margin:.25em 0}.rp-advice ul li{margin:.35em 0}.rp-bar{justify-content:space-between;margin-bottom:8px}
.t-sec{margin:18px 0 10px;padding:10px 14px;border-radius:12px;background:#14303A;color:#fff;line-height:1.5}.t-sec b{font-weight:600}.t-ls{margin:6px 0 8px}.t-ls .ls-txt{margin-top:6px}
.tsug{margin-top:8px;border-radius:12px;padding:10px 12px;border:2px dashed #14303A;background:#FFF7CC;color:#14303A;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tsug.down{background:#E8F4F7}
@media print{.rp-bar,.rp .hung-say,header.top,.gate,.gate-pill,.h-toast,.pv-bar{display:none!important}html,body{background:#fff!important}main.wrap{margin:0!important;max-width:none!important}.rp-sec,.rp-head{break-inside:avoid;box-shadow:none!important}}
`;document.head.appendChild(st)})();
