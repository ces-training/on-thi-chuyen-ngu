/* ----- Sau 14 ngày: toàn bộ chương trình Chuyên Anh lớp 6–9 ở CES, xếp theo thời gian còn lại của từng em -----
   Chèn vào template.html sau school.js bởi build.py.
   Dùng: S, save, $, esc, M, agg, efficiency, LEVELS, ENTRY_H, levelOfHours, CONV, STUDY_FACTOR, DAYS, dayStatus,
         examDateFor, blankSchool, SCORE_MAP, gradeNow, setGrade, classF, go.
   Nội dung lấy từ "Khung chương trình Chuyên Anh lớp 6–9" (bản 22/10/2026); sửa khung thì sửa các mảng dưới đây. */

/* 41 chủ điểm ngữ pháp theo mốc. d14 = đã gặp trong 14 ngày (buổi số mấy) */
const GRAM=[
 ['A2','Hiện tại đơn, hiện tại tiếp diễn, động từ trạng thái',1],
 ['A2','Quá khứ đơn, quá khứ tiếp diễn; when/while',2],
 ['A2','Hiện tại hoàn thành (for, since, already, yet, ever)',3],
 ['A2','Tương lai: will, be going to, hiện tại tiếp diễn',4],
 ['A2','So sánh hơn, so sánh nhất, as … as',5],
 ['A2','Danh từ đếm được/không đếm được; some, any, much, many; mạo từ cơ bản',9],
 ['A2','Động từ khuyết thiếu: can, could, must, have to, should',6],
 ['A2','Giới từ thời gian, nơi chốn',0],
 ['A2','Câu điều kiện loại 0 và 1',10],
 ['A2','Mệnh đề quan hệ cơ bản (who, which, that)',11],
 ['B1','Hiện tại hoàn thành và quá khứ đơn; hiện tại hoàn thành tiếp diễn',3],
 ['B1','Quá khứ hoàn thành; used to, would, be/get used to',2],
 ['B1','Câu điều kiện loại 2; wish với hiện tại',10],
 ['B1','Bị động ở các thì cơ bản và với động từ khuyết thiếu',8],
 ['B1','Câu tường thuật: câu kể, câu hỏi, mệnh lệnh',12],
 ['B1','Mệnh đề quan hệ xác định, không xác định; whose, where, when, why',11],
 ['B1','Danh động từ và động từ nguyên mẫu; stop, remember, try, regret',13],
 ['B1','Động từ khuyết thiếu chỉ suy đoán: must, might, can\'t',0],
 ['B1','So … that, such … that, too, enough; the more … the more',5],
 ['B1','Từ nối: although, despite, because of, unless, in case',0],
 ['B1','Câu hỏi đuôi',0],
 ['B2','Câu điều kiện loại 3 và hỗn hợp; but for, otherwise, provided that',0],
 ['B2','Wish, if only, would rather, it\'s (high) time',0],
 ['B2','Bị động nâng cao: It is said that …; have/get sth done',0],
 ['B2','Động từ tường thuật: accuse of, deny, suggest, apologise for, warn',0],
 ['B2','Rút gọn mệnh đề quan hệ và mệnh đề trạng ngữ',0],
 ['B2','Đảo ngữ: never, rarely, not until, hardly … when, no sooner … than',0],
 ['B2','Câu chẻ: It is … that, What … is',0],
 ['B2','Giả định cách: suggest/insist that + V nguyên mẫu',0],
 ['B2','Tương lai hoàn thành, tương lai tiếp diễn',0],
 ['B2','Động từ khuyết thiếu + have V3: should have, must have, needn\'t have',0],
 ['B2','Mệnh đề danh ngữ (what, whether, the fact that)',0],
 ['B2','Mạo từ, lượng từ nâng cao (either, neither, the number of)',0],
 ['B2','Động từ + giới từ, tính từ + giới từ',0],
 ['C1','Đảo ngữ câu điều kiện: Should …, Were … to, Had …',0],
 ['C1','Mệnh đề nhượng bộ: however / no matter how; Tính từ + as + S + be',0],
 ['C1','Đảo ngữ với so, such, only by/after, under no circumstances, little',0],
 ['C1','Danh từ hoá (chuyển mệnh đề sang cụm danh từ)',0],
 ['C1','Cụm giới từ phức: in the event of, on the verge of, with a view to',0],
 ['C1','Lược bỏ và thay thế (so, not, do so, one)',0],
 ['C1','Viết lại câu bằng thành ngữ và cụm cố định',0]
];
const CLUSTERS=['Giáo dục và tự học','Công nghệ và mạng xã hội','Môi trường','Sức khoẻ và thể thao','Tuổi teen và trưởng thành','Gia đình và các mối quan hệ','Cộng đồng và xã hội','Nghề nghiệp và tương lai','Văn hoá, du lịch, lễ hội','Truyền thông và đọc','Khoa học và phát minh','Cuộc sống hiện đại'];
/* Ba giai đoạn nâng trình độ. from/to: giờ học chuẩn (thang Cambridge). Giai đoạn 1 bắt đầu từ 0 để nhận cả học sinh dưới A2. */
const PHASES=[
 {k:1,name:'Nền tảng',band:'đến B1',from:0,to:375,gate:'B1',c:'#9ED6E2',
  gram:['A2','B1'],
  vocab:'khoảng 2.600 từ, 120 cụm động từ, 150 collocation, 30 thành ngữ, 50 cặp từ hay nhầm',
  tasks:['Hoàn thành câu: phân biệt hai thì, collocation cơ bản','Cấu tạo từ trong câu đơn, đổi 1–2 lần (-tion, -ment, -ness, -able, -ive, -ous; dis-, im-, in-)','Điền từ có gợi ý, đoạn 150–200 từ; điền từ tự do: mạo từ, giới từ, đại từ','Đọc hiểu 300–450 từ, đoán nghĩa từ; nối tiêu đề với đoạn','Nghe 2–3 phút, tốc độ thường','Viết lại câu: bị động, tường thuật, điều kiện loại 1–2, wish','Hội thoại: đề nghị, từ chối lịch sự; phát âm, trọng âm từ 2–3 âm tiết'],
  writing:'Đoạn văn nêu ý kiến: câu chủ đề, 2–3 lý do, câu kết. 100–150 từ trong 20 phút (bắt đầu từ đoạn 50–70 từ nếu em dưới A2).',
  how:'Video ngữ pháp cho mỗi chủ điểm mới (nhóm dưới A2 có thêm video giảng tiếng Việt). Game thẻ nhớ, Săn từ 60 giây, Xưởng ghép từ, Ba rổ âm. In: tập bài của chặng, sổ lỗi sai, sổ từ theo họ từ, bảng tra cứu động từ bất quy tắc.'},
 {k:2,name:'Bắc cầu',band:'B1 → B2',from:375,to:550,gate:'B2',c:'#FFE27A',
  gram:['B2'],
  vocab:'khoảng 3.800 từ, 250 cụm động từ, 400 collocation, 120 thành ngữ, 100 cặp từ hay nhầm',
  tasks:['Hoàn thành câu: cụm động từ, thành ngữ, phương án gần nghĩa','Cấu tạo từ trong đoạn văn 150–200 từ, đổi 2 lần (care → careless → carelessness)','Điền từ đoạn 200–250 từ; điền từ tự do thêm từ nối, trợ động từ, đại từ quan hệ','Đọc hiểu 500–750 từ: suy luận, từ thay thế; nối thông tin với đoạn, tóm tắt dùng từ trong bài','Nghe 3–4 phút, hai người nói, có bẫy','Viết lại câu: đảo ngữ, câu chẻ, điều kiện loại 3, rút gọn mệnh đề','Đồng nghĩa, trái nghĩa bằng cụm động từ, collocation; trọng âm từ 3–4 âm tiết'],
  writing:'Bài luận 4–5 đoạn (đồng ý/không đồng ý, ưu–nhược, vấn đề–giải pháp), 200–250 từ trong 40 phút. Mỗi bài chấm hai vòng: máy chấm và gợi ý sửa, em viết lại, cô chấm bản viết lại.',
  how:'Video cách làm từng dạng bài (Cambridge B2 First) và cách viết bài luận. Game Nối cặp tính giờ, Xếp gạch cho viết lại câu (chỉ lần đầu gặp cấu trúc). In: giấy viết luận có ô đếm từ, bài kiểm tra cuối chặng có phiếu trả lời.'},
 {k:3,name:'Chuyên sâu',band:'B2 → đích',from:550,to:9999,gate:'đích',c:'#BFE6EE',
  gram:['C1'],
  vocab:'đến C1: khoảng 5.000 từ, 400 cụm động từ, 700 collocation, 250 thành ngữ, 150 cặp từ hay nhầm',
  tasks:['Hoàn thành câu: thành ngữ ít gặp, sắc thái từ, collocation hẹp','Cấu tạo từ đổi 3 lần, nghĩa phủ định (unforgettable), cặp dễ nhầm (economic/economical)','Điền từ đoạn 250–300 từ; điền từ tự do có cụm cố định, lược bỏ, đảo ngữ','Đọc 750–900 từ: thái độ tác giả, diễn đạt lại ý; tóm tắt bằng từ diễn đạt lại (dạng mới của đề Sở 2024)','Nghe 4–5 phút, nhiều giọng, có tiếng ồn nền như đề Sở','Viết lại câu với từ cho sẵn, dùng thành ngữ, danh từ hoá','Hội thoại có câu nói gián tiếp, thành ngữ; trọng âm từ học thuật 4+ âm tiết'],
  writing:'Bài luận có phản biện (nêu và bác ý kiến ngược), ví dụ cụ thể, từ vựng chủ đề. Khoảng 250 từ trong 35 phút, chấm hai vòng như giai đoạn trước.',
  how:'Video nạp ý và từ ở buổi mở mỗi cụm chủ đề (BBC 6 Minute English, TED-Ed). Game Tăng tốc cho cụm động từ, thành ngữ, từ hay nhầm. Ưu tiên các cụm chủ đề đã ra bài luận Sở và Chuyên Ngoại ngữ.'}
];
const EXAM_PHASE={name:'Luyện đề',
  tasks:['Mỗi tuần 1 đề chuyên Anh Sở trọn bộ (120 phút, có nghe), làm đúng giờ trên giấy, nghe bằng file trên web','Xen kẽ đề Chuyên Ngoại ngữ (90 phút, 60 câu + bài luận) và Chuyên Sư phạm (tự luận, viết đoạn)','Đề chung của Sở 40 câu: bài lấy trọn điểm','Buổi chữa đề: câu sai vào sổ lỗi sai và quay lại theo vòng 1–3–6 buổi','Tuần cuối 2–3 đề'],
  speed:'Tốc độ cần đạt: 30–40 giây một câu trắc nghiệm ngữ pháp–từ vựng, 12–15 phút một bài đọc dài, 35 phút bài luận 250 từ.',
  how:'Không dùng game. Đề in có phiếu trả lời giống thật; chụp gửi máy chấm, cô chấm bài luận.'};
/* Đích theo trường: điểm Anh chuyên cần để có khoảng 80% khả năng đỗ với Toán 8, Văn 8 (khung mục 2), đổi ra giờ học bằng đúng thang của tab Chọn trường */
const GOALS=[
 {k:'ams',name:'Amsterdam',score:8.7,kind:'so'},
 {k:'cva',name:'Chu Văn An',score:7.4,kind:'so'},
 {k:'nh',name:'Nguyễn Huệ',score:7.1,kind:'so'},
 {k:'cnn',name:'Chuyên Ngoại ngữ',score:6.7,kind:'cnn'},
 {k:'st',name:'Sơn Tây',score:5.4,kind:'so'}];
function hoursFromScore(s,kind){const p=SCORE_MAP[kind];if(s<=p[0][1])return p[0][0]*s/p[0][1];
  for(let i=1;i<p.length;i++){if(s<=p[i][1]){const a=p[i-1],b=p[i];return a[0]+(b[0]-a[0])*(s-a[1])/(b[1]-a[1])}}return p[p.length-1][0]}
function goalH(k){const g=GOALS.find(x=>x.k===k)||GOALS[1];return Math.round(hoursFromScore(g.score,g.kind))}
function lvName(h){const L=levelOfHours(h);const nx=LEVELS[LEVELS.indexOf(L)+1];if(L.k==='preA2')return 'Dưới A2';if(L.k==='C1')return h>=790?'C1+':'C1';const f=(h-L.h)/(nx.h-L.h);return f>0.6?L.name+'–'+nx.name:f>=0.25?L.name+' vững':L.name}
const CLS_OPTS=[[0,'Chỉ tự học ở nhà với web'],[1.5,'Lớp CES 1,5 giờ/tuần'],[3,'Lớp CES 3 giờ/tuần'],[4.5,'Lớp CES 4,5 giờ/tuần']];
const fmtD=d=>String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
const WK=7*864e5;
/* ngưỡng phút tự học mỗi buổi theo lớp (tài liệu Lộ trình cá nhân hoá) và giới hạn gói buổi */
function zone(min,grade){const lo=grade<=7?40:60,hi=grade<=7?60:90;return min<=lo?'good':min<=hi?'warn':'bad'}
function packCap(grade){return grade<=7?50:70}

function courseCalc(o){
  const now=Date.now();
  const left14=DAYS.filter(d=>dayStatus(d.day)!=='done').length;
  const start=new Date(now+left14/(o.dpw*STUDY_FACTOR)*WK);
  const exam=examDateFor(o.grade);const g4=chotDate(o.grade); // mốc chốt trường: hết hạn nâng trình độ, từ đây chỉ luyện đề
  const gain=(o.min*o.dpw/60*CONV*o.eff+o.cls*classF())*STUDY_FACTOR; // giờ học chuẩn mỗi tuần lịch
  const chW=14/(o.dpw*STUDY_FACTOR); // số tuần lịch cho một chặng 14 buổi
  const perCh=gain*chW;
  const phases=[];let t=start.getTime(),h=o.entryH;
  for(const P of PHASES){const a=Math.max(P.from,h),b=Math.min(P.to,o.targetH);if(b<=a)continue;
    const need=b-a,w=gain>0?need/gain:Infinity,nCh=gain>0?Math.max(1,Math.ceil(need/perCh)):Infinity;
    phases.push({P,need,nCh,s:new Date(t),e:new Date(t+w*WK),fromH:a,toH:b});t+=w*WK;h=b}
  const end=new Date(t);
  const wTo=d=>Math.max(0,(d-start)/WK);
  const reqMin=d=>{const w=wTo(d)*STUDY_FACTOR;if(w<=0)return Infinity;const hpw=(o.targetH-o.entryH)/w-o.cls*classF();return Math.max(0,hpw/(CONV*o.eff)*60/o.dpw)};
  const before=wTo(g4)>=6; // còn ít nhất 6 tuần trước mốc chốt; nếu không (lớp 9 đã sát mốc) thì tính đến ngày thi
  const req=before?reqMin(g4):reqMin(exam);
  const hExam=o.entryH+gain*wTo(exam),hChot=o.entryH+gain*wTo(before?g4:exam);
  const g4Ch=Math.max(0,Math.floor((exam-Math.max(g4,start))/WK*o.dpw*STUDY_FACTOR/14));
  const status=o.targetH<=o.entryH?'done':end<=g4?'good':end<=exam?'warn':'bad';
  return {start,exam,g4,gain,chW,perCh,phases,end,req,before,hExam,hChot,g4Ch,status,reqMin,wBefore:wTo(g4)};
}
function courseInputs(){
  S.course=Object.assign({goal:'cva',lv:null},S.course||{});
  if(S.plan.cls==null)S.plan.cls=0;
  const A=agg(),eff=efficiency(A);
  const tested=S.final&&S.final.hours>(S.diag?S.diag.hours:0)?S.final:S.diag;
  const lv=S.course.lv||(tested&&tested.level)||null;
  const entryH=lv?(ENTRY_H[lv]!=null?ENTRY_H[lv]:(LEVELS.find(l=>l.k===lv)||{h:220}).h):220;
  return {grade:gradeNow(),entryH,lv,tested,targetH:goalH(S.course.goal),min:S.plan.min,dpw:S.plan.dpw,cls:S.plan.cls,eff:eff.f,effFrom:eff.from};
}
/* chủ điểm ngữ pháp của một giai đoạn, rải đều vào các chặng */
function gramPlan(ph,entryH){
  let marks=ph.P.gram.slice();if(ph.P.k===1&&entryH>=190)marks=['B1'];
  const list=GRAM.map((g,i)=>({n:i+1,m:g[0],t:g[1],d14:g[2]})).filter(g=>marks.includes(g.m));
  const nCh=Math.min(ph.nCh,999),rows={};
  list.forEach((g,i)=>{const c=Math.floor(i*nCh/list.length)+1;(rows[c]=rows[c]||[]).push(g)});
  const out=[];let gapFrom=null;
  for(let c=1;c<=nCh;c++){if(rows[c]){if(gapFrom){out.push({a:gapFrom,b:c-1});gapFrom=null}out.push({a:c,b:c,items:rows[c]})}else if(!gapFrom)gapFrom=c}
  if(gapFrom)out.push({a:gapFrom,b:nCh});
  return {out,reviewA2:ph.P.k===1&&entryH>=190};
}
function timelineHTML(R,o){
  const t0=Date.now(),t1=R.exam.getTime()+20*864e5,X=t=>Math.max(0,Math.min(100,(t-t0)/(t1-t0)*100));
  const seg=(a,b,cls,label,style='')=>{const l=X(a),w=Math.max(.6,X(b)-l);return `<div class="tl-seg ${cls}" style="left:${l}%;width:${w}%;${style}" title="${esc(label)}"><span>${w>9?esc(label):''}</span></div>`};
  let row1=seg(t0,R.start.getTime(),'s0','14 ngày');
  R.phases.forEach(p=>{row1+=seg(p.s.getTime(),Math.min(p.e.getTime(),t1),'sp',`GĐ${p.P.k} ${p.P.name}`,`background:${p.P.c}`)});
  const row2=seg(Math.max(R.g4.getTime(),t0),R.exam.getTime(),'s4','GĐ4 Luyện đề');
  let ticks='';const y0=new Date(t0).getFullYear();
  for(let y=y0;y<=R.exam.getFullYear();y++){const d=new Date(y,8,5).getTime();if(d>t0&&d<t1){const g=o.grade+(y-(new Date(t0).getMonth()>=7?y0+1:y0))+1;ticks+=`<span class="tl-tick" style="left:${X(d)}%">${g<=9?'Lớp '+g:''}</span>`}}
  if(R.g4.getTime()>t0)ticks+=`<span class="tl-tick ch" style="left:${X(R.g4.getTime())}%">Chốt trường</span>`;
  ticks+=`<span class="tl-tick ex" style="left:${X(R.exam.getTime())}%">Thi</span>`;
  return `<div class="tl" role="img" aria-label="Dòng thời gian các giai đoạn từ nay đến kỳ thi ${fmtD(R.exam)}">
    <div class="tl-lab">Nâng trình độ</div><div class="tl-row">${row1}</div>
    <div class="tl-lab">Luyện đề</div><div class="tl-row">${row2}</div>
    <div class="tl-lab"></div><div class="tl-axis">${ticks}</div></div>`;
}
function phaseCard(ph,i,R,o,first){
  const G=gramPlan(ph,o.entryH);const late=ph.e>R.g4;
  const rows=G.out.map(r=>r.items?`<tr><td>Chặng ${r.a}</td><td>${r.items.map(g=>`${g.n}. ${esc(g.t)}${g.d14?' <span class="pill d14">đã gặp ở buổi '+g.d14+'</span>':''}`).join('<br>')}</td></tr>`:`<tr><td>Chặng ${r.a}${r.b>r.a?'–'+r.b:''}</td><td class="muted">Luyện sâu các chủ điểm đã học bằng viết lại câu, ôn xoắn ốc, mở rộng từ theo 12 cụm chủ đề</td></tr>`).join('');
  const toName=ph.toH>=o.targetH?lvName(o.targetH):ph.P.gate;
  const ms=MS().find(m=>m.final?ph.toH>=o.targetH:m.h===ph.toH);
  const msTxt=ms?(()=>{const ok=ph.e<=ms.date;const gap=Math.round((ph.e-ms.date)/(30.4*864e5));return `<p class="ms"><span class="pill ${ok?'good':'warn'}">${ok?'kịp mốc':'chậm '+gap+' tháng'}</span> Mốc chuẩn của CES: <b>${esc(ms.target)}</b> trước ${ms.date.toLocaleDateString('vi-VN')} (${esc(ms.label.toLowerCase())}). Em dự kiến đạt khoảng ${fmtD(ph.e)}.${ok?'':ms.final?' Như vậy là trông vào bứt phá năm cuối cấp: nên tăng thời gian ngay từ bây giờ.':' Chậm mốc giữa chặng vẫn bù được nếu em kịp mốc chốt trường.'}</p>`})():'';
  return `<details class="card ph" ${first?'open':''} style="--pc:${ph.P.c}">
   <summary><span class="ph-n">GĐ${ph.P.k}</span><span class="ph-t"><b>${esc(ph.P.name)}</b> · ${esc(ph.fromH===o.entryH&&o.lv?(LEVELS.find(l=>l.k===o.lv)||{name:lvName(ph.fromH)}).name:lvName(ph.fromH))} → ${esc(toName)}<br><span class="small muted">${fmtD(ph.s)} – ${fmtD(ph.e)} · khoảng ${isFinite(ph.nCh)?ph.nCh:'?'} chặng</span></span>${late?'<span class="pill warn">chồng lên luyện đề</span>':''}</summary>
   <div class="ph-b">
    <p>Mục tiêu: lên <b>${esc(toName)}</b> và qua bài kiểm tra cửa ra mới sang giai đoạn sau. Chưa qua thì em học thêm một chặng ôn nhắm vào phần còn yếu.</p>${msTxt}
    <h4>Ngữ pháp mới, rải theo chặng</h4>
    ${G.reviewA2?'<p class="small muted">10 chủ điểm mốc A2 không học lại thành bài mới; chúng quay lại trong các buổi ôn và bài viết lại câu.</p>':''}
    <div class="tbl-wrap"><table class="gp"><tbody>${rows}</tbody></table></div>
    <h4>Từ vựng tích luỹ đến hết giai đoạn</h4><p>${esc(ph.P.vocab)}. Từ được học theo họ từ và theo cụm; mỗi buổi học là một trong 12 cụm chủ đề, nên mỗi chặng em đi hết một vòng 12 cụm với từ khó dần.</p>
    <h4>Dạng bài thi ở mức này</h4><ul>${ph.P.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    <h4>Viết</h4><p>${esc(ph.P.writing)}</p>
    <h4>Học bằng gì</h4><p>${esc(ph.P.how)}</p>
   </div></details>`;
}
function vCourse(){
  const o0=courseInputs();
  const lvOpts=[['','Theo bài kiểm tra'+(o0.tested?' ('+LEVELS.find(l=>l.k===o0.tested.level).name+')':' (chưa làm, tạm tính A2)')]].concat(LEVELS.filter(l=>l.k!=='C1').map(l=>[l.k,l.name]));
  M().innerHTML=`<section class="view course">
  <div><p class="eyebrow">Sau 14 ngày thì học gì?</p><h2>Chương trình Chuyên Anh của em ở CES, từ hôm nay đến kỳ thi vào 10</h2>
  <p class="lead">14 ngày này là chặng chẩn đoán. Sau đó em đi tiếp các giai đoạn dưới đây. Mỗi giai đoạn gồm nhiều chặng 14 buổi giống hệt bộ em đang học: 12 buổi học và 2 buổi ôn, làm bài trên giấy, kiểm tra trên web.</p></div>
  <div class="card"><h3>Em khai báo</h3>
   <div class="sgrid">
    <label class="fld">Em đang học lớp<select id="cGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${o0.grade===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
    <label class="fld">Trình độ bây giờ<select id="cLv">${lvOpts.map(([k,n])=>`<option value="${k}" ${(S.course.lv||'')===k?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="fld">Trường em nhắm<select id="cGoal">${GOALS.map(g=>`<option value="${g.k}" ${S.course.goal===g.k?'selected':''}>${esc(g.name)} (cần khoảng ${esc(lvName(goalH(g.k)))})</option>`).join('')}</select></label>
    <label class="fld">Học trên lớp ở CES<select id="cCls">${CLS_OPTS.map(([v,n])=>`<option value="${v}" ${o0.cls===v?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
   </div>
   <div class="sim">
    <div class="slider"><label for="cMin">Phút tự học mỗi buổi (giấy + web) <output id="cMinO">${S.plan.min}</output></label><input type="range" id="cMin" min="15" max="120" step="5" value="${S.plan.min}"></div>
    <div class="slider"><label for="cDpw">Số buổi mỗi tuần <output id="cDpwO">${S.plan.dpw}</output></label><input type="range" id="cDpw" min="3" max="7" step="1" value="${S.plan.dpw}"></div>
   </div>
   <p class="small muted">Hai thanh trượt này dùng chung với tab Lộ trình &amp; khả thi.</p>
  </div>
  <div id="cOut"></div>
  </section>`;
  const draw=()=>{
    const o=courseInputs();const R=courseCalc(o);
    const nAll=R.phases.reduce((t,p)=>t+(isFinite(p.nCh)?p.nCh:0),0);
    const weeksLeft=Math.round((R.exam-Date.now())/WK);
    const reqR=Math.ceil(R.req/5)*5,z=zone(reqR,o.grade),cap=packCap(o.grade);
    const head={done:'Em đã ở mức của trường này',good:'Kịp mốc chốt trường',warn:'Chỉ kịp nếu bứt phá ở năm cuối cấp: rủi ro',bad:'Chưa kịp với lịch hiện tại'}[R.status];
    const vcls={done:'good',good:'good',warn:'warn',bad:'bad'}[R.status];
    let msg;
    if(R.status==='done')msg=`Trình độ em đã chạm mức cần cho trường này. Em có thể chọn trường cao hơn ở ô "Trường em nhắm", hoặc giữ lịch nhẹ và vào luyện đề sớm.`;
    else if(R.status==='good')msg=`Với ${o.min} phút × ${o.dpw} buổi/tuần${o.cls?` và ${String(o.cls).replace('.',',')} giờ học trên lớp`:''}, em đạt mức cần khoảng ${fmtD(R.end)}, trước mốc chốt trường (${fmtD(R.g4)}). Từ mốc chốt, em đã biết thi trường nào và chỉ còn luyện đề, giữ phong độ, không phải học thêm kiến thức mới trong năm cuối cấp.`;
    else if(R.status==='warn')msg=`Với lịch này, em chỉ tới mức cần vào khoảng ${fmtD(R.end)}, sau mốc chốt trường (${fmtD(R.g4)}). Như vậy là trông vào bứt phá trong những tháng cuối, đúng lúc em còn thi học kỳ và ôn Toán, Văn. CES khuyên tăng thời gian ngay từ bây giờ, hoặc chọn trường có mức cần thấp hơn.`;
    else msg=`Với lịch này, đến mốc chốt trường em đạt khoảng ${esc(lvName(R.hChot))}, và đến ngày thi cũng chưa tới mức ${esc(lvName(o.targetH))} mà trường cần.`;
    const reqTxt=R.status==='done'?'':isFinite(reqR)?`Để đạt mức cần ${R.before?'trước mốc chốt trường':'trước ngày thi'}, em cần khoảng <b>${reqR} phút tự học mỗi buổi</b>, ${o.dpw} buổi/tuần${o.cls?', cộng giờ học trên lớp':''}. ${z==='good'?'Mức này vừa sức với tuổi của em.':z==='warn'?'Mức này nặng nhưng làm được nếu giữ lịch cố định.':'Mức này quá nặng với tuổi của em.'}${reqR>cap?` Gói buổi dài nhất cho lớp ${o.grade} là ${cap} phút, nên cách hợp lý là thêm giờ học trên lớp hoặc chọn trường có mức cần thấp hơn.`:''}`:'';
    const opts=CLS_OPTS.map(([c,n])=>{const r=courseCalc(Object.assign({},o,{cls:c}));const m=Math.ceil(r.req/5)*5;const zz=zone(m,o.grade);return `<tr${c===o.cls?' class="cur"':''}><td>${esc(n)}</td><td>${r.status==='done'?'–':isFinite(m)?m+' phút':'không kịp'}<br><span class="pill ${r.status==='done'?'good':zz}">${r.status==='done'?'đã đạt':zz==='good'?'vừa sức':zz==='warn'?'nặng':'quá sức'}</span></td><td>${esc(lvName(r.hChot))}</td></tr>`}).join('');
    const nd=DAYS.filter(d=>dayStatus(d.day)==='done').length;
    const first=R.phases[0];
    const firstBox=first?`<div class="card first"><p class="eyebrow">Chặng đầu tiên sau 14 ngày</p><h3>GĐ${first.P.k} · ${esc(first.P.name)}, bắt đầu khoảng ${R.start.toLocaleDateString('vi-VN')}</h3>
      <p>${(()=>{const g=gramPlan(first,o.entryH).out.find(r=>r.items);return g?'Ngữ pháp mới: '+g.items.map(x=>esc(x.t)).join('; ')+'.':''})()} Mười hai buổi học đi qua 12 cụm chủ đề: ${CLUSTERS.map(esc).join(', ')}. Buổi 7 và 14 là buổi ôn, buổi 14 là bài kiểm tra cuối chặng.</p>
      <p class="small muted">Một chặng kéo dài khoảng ${(Math.round(R.chW*2)/2).toLocaleString('vi-VN')} tuần với ${o.dpw} buổi/tuần (đã trừ ngày nghỉ, thi học kỳ).</p></div>`:'';
    $('#cOut').innerHTML=`
    <div class="card"><h3>Thời gian của em</h3>
     <div class="kpis"><div><b>${weeksLeft}</b><span>tuần đến kỳ thi (${R.exam.toLocaleDateString('vi-VN')})</span></div><div><b>${nd}/14</b><span>buổi chẩn đoán đã xong</span></div><div><b>${Math.round(R.wBefore)}</b><span>tuần học trước mốc chốt trường (${fmtD(R.g4)})</span></div><div><b>${nAll}+${R.g4Ch}</b><span>chặng nâng trình độ + chặng luyện đề</span></div></div>
     ${timelineHTML(R,o)}
     <p class="small muted">Dòng trên: các giai đoạn nâng trình độ theo tốc độ dự kiến của em. Mốc chốt trường cố định ở tháng ${R.g4.getMonth()+1} năm lớp 9, sớm hơn kỳ thi ${CHOT_MONTHS} tháng; dòng dưới là giai đoạn luyện đề từ mốc đó đến ngày thi. Mỗi giai đoạn chỉ kết thúc khi em qua bài kiểm tra cửa ra, nên ngày tháng sẽ được tính lại sau mỗi chặng.</p></div>
    <div class="verdict ${vcls}"><p class="eyebrow">Kết luận cho em và bố mẹ</p><h3>${esc(head)}</h3><p>${msg}</p>${reqTxt?`<p>${reqTxt}</p>`:''}
     ${R.status!=='done'?`<div class="tbl-wrap"><table class="copt"><thead><tr><th>Cách học</th><th>Phút tự học cần mỗi buổi</th><th>Trình độ ở mốc chốt nếu giữ số phút hiện tại</th></tr></thead><tbody>${opts}</tbody></table></div>`:''}
     ${o.grade===9?'<p class="small"><b>Lớp 9:</b> mốc chốt trường đã ở rất gần, nên em chốt trường theo trình độ và điểm thi thử hiện tại, rồi vào luyện đề ngay; phần ngữ pháp và từ vựng còn thiếu học xen trong các buổi chữa đề. Đích thực tế nhất thường là Chuyên Ngoại ngữ hoặc Nguyễn Huệ.</p>':''}
     <p class="small">${o.tested?'':'Em chưa làm bài kiểm tra đầu vào nên trang tạm tính em ở A2. '}${o.effFrom?`Tốc độ học của em (hệ số ${String(o.eff).replace('.',',')}) lấy từ các buổi đã làm. `:'Tốc độ học đang tạm tính ở mức trung bình; sau 7 buổi trang sẽ dùng số đo của em. '}Đây là ước tính để định hướng, không phải cam kết.</p></div>
    ${firstBox}
    <h3 class="sec">Các giai đoạn em sẽ học</h3>
    <div class="card ph done0"><div class="ph-s"><span class="ph-n">GĐ0</span><span class="ph-t"><b>Chẩn đoán 14 ngày</b> · em đang ở đây (${nd}/14 buổi)<br><span class="small muted">Đo trình độ, khả năng nhớ, thời gian học và dạng bài em thích. Hết 14 ngày cô gửi hồ sơ và lộ trình đề xuất cho bố mẹ.</span></span></div></div>
    ${R.phases.map((p,i)=>phaseCard(p,i,R,o,i===0)).join('')||'<div class="card"><p>Em đã đạt mức cần cho trường này, nên không cần giai đoạn nâng trình độ. Em có thể chọn trường cao hơn, hoặc vào luyện đề sớm.</p></div>'}
    <div class="card ph chot"><div class="ph-s"><span class="ph-n">Chốt<br>trường</span><span class="ph-t"><b>Mốc chốt trường</b> · ${R.g4.toLocaleDateString('vi-VN')}, sớm hơn kỳ thi khoảng ${CHOT_MONTHS} tháng${(()=>{const t=tetDate(R.g4.getFullYear());return t?`, trước Tết (${t.toLocaleDateString('vi-VN')}) ít nhất một tuần`:''})()}<br><span class="small muted">Em làm bài thi thử trọn bộ đề Sở và đề Chuyên Ngoại ngữ ở CES. Cô và bố mẹ dùng điểm thi thử, điểm Toán, Văn (tab Chọn trường) để chốt trường và nguyện vọng. Từ đây đích không đổi nữa.</span></span></div></div>
    <details class="card ph" style="--pc:#FFD23F"><summary><span class="ph-n">GĐ4</span><span class="ph-t"><b>Luyện đề</b> · ${fmtD(R.g4>R.start?R.g4:R.start)} – ${fmtD(R.exam)}<br><span class="small muted">khoảng ${R.g4Ch} chặng, chung cho mọi học sinh, dù đang ở mức nào</span></span></summary>
     <div class="ph-b"><p>Không học chủ điểm mới. Mỗi tuần nhẹ hơn các giai đoạn trước để em còn sức cho thi học kỳ và Toán, Văn; toàn bộ thời gian tiếng Anh dành cho làm đề, chữa đề và giữ phong độ.</p><ul>${EXAM_PHASE.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>${esc(EXAM_PHASE.speed)}</p><p>${esc(EXAM_PHASE.how)}</p></div></details>
    <details class="card"><summary>Trang tính thế nào</summary><div class="small">
     <p>Giờ học chuẩn theo khung Cambridge: A2 khoảng 190 giờ, B1 375, B2 550, C1 750. Mức cần của mỗi trường lấy từ điểm Anh chuyên cần để có khoảng 80% khả năng đỗ khi Toán 8, Văn 8, đổi ra giờ học bằng cùng thang với tab Chọn trường.</p>
     <p>Mỗi giờ tự học tính bằng 0,6 giờ học chuẩn (nhân hệ số tốc độ của em), mỗi giờ học trên lớp ở CES tính bằng 0,8 giờ; trừ 15% thời gian cho nghỉ lễ, thi học kỳ, ốm.</p>
     <p>Kết luận xanh khi em đạt mức cần trước mốc chốt trường (sớm hơn kỳ thi ${CHOT_MONTHS} tháng), vàng khi chỉ kịp trước ngày thi (tức là trông vào bứt phá năm cuối cấp), đỏ khi đến ngày thi vẫn chưa tới mức cần. Ngưỡng phút tự học mỗi buổi: lớp 6–7 vừa sức đến 40 phút, nặng đến 60; lớp 8–9 vừa sức đến 60, nặng đến 90.</p>
     <p>Học sinh vào ở giai đoạn nào thì bắt đầu từ giai đoạn đó, không học lại giai đoạn trước. Em dưới A2 học Giai đoạn 1 từ các chủ điểm mốc A2.</p></div></details>`;
  };
  draw();
  $('#cGrade').onchange=e=>{setGrade(+e.target.value);save();draw()};
  $('#cLv').onchange=e=>{S.course.lv=e.target.value||null;save();draw()};
  $('#cGoal').onchange=e=>{S.course.goal=e.target.value;save();draw()};
  $('#cCls').onchange=e=>{S.plan.cls=+e.target.value;save();draw()};
  $('#cMin').oninput=e=>{S.plan.min=+e.target.value;$('#cMinO').textContent=S.plan.min;save();draw()};
  $('#cDpw').oninput=e=>{S.plan.dpw=+e.target.value;$('#cDpwO').textContent=S.plan.dpw;save();draw()};
}
