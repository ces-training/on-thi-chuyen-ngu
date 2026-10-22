/* ----- Sau 14 ngày: toàn bộ chương trình Chuyên Anh lớp 6–9 ở CES, cá nhân hoá theo dữ liệu của từng cậu -----
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
  blurb:'Xây móng: các thì, câu điều kiện, bị động, câu tường thuật, đoạn văn ngắn. Đích là B1.',
  gram:['A2','B1'],
  vocab:'khoảng 2.600 từ, 120 cụm động từ, 150 collocation, 30 thành ngữ, 50 cặp từ hay nhầm',
  tasks:['Hoàn thành câu: phân biệt hai thì, collocation cơ bản','Cấu tạo từ trong câu đơn, đổi 1–2 lần (-tion, -ment, -ness, -able, -ive, -ous; dis-, im-, in-)','Điền từ có gợi ý, đoạn 150–200 từ; điền từ tự do: mạo từ, giới từ, đại từ','Đọc hiểu 300–450 từ, đoán nghĩa từ; nối tiêu đề với đoạn','Nghe 2–3 phút, tốc độ thường','Viết lại câu: bị động, tường thuật, điều kiện loại 1–2, wish','Hội thoại: đề nghị, từ chối lịch sự; phát âm, trọng âm từ 2–3 âm tiết'],
  writing:'Đoạn văn nêu ý kiến: câu chủ đề, 2–3 lý do, câu kết. 100–150 từ trong 20 phút (bắt đầu từ đoạn 50–70 từ nếu cậu đang dưới A2).',
  how:'Video ngữ pháp cho mỗi chủ điểm mới (nhóm dưới A2 có thêm video giảng tiếng Việt). Game thẻ nhớ, Săn từ 60 giây, Xưởng ghép từ, Ba rổ âm. In: tập bài của chặng, sổ lỗi sai, sổ từ theo họ từ, bảng tra cứu động từ bất quy tắc.'},
 {k:2,name:'Bắc cầu',band:'B1 → B2',from:375,to:550,gate:'B2',c:'#FFE27A',
  blurb:'Lên đời: đảo ngữ, câu chẻ, viết lại câu kiểu đề chuyên, bài luận 4–5 đoạn. Đích là B2.',
  gram:['B2'],
  vocab:'khoảng 3.800 từ, 250 cụm động từ, 400 collocation, 120 thành ngữ, 100 cặp từ hay nhầm',
  tasks:['Hoàn thành câu: cụm động từ, thành ngữ, phương án gần nghĩa','Cấu tạo từ trong đoạn văn 150–200 từ, đổi 2 lần (care → careless → carelessness)','Điền từ đoạn 200–250 từ; điền từ tự do thêm từ nối, trợ động từ, đại từ quan hệ','Đọc hiểu 500–750 từ: suy luận, từ thay thế; nối thông tin với đoạn, tóm tắt dùng từ trong bài','Nghe 3–4 phút, hai người nói, có bẫy','Viết lại câu: đảo ngữ, câu chẻ, điều kiện loại 3, rút gọn mệnh đề','Đồng nghĩa, trái nghĩa bằng cụm động từ, collocation; trọng âm từ 3–4 âm tiết'],
  writing:'Bài luận 4–5 đoạn (đồng ý/không đồng ý, ưu–nhược, vấn đề–giải pháp), 200–250 từ trong 40 phút. Mỗi bài chấm hai vòng: máy chấm và gợi ý sửa, cậu viết lại, cô chấm bản viết lại.',
  how:'Video cách làm từng dạng bài (Cambridge B2 First) và cách viết bài luận. Game Nối cặp tính giờ, Xếp gạch cho viết lại câu (chỉ lần đầu gặp cấu trúc). In: giấy viết luận có ô đếm từ, bài kiểm tra cuối chặng có phiếu trả lời.'},
 {k:3,name:'Chuyên sâu',band:'B2 → đích',from:550,to:9999,gate:'đích',c:'#BFE6EE',
  blurb:'Về đích: thành ngữ, cấu tạo từ khó, bài đọc dài, luận có phản biện. Đích là mức của trường cậu chọn.',
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
const CLS_OPTS=[[0,'Tự học ở nhà với web'],[1.5,'Thêm lớp CES 1,5 giờ/tuần'],[3,'Thêm lớp CES 3 giờ/tuần'],[4.5,'Thêm lớp CES 4,5 giờ/tuần']];
const fmtD=d=>String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
const WK=7*864e5;
function packCap(grade){return grade<=7?50:70}
/* Độ "nặng" của số phút tự học mỗi buổi. Chỉ để gợi ý cách chia buổi, không phán xét cậu.
   Ngưỡng theo lớp (tài liệu Lộ trình cá nhân hoá): lớp 6–7 nhẹ đến 40 phút, vừa đến 60; lớp 8–9 nhẹ đến 60, vừa đến 90. */
function loadTag(min,grade){const lo=grade<=7?40:60,hi=grade<=7?60:90;
  if(!isFinite(min))return {c:'',t:'cần thêm giờ trên lớp'};
  return min<=lo?{c:'good',t:'nhẹ nhàng'}:min<=hi?{c:'hi',t:'hơi nhiều'}:{c:'',t:'nên chia 2 hiệp'}}
const pctTxt=x=>x==null?'—':Math.round(x*100)+'%';

/* Hồ sơ học của từng cậu, lấy từ dữ liệu thật trên trang.
   stage: none (chưa biết trình độ) · draft (có đầu vào, dưới 3 buổi) · live (từ 3 buổi trở lên)
   pace:  fast (đúng nhiều, nhớ lâu) · steady · careful (sai hoặc quên nhiều)
   habit: regular · patchy · unknown */
function learnerProfile(o){
  const A=agg();const nWeb=Object.values(S.days).filter(r=>r&&r.web).length;
  const acc=pct(A.web),ret=A.retry&&A.retry[1]>=3?pct(A.retry):null,reg=A.span?A.studyDays/Math.max(1,A.span):null;
  const stage=!o.lv?'none':nWeb<3?'draft':'live';
  let pace='steady',habit='unknown';
  if(stage==='live'){
    if(acc>=0.8&&(ret==null||ret>=0.7))pace='fast';
    else if(acc<0.6||(ret!=null&&ret<0.5))pace='careful';
    const RH=rhythm(A);if(RH.state!=='new')habit=RH.state; // 1 buổi mỗi 1–2 ngày vẫn là đều (đã hứa với phụ huynh: khoảng 3 tuần xong 14 buổi)
  }
  const rs=Object.keys(S.days).map(Number).sort((a,b)=>a-b).map(d=>S.days[d]).filter(r=>r&&r.web&&r.web.total);
  let trend=null;if(rs.length>=5){const f=x=>x.reduce((s,r)=>s+r.web.correct,0)/x.reduce((s,r)=>s+r.web.total,0);trend=f(rs.slice(-3))-f(rs.slice(0,-3))}
  /* tỉ lệ câu trong mỗi bài kiểm tra: mốc đang học / ôn mốc dưới / thử thách mốc trên */
  const mix=pace==='fast'?[55,25,20]:pace==='careful'?[50,40,10]:[60,30,10];
  const extraCh=pace==='careful'?1:0; // thêm 1 chặng củng cố mỗi giai đoạn
  return {stage,pace,habit,acc,ret,reg,trend,mix,extraCh,nWeb,A};
}

function courseCalc(o){
  const now=Date.now();
  const left14=DAYS.filter(d=>dayStatus(d.day)!=='done').length;
  const start=new Date(now+left14/(o.dpw*STUDY_FACTOR)*WK);
  const exam=examDateFor(o.grade);const g4=chotDate(o.grade); // mốc chốt trường: hết hạn nâng trình độ, từ đây chỉ luyện đề
  const gain=(o.min*o.dpw/60*CONV*o.eff+o.cls*classF())*STUDY_FACTOR; // giờ học chuẩn mỗi tuần lịch
  const chW=14/(o.dpw*STUDY_FACTOR); // số tuần lịch cho một chặng 14 buổi
  const perCh=gain*chW,xc=o.extraCh||0;
  const phases=[];let t=start.getTime(),h=o.entryH;
  for(const P of PHASES){const a=Math.max(P.from,h),b=Math.min(P.to,o.targetH);if(b<=a)continue;
    const need=b-a,w=gain>0?need/gain+xc*chW:Infinity,nCh=gain>0?Math.max(1,Math.ceil(need/perCh))+xc:Infinity;
    phases.push({P,need,nCh,s:new Date(t),e:new Date(t+w*WK),fromH:a,toH:b});t+=w*WK;h=b}
  const end=new Date(t);
  const wTo=d=>Math.max(0,(d-start)/WK);
  const reqMin=d=>{const w=(wTo(d)-xc*chW*phases.length)*STUDY_FACTOR;if(w<=0)return Infinity;const hpw=(o.targetH-o.entryH)/w-o.cls*classF();return Math.max(0,hpw/(CONV*o.eff)*60/o.dpw)};
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
  const entryH=lv?(ENTRY_H[lv]!=null?ENTRY_H[lv]:(LEVELS.find(l=>l.k===lv)||{h:220}).h):null;
  const o={grade:gradeNow(),entryH,lv,tested,targetH:goalH(S.course.goal),goal:GOALS.find(g=>g.k===S.course.goal)||GOALS[1],min:S.plan.min,dpw:S.plan.dpw,cls:S.plan.cls,eff:eff.f,effFrom:eff.from};
  o.prof=learnerProfile(o);o.extraCh=o.prof.extraCh;return o;
}
/* chủ điểm ngữ pháp của một giai đoạn, rải đều vào các chặng (chặng củng cố của nhóm "chậm mà chắc" để trống) */
function gramPlan(ph,entryH,xc){
  let marks=ph.P.gram.slice();if(ph.P.k===1&&entryH>=190)marks=['B1'];
  const list=GRAM.map((g,i)=>({n:i+1,m:g[0],t:g[1],d14:g[2]})).filter(g=>marks.includes(g.m));
  const nCh=Math.min(ph.nCh,999),nNew=Math.max(1,nCh-(xc||0)),rows={};
  list.forEach((g,i)=>{const c=Math.floor(i*nNew/list.length)+1;(rows[c]=rows[c]||[]).push(g)});
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
    <div class="tl-lab">Lên level</div><div class="tl-row">${row1}</div>
    <div class="tl-lab">Luyện đề</div><div class="tl-row">${row2}</div>
    <div class="tl-lab"></div><div class="tl-axis">${ticks}</div></div>`;
}
/* lời chỉnh lộ trình theo hồ sơ, dùng ở thẻ hồ sơ và ở từng giai đoạn */
const PACE_TXT={
  fast:'Cậu đang leo rank khá nhanh: đúng nhiều, nhớ lâu. Vì vậy lộ trình thêm câu thử thách (20% mỗi bài kiểm tra) và mở <b>cửa ra sớm</b>: thấy chắc tay thì làm bài kiểm tra cửa luôn, khỏi chờ hết giai đoạn.',
  steady:'Nhịp của cậu đang ổn định. Lộ trình giữ công thức chuẩn: 60% bài mới, 30% ôn lại, 10% thử thách nhỏ để não không "ngủ đông".',
  careful:'Có vài phần còn hơi "trơn tay". Không sao cả, tụi mình đi chậm mà chắc: mỗi giai đoạn có thêm <b>1 chặng củng cố</b>, bài mới ít hơn, ôn nhiều hơn (50% mới, 40% ôn). Câu sai sẽ quay lại cho tới khi cậu thuộc hẳn.'};
const PACE_SHORT={fast:'Có cửa ra sớm và 20% câu thử thách cho cậu.',steady:'Công thức chuẩn: 60% mới, 30% ôn, 10% thử thách.',careful:'Thêm 1 chặng củng cố ở cuối giai đoạn; 50% mới, 40% ôn.'};
function profileCard(o){
  const P=o.prof;
  if(P.stage==='draft')return `<div class="card prof"><p class="eyebrow">Lộ trình đang chỉnh theo cậu</p><h3>Bản phác đầu tiên</h3><p>Bản đồ này mới dựa trên bài đầu vào. Làm thêm ${3-P.nWeb} buổi nữa là tớ bắt đầu hiểu cách cậu học: đúng bao nhiêu, nhớ lâu cỡ nào, học có đều không. Rồi lộ trình tự chỉnh cho vừa với cậu.</p></div>`;
  const chips=`<div class="pchips"><span><b>${pctTxt(P.acc)}</b> câu đúng trên web</span>${P.ret!=null?`<span><b>${pctTxt(P.ret)}</b> câu từng sai làm lại đúng</span>`:''}<span><b>${rhythm(P.A).sessions}</b> buổi · ${esc(rhythm(P.A).gapTxt||'mới bắt đầu')}</span>${P.trend!=null&&Math.abs(P.trend)>=0.03?`<span><b>${P.trend>=0?'+':''}${Math.round(P.trend*100)}%</b> 3 buổi gần nhất</span>`:''}</div>`;
  let extra='';
  if(P.trend!=null&&P.trend>=0.08)extra+='<p>3 buổi gần đây cậu đúng nhiều hơn hẳn trước đó. Đúng kiểu "lên tay" rồi đấy!</p>';
  if(P.trend!=null&&P.trend<=-0.08)extra+='<p>3 buổi gần đây khó hơn một chút. Bình thường thôi, bài cũng đang khó dần. Thử đọc lại phần giải thích ở các câu sai trước buổi sau nhé.</p>';
  if(P.habit==='regular')extra+=`<p>Nhịp học đều: ${esc(rhythm(P.A).gapTxt)}. Giữ lửa nha!</p>`;
  if(P.habit==='patchy')extra+=`<p>Nhịp hiện tại: ${esc(rhythm(P.A).gapTxt)}${rhythm(P.A).maxGap>RH_BREAK?`, có lần nghỉ ${rhythm(P.A).maxGap} ngày`:''}. Mẹo tớ hay dùng: chọn vài khung giờ cố định trong tuần, 1 buổi mỗi 1–2 ngày là vừa đẹp; buổi ngắn mà đều sẽ "ăn" hơn buổi dài mà ngắt quãng.</p>`;
  return `<div class="card prof"><p class="eyebrow">Lộ trình đang chỉnh theo cậu</p><h3>${P.pace==='fast'?'Tuyến nhanh':P.pace==='careful'?'Tuyến chậm mà chắc':'Tuyến giữ nhịp'}</h3>${chips}<div class="hung-say">${hungFig('sm')}<div><p>${PACE_TXT[P.pace]}</p>${extra}</div></div><p class="small muted">Hồ sơ này cập nhật sau mỗi buổi. Cậu học khác đi thì lộ trình cũng đổi theo.</p></div>`;
}
function phaseCard(ph,i,R,o,first){
  const G=gramPlan(ph,o.entryH,o.extraCh);const late=ph.e>R.g4;
  const rows=G.out.map(r=>r.items?`<tr><td>Chặng ${r.a}</td><td>${r.items.map(g=>`${g.n}. ${esc(g.t)}${g.d14?' <span class="pill d14">đã gặp ở buổi '+g.d14+'</span>':''}`).join('<br>')}</td></tr>`:`<tr><td>Chặng ${r.a}${r.b>r.a?'–'+r.b:''}</td><td class="muted">${o.extraCh&&r.b===ph.nCh?'Chặng củng cố: ôn lại cả giai đoạn, gom câu sai, làm lại bài viết':'Luyện sâu: viết lại câu, ôn xoắn ốc, thêm từ theo 12 cụm chủ đề'}</td></tr>`).join('');
  const toName=ph.toH>=o.targetH?lvName(o.targetH):ph.P.gate;
  const ms=MS().find(m=>m.final?ph.toH>=o.targetH:m.h===ph.toH);
  const msTxt=ms?(()=>{const ok=ph.e<=ms.date;const gap=Math.max(1,Math.round((ph.e-ms.date)/(30.4*864e5)));return `<p class="ms"><span class="pill ${ok?'good':''}">${ok?'đúng mốc':'lệch '+gap+' tháng'}</span> Mốc gợi ý của CES: <b>${esc(ms.target)}</b> trước ${ms.date.toLocaleDateString('vi-VN')} (${esc(ms.label.toLowerCase())}). Dự kiến của cậu: ${fmtD(ph.e)}.${ok?' Đẹp!':ms.final?' Muốn về sớm hơn, xem các cách ở phần "Cậu đang đi thế nào" nhé.':' Lệch mốc giữa đường một chút không sao, miễn kịp mốc chốt trường.'}</p>`})():'';
  return `<details class="card ph" ${first?'open':''} style="--pc:${ph.P.c}">
   <summary><span class="ph-n">GĐ${ph.P.k}</span><span class="ph-t"><b>${esc(ph.P.name)}</b> · ${esc(ph.fromH===o.entryH&&o.lv?(LEVELS.find(l=>l.k===o.lv)||{name:lvName(ph.fromH)}).name:lvName(ph.fromH))} → ${esc(toName)}<br><span class="small muted">${fmtD(ph.s)} – ${fmtD(ph.e)} · khoảng ${isFinite(ph.nCh)?ph.nCh:'?'} chặng</span></span>${late?'<span class="pill">sang mùa luyện đề</span>':''}</summary>
   <div class="ph-b">
    <p>Đích của giai đoạn: <b>${esc(toName)}</b>. Qua bài kiểm tra cửa ra là mở khoá giai đoạn sau. Chưa qua thì có thêm một chặng ôn đúng phần cậu còn lấn cấn.</p>${msTxt}
    ${o.prof.stage==='live'?`<p class="ms"><b>Chỉnh riêng cho cậu:</b> ${PACE_SHORT[o.prof.pace]}</p>`:''}
    <h4>Ngữ pháp mới, rải theo chặng</h4>
    ${G.reviewA2?'<p class="small muted">10 chủ điểm mốc A2 cậu đã có nền, nên không học lại thành bài mới; chúng quay lại trong buổi ôn và bài viết lại câu.</p>':''}
    <div class="tbl-wrap"><table class="gp"><tbody>${rows}</tbody></table></div>
    <h4>Kho từ khi xong giai đoạn</h4><p>${esc(ph.P.vocab)}. Học theo họ từ và theo cụm; mỗi buổi là một trong 12 cụm chủ đề, nên mỗi chặng cậu đi hết một vòng 12 cụm, từ khó dần.</p>
    <h4>Dạng bài thi ở level này</h4><ul>${ph.P.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    <h4>Viết</h4><p>${esc(ph.P.writing)}</p>
    <h4>Học bằng gì</h4><p>${esc(ph.P.how)}</p>
   </div></details>`;
}
function lockedPhase(P){return `<div class="card ph locked" style="--pc:${P.c}"><div class="ph-s"><span class="ph-n">GĐ${P.k}</span><span class="ph-t"><b>${esc(P.name)}</b> · ${esc(P.band)}<br><span class="small">${esc(P.blurb)}</span><br><span class="small muted">${doodle('lock','lk',20)} Cậu có đi qua giai đoạn này không, mất bao lâu: mở khoá sau bài đầu vào</span></span></div></div>`}
function chotCard(R){return `<div class="card ph chot"><div class="ph-s"><span class="ph-n">Chốt<br>trường</span><span class="ph-t"><b>Mốc chốt trường</b> · ${R.g4.toLocaleDateString('vi-VN')}${(()=>{const t=tetDate(R.g4.getFullYear());return t?`, trước Tết (${t.toLocaleDateString('vi-VN')}) ít nhất một tuần`:''})()}<br><span class="small muted">Cậu làm bài thi thử trọn bộ đề Sở và đề Chuyên Ngoại ngữ ở CES. Cô, cậu và bố mẹ cùng nhìn điểm thi thử để chọn trường và nguyện vọng. Từ đây đích đã rõ, năm lớp 9 nhẹ đầu hơn hẳn.</span></span></div></div>`}
function examCard(R){return `<details class="card ph" style="--pc:#FFD23F"><summary><span class="ph-n">GĐ4</span><span class="ph-t"><b>Luyện đề</b> · ${fmtD(R.g4>R.start?R.g4:R.start)} – ${fmtD(R.exam)}<br><span class="small muted">khoảng ${R.g4Ch} chặng, ai cũng đi qua, dù đang ở level nào</span></span></summary>
     <div class="ph-b"><p>Không học chủ điểm mới. Lịch nhẹ hơn các giai đoạn trước để cậu còn sức cho thi học kỳ và Toán, Văn; thời gian tiếng Anh dành cho làm đề, chữa đề và giữ phong độ.</p><ul>${EXAM_PHASE.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>${esc(EXAM_PHASE.speed)}</p><p>${esc(EXAM_PHASE.how)}</p></div></details>`}
function howCard(){return `<details class="card"><summary>Trang tính thế nào</summary><div class="small">
     <p>Giờ học chuẩn theo khung Cambridge: A2 khoảng 190 giờ, B1 375, B2 550, C1 750. Mức cần của mỗi trường lấy từ điểm Anh chuyên cần để có khoảng 80% khả năng đỗ khi Toán 8, Văn 8, đổi ra giờ học bằng cùng thang với tab Chọn trường.</p>
     <p>Mỗi giờ tự học tính bằng 0,6 giờ học chuẩn, nhân hệ số tốc độ đo từ chính các buổi cậu đã làm; mỗi giờ học trên lớp ở CES tính bằng 0,8 giờ; trừ 15% thời gian cho nghỉ lễ, thi học kỳ, ốm.</p>
     <p>Hồ sơ học cập nhật sau mỗi buổi: tỉ lệ câu đúng, tỉ lệ câu từng sai làm lại đúng, nhịp học (1 buổi mỗi 1–2 ngày là đều). Đúng nhiều và nhớ lâu thì có thêm câu thử thách và cửa ra sớm; sai hoặc quên nhiều thì có thêm chặng củng cố; học ngắt quãng thì tớ gợi ý buổi ngắn mà đều.</p>
     <p>Mốc chốt trường là 1/2 năm lớp 9, hoặc một tuần trước Tết nếu Tết đến sớm hơn. Cậu vào ở giai đoạn nào thì bắt đầu từ giai đoạn đó, không học lại giai đoạn trước.</p>
     <p>Mọi con số là ước tính để định hướng, không phải cam kết, và sẽ đổi khi cậu học.</p></div></details>`}
function vCourse(){
  const o0=courseInputs();
  const lvOpts=[['',o0.tested?'Theo bài đầu vào ('+LEVELS.find(l=>l.k===o0.tested.level).name+')':'Chưa có, cậu làm bài đầu vào trước nhé']].concat(LEVELS.filter(l=>l.k!=='C1').map(l=>[l.k,l.name]));
  M().innerHTML=`<section class="view course">
  <div><p class="eyebrow">Sau 14 ngày thì sao?</p><h2>Bản đồ chuyên Anh của cậu</h2>
  <p class="lead">14 ngày này là chặng "dò đường". Sau đó cậu đi tiếp qua các giai đoạn bên dưới, mỗi giai đoạn gồm nhiều chặng 14 buổi y như bộ cậu đang học. Bản đồ không đóng khung: cậu học thế nào, nó đổi theo thế ấy.</p></div>
  <div class="card"><h3>Thông tin của cậu</h3>
   <div class="sgrid">
    <label class="fld">Cậu đang học lớp<select id="cGrade">${[6,7,8,9].map(g=>`<option value="${g}" ${o0.grade===g?'selected':''}>Lớp ${g}</option>`).join('')}</select></label>
    <label class="fld">Trường cậu nhắm<select id="cGoal">${GOALS.map(g=>`<option value="${g.k}" ${S.course.goal===g.k?'selected':''}>${esc(g.name)} (cần khoảng ${esc(lvName(goalH(g.k)))})</option>`).join('')}</select></label>
    <label class="fld">Học trên lớp ở CES<select id="cCls">${CLS_OPTS.map(([v,n])=>`<option value="${v}" ${o0.cls===v?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="fld">Trình độ của cậu<select id="cLv">${lvOpts.map(([k,n])=>`<option value="${k}" ${(S.course.lv||'')===k?'selected':''}>${esc(n)}</option>`).join('')}</select><span class="hint">Nên để theo bài đầu vào. Chỉ chọn tay khi cô đã kiểm tra trình độ của cậu.</span></label>
   </div>
   <div class="sim">
    <div class="slider"><label for="cMin">Phút tự học mỗi buổi (giấy + web) <output id="cMinO">${S.plan.min}</output></label><input type="range" id="cMin" min="15" max="120" step="5" value="${S.plan.min}"></div>
    <div class="slider"><label for="cDpw">Số buổi mỗi tuần <output id="cDpwO">${S.plan.dpw}</output></label><input type="range" id="cDpw" min="3" max="7" step="1" value="${S.plan.dpw}"></div>
   </div>
   <p class="small muted">Hai thanh trượt này dùng chung với tab Lộ trình &amp; khả thi. Kéo thử xem bản đồ đổi ra sao.</p>
  </div>
  <div id="cOut"></div>
  </section>`;
  const draw=()=>{
    const o=courseInputs();const P=o.prof;const nd=DAYS.filter(d=>dayStatus(d.day)==='done').length;
    const exam=examDateFor(o.grade),g4=chotDate(o.grade),weeksLeft=Math.round((exam-Date.now())/WK),wChot=Math.max(0,Math.round((g4-Date.now())/WK));
    const clock=`<div class="card"><h3>Đồng hồ của cậu</h3><div class="kpis"><div><b>${weeksLeft}</b><span>tuần đến kỳ thi (${exam.toLocaleDateString('vi-VN')})</span></div><div><b>${wChot}</b><span>tuần đến mốc chốt trường (${fmtD(g4)})</span></div><div><b>${nd}/14</b><span>buổi dò đường đã xong</span></div></div>`;
    if(P.stage==='none'){
      const R0={g4,exam,start:new Date(),g4Ch:Math.max(0,Math.floor((exam-g4)/WK*o.dpw*STUDY_FACTOR/14))};
      $('#cOut').innerHTML=clock+`<p class="small muted">Đồng hồ chỉ phụ thuộc vào lớp cậu đang học. Phần còn lại phụ thuộc vào chính cậu.</p></div>
      <div class="card lockbox">${doodle('lock','lk',56)}<div><p class="eyebrow">Còn khoá</p><h3>Lộ trình của riêng cậu</h3><p>Tớ chưa biết cậu đang ở đâu, nên chưa dám vẽ đường vội. Làm bài đầu vào 45 câu (khoảng 25 phút) để mở khoá: cậu đang ở level nào, chặng tiếp theo học gì, mất bao lâu tới trường cậu nhắm, và vài cách đi nhanh hơn nếu cậu muốn.</p><div class="row"><button class="btn hi" id="cDiag">Làm bài đầu vào</button></div></div></div>
      <h3 class="sec">Các giai đoạn trên bản đồ</h3>
      <div class="card ph done0"><div class="ph-s"><span class="ph-n">GĐ0</span><span class="ph-t"><b>Dò đường 14 ngày</b> · cậu đang ở đây (${nd}/14 buổi)<br><span class="small muted">Tớ đo level, độ nhớ, nhịp học và dạng bài cậu thích. Hết 14 ngày, cô gửi cậu và bố mẹ một lộ trình vừa với cậu.</span></span></div></div>
      ${PHASES.map(lockedPhase).join('')}${chotCard(R0)}${examCard(R0)}${howCard()}`;
      const b=$('#cDiag');if(b)b.onclick=()=>go('diag');return;
    }
    const R=courseCalc(o);
    const nAll=R.phases.reduce((t,p)=>t+(isFinite(p.nCh)?p.nCh:0),0);
    const reqR=Math.ceil(R.req/5)*5,cap=packCap(o.grade),gName=o.goal.name;
    const cur=o.lv?(LEVELS.find(l=>l.k===o.lv)||{name:lvName(o.entryH)}).name:lvName(o.entryH),tgt=lvName(o.targetH);
    const LD=loadTag(reqR,o.grade);
    const headByLoad=LD.t==='nhẹ nhàng'?'Nhích thêm vài phút là về đúng hẹn':LD.t==='hơi nhiều'?'Thêm chút nhịp là kịp':'Đích này cần thêm vài combo nữa';
    const alt=GOALS.filter(g=>g.k!==o.goal.k&&goalH(g.k)<o.targetH&&goalH(g.k)<=R.hChot).sort((a,b)=>goalH(b.k)-goalH(a.k))[0];
    let head,msg,vc;
    if(R.status==='done'){vc='good';head=`Cậu đã chạm mức của ${gName}`;msg=`Ngầu đấy! Từ giờ có hai hướng: nhắm một trường cao hơn cho vui, hoặc giữ phong độ và vào luyện đề sớm.`}
    else if(R.status==='good'){vc='good';head='Đúng đường rồi, cứ thế mà đi!';msg=`Với ${o.min} phút × ${o.dpw} buổi/tuần${o.cls?` và ${String(o.cls).replace('.',',')} giờ trên lớp`:''}, cậu dự kiến chạm mức của ${gName} (${tgt}) khoảng <b>${fmtD(R.end)}</b>, trước mốc chốt trường ${fmtD(R.g4)}. Tức là năm lớp 9 chỉ việc luyện đề, khỏi chạy nước rút.`}
    else if(R.status==='warn'){vc='warn';head=headByLoad;msg=`Theo nhịp hiện tại, cậu chạm mức của ${gName} khoảng ${fmtD(R.end)}, muộn hơn mốc chốt ${fmtD(R.g4)} một chút. Tớ không muốn cậu phải chạy deadline năm lớp 9, nên bên dưới là vài cách về sớm hơn. Chọn cách nào hợp với cậu nhất nhé.`}
    else{vc='warn';head=headByLoad;msg=`Với nhịp hiện tại, tới mốc chốt cậu đã lên khoảng <b>${esc(lvName(R.hChot))}</b> từ ${esc(cur)} bây giờ: một bước tiến lớn rồi. Để chạm ${esc(tgt)} của ${gName}, cậu có thể ghép thêm giờ học trên lớp, nhích số phút mỗi buổi${alt?`, hoặc đặt một trạm dừng gần hơn trước (ví dụ ${alt.name}) rồi nâng đích sau mỗi chặng`:', hoặc đặt từng trạm dừng nhỏ và nâng đích sau mỗi chặng'}. Tốc độ thật của cậu có khi nhanh hơn dự đoán đấy.`}
    const reqTxt=R.status==='done'?'':isFinite(reqR)?(()=>{const L=loadTag(reqR,o.grade);return `Để chạm ${esc(tgt)} ${R.before?'trước mốc chốt trường':'trước ngày thi'}, cậu cần khoảng <b>${reqR} phút tự học mỗi buổi</b>, ${o.dpw} buổi/tuần${o.cls?', cộng giờ trên lớp':''}. ${L.t==='nhẹ nhàng'?'Nhẹ nhàng thôi.':L.t==='hơi nhiều'?'Hơi nhiều một chút, giữ lịch cố định là được.':`Con số này khá lớn cho một buổi, nên ${reqR>cap?'ghép thêm giờ trên lớp':'chia thành hai hiệp, nghỉ giữa 10 phút'} sẽ dễ thở hơn.`}`})():`Để chạm ${esc(tgt)} kịp mốc, phần tự học sẽ cần một "trợ thủ": giờ học trên lớp ở CES.`;
    const opts=CLS_OPTS.map(([c,n])=>{const r=courseCalc(Object.assign({},o,{cls:c}));const m=Math.ceil(r.req/5)*5;const L=loadTag(m,o.grade);return `<tr${c===o.cls?' class="cur"':''}><td>${esc(n)}</td><td>${r.status==='done'?'—':isFinite(m)?m+' phút':'—'}<br><span class="pill ${r.status==='done'?'good':L.c}">${r.status==='done'?'đã chạm mức':L.t}</span></td><td>${esc(lvName(r.hChot))}</td></tr>`}).join('');
    const first=R.phases[0];
    const firstBox=first?`<div class="card first"><p class="eyebrow">Chặng tiếp theo của cậu</p><h3>GĐ${first.P.k} · ${esc(first.P.name)}, bắt đầu khoảng ${R.start.toLocaleDateString('vi-VN')}</h3>
      <p>${(()=>{const g=gramPlan(first,o.entryH,o.extraCh).out.find(r=>r.items);return g?'Ngữ pháp mở màn: '+g.items.map(x=>esc(x.t)).join('; ')+'.':''})()} Mười hai buổi học là 12 cụm chủ đề: ${CLUSTERS.map(esc).join(', ')}. Buổi 7 là trạm ôn, buổi 14 là "trùm cuối" của chặng.</p>
      <p class="small muted">Một chặng mất khoảng ${(Math.round(R.chW*2)/2).toLocaleString('vi-VN')} tuần với ${o.dpw} buổi/tuần (đã trừ ngày nghỉ, thi học kỳ).</p></div>`:'';
    $('#cOut').innerHTML=clock.replace('</div></div>','<div><b>'+nAll+'+'+R.g4Ch+'</b><span>chặng lên level + chặng luyện đề</span></div></div>')+`
     ${timelineHTML(R,o)}
     <p class="small muted">Dòng trên: các giai đoạn lên level theo tốc độ dự kiến của cậu. Dòng dưới: mùa luyện đề, từ mốc chốt trường đến ngày thi. Ngày tháng được tính lại sau mỗi chặng.</p></div>
    <div class="verdict ${vc}"><p class="eyebrow">Cậu đang đi thế nào</p><h3>${esc(head)}</h3><p>${msg}</p>${reqTxt?`<p>${reqTxt}</p>`:''}
     ${R.status!=='done'?`<h4>Các cách đi tới đích</h4><div class="tbl-wrap"><table class="copt"><thead><tr><th>Cách học</th><th>Phút tự học mỗi buổi</th><th>Cậu ở đâu vào mốc chốt (với số phút đang chọn)</th></tr></thead><tbody>${opts}</tbody></table></div>`:''}
     ${o.grade===9?'<p class="small"><b>Lớp 9 rồi?</b> Tụi mình chơi chiến thuật khác: chốt trường theo điểm thi thử gần nhất, rồi dồn sức vào luyện đề. Phần ngữ pháp, từ vựng còn thiếu học xen trong các buổi chữa đề.</p>':''}
     ${P.stage==='draft'?'<p class="small">Đây là bản phác dựa trên bài đầu vào. Sau vài buổi, tốc độ thật của cậu sẽ thay vào và bản đồ chỉnh lại.</p>':''}</div>
    ${profileCard(o)}
    ${firstBox}
    <h3 class="sec">Các giai đoạn trên bản đồ của cậu</h3>
    <div class="card ph done0"><div class="ph-s"><span class="ph-n">GĐ0</span><span class="ph-t"><b>Dò đường 14 ngày</b> · cậu đang ở đây (${nd}/14 buổi)<br><span class="small muted">Tớ đo level, độ nhớ, nhịp học và dạng bài cậu thích. Hết 14 ngày, cô gửi cậu và bố mẹ một lộ trình vừa với cậu.</span></span></div></div>
    ${R.phases.map((p,i)=>phaseCard(p,i,R,o,i===0)).join('')||`<div class="card"><p>Cậu đã ở mức của ${gName}, nên không cần giai đoạn lên level nào nữa. Chọn trường cao hơn, hoặc vào luyện đề sớm đều được.</p></div>`}
    ${chotCard(R)}${examCard(R)}${howCard()}`;
  };
  draw();
  $('#cGrade').onchange=e=>{setGrade(+e.target.value);save();draw()};
  $('#cLv').onchange=e=>{S.course.lv=e.target.value||null;save();draw()};
  $('#cGoal').onchange=e=>{S.course.goal=e.target.value;save();draw()};
  $('#cCls').onchange=e=>{S.plan.cls=+e.target.value;save();draw()};
  $('#cMin').oninput=e=>{S.plan.min=+e.target.value;$('#cMinO').textContent=S.plan.min;save();draw()};
  $('#cDpw').oninput=e=>{S.plan.dpw=+e.target.value;$('#cDpwO').textContent=S.plan.dpw;save();draw()};
}
