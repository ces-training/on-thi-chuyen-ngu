/* ===== Game kiểu Wordwall: nối cặp, lật thẻ, xếp chữ, đố nhanh, phân nhóm, xếp câu, đúng hay sai =====
   Mỗi game: renderGame(box, spec, onDone). spec = {type, key, title, how, items, ...}. onDone({score,total,ms}).
   Chơi bằng chạm/bấm (không kéo thả) để chạy tốt trên điện thoại. */
const G_SHUF=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const G_ICON={match:'handshake',flip:'sparkles',anagram:'memo',quiz:'bullseye',sort:'books',unjumble:'writing-hand',truefalse:'check-mark-button'};
const G_NAME={match:'Nối cặp',flip:'Lật thẻ',anagram:'Xếp chữ',quiz:'Đố nhanh',sort:'Phân nhóm',unjumble:'Xếp câu',truefalse:'Đúng hay sai'};
let G_AC=null;let G_MUTE=false;try{G_MUTE=localStorage.getItem('ca14_mute')==='1'}catch(e){}
function gBeep(ok){if(G_MUTE)return;try{G_AC=G_AC||new (window.AudioContext||window.webkitAudioContext)();const o=G_AC.createOscillator(),g=G_AC.createGain();o.type='triangle';const t=G_AC.currentTime;
  if(ok){o.frequency.setValueAtTime(660,t);o.frequency.setValueAtTime(990,t+.08)}else{o.frequency.setValueAtTime(220,t);o.frequency.setValueAtTime(160,t+.1)}
  g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(G_AC.destination);o.start(t);o.stop(t+.26)}catch(e){}}
function gStars(score,total){const p=total?score/total:0;return p>=.9?3:p>=.6?2:p>0?1:0}
function gStarHTML(n){return '<span class="g-stars" aria-label="'+n+' sao">'+[1,2,3].map(i=>`<b class="${i<=n?'on':''}">★</b>`).join('')+'</span>'}

function renderGame(box,spec,onDone){
  const t0=Date.now();let score=0,total=0;
  box.innerHTML=`<div class="g-head"><span class="g-name">${esc(G_NAME[spec.type]||'Game')}</span><span class="g-meta"><span class="g-score">0</span> điểm · <span class="g-time">0:00</span></span><button class="g-mute" type="button" aria-label="Bật/tắt âm thanh">${G_MUTE?'🔇':'🔊'}</button></div>
  <p class="g-how small muted">${esc(spec.how||'')}</p><div class="g-stage"></div>`;
  const stage=box.querySelector('.g-stage'),scEl=box.querySelector('.g-score'),tmEl=box.querySelector('.g-time');
  box.querySelector('.g-mute').onclick=e=>{G_MUTE=!G_MUTE;try{localStorage.setItem('ca14_mute',G_MUTE?'1':'0')}catch(_){}e.target.textContent=G_MUTE?'🔇':'🔊'};
  const timer=setInterval(()=>{if(!box.isConnected){clearInterval(timer);return}const s=Math.floor((Date.now()-t0)/1000);tmEl.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},1000);
  const add=(d)=>{score+=d;scEl.textContent=score};
  const finish=(sc,tot,extra)=>{clearInterval(timer);const ms=Date.now()-t0;const st=gStars(sc,tot);
    stage.innerHTML=`<div class="g-end">${st>=2?em('party-popper','',72):em('flexed-biceps','',72)}<h3>${st===3?'Xuất sắc!':st===2?'Tốt lắm!':'Cố thêm chút nữa nhé!'}</h3>${gStarHTML(st)}<p>Em đúng <b>${sc}/${tot}</b> · ${Math.round(ms/1000)} giây${extra?' · '+extra:''}</p><div class="row" style="justify-content:center"><button class="btn hi g-again" type="button">Chơi lại</button></div></div>`;
    const rv=gReview(spec);if(rv)stage.querySelector('.g-end').insertAdjacentHTML('beforeend',`<details class="g-review"><summary>Xem lại đáp án và giải thích</summary>${rv}</details>`);
    stage.querySelector('.g-again').onclick=()=>renderGame(box,spec,onDone);
    onDone&&onDone({score:sc,total:tot,ms,stars:st})};
  const api={stage,add,finish,setTotal:n=>{total=n}};
  (G_PLAY[spec.type]||G_PLAY.quiz)(spec,api);
}

/* Bảng xem lại cuối game: đáp án + giải thích ngắn */
function gReview(spec){const li=a=>'<ul class="g-rv">'+a.join('')+'</ul>';const t=spec.type;
  if(t==='sort'&&spec.groups)return li(spec.groups.map(g=>`<li><b>${esc(g.name)}</b>: ${g.items.map(esc).join(' · ')}${g.rule_vi?'<br>'+fmtVi(g.rule_vi):''}</li>`));
  if(t==='unjumble')return li(spec.items.map(u=>`<li><b>${esc(u.sentence)}</b>${u.why?'<br>'+fmtVi(u.why):''}</li>`));
  if(t==='truefalse')return li(spec.items.map(x=>`<li>${esc(x.s)} → ${x.ok?'<b>Đúng</b>':'<b>Sai</b>, sửa: <b>'+esc(x.fix)+'</b>'}${x.why?'<br>'+fmtVi(x.why):''}</li>`));
  if(t==='quiz')return li(spec.items.map(q=>`<li>${esc(q.q)} → <b>${esc(q.options[q.answer])}</b>${q.explain?' · '+fmtVi(q.explain):''}</li>`));
  if(t==='openbox'||t==='wheel'||t==='motion'){const tf=(spec.pool||[]).filter(x=>x.kind==='tf');const out=tf.map(x=>`<li>${esc(x.s)} → ${x.ok?'<b>Đúng</b>':'<b>Sai</b>, sửa: <b>'+esc(x.fix)+'</b>'}${x.why?'<br>'+fmtVi(x.why):''}</li>`);
    if(t==='motion')return li(spec.items.map(q=>`<li>${esc(q.q)} → <b>${esc(q.ans==='L'?q.L:q.R)}</b>${q.why?' · '+fmtVi(q.why):''}</li>`));
    (spec.items||[]).forEach(v=>{if(v.w)out.push(`<li><b>${esc(v.w)}</b> = ${esc(v.m)}${v.ex?' · <i>'+esc(v.ex)+'</i>':''}</li>`)});return out.length?li(out):''}
  if(spec.items&&spec.items[0]&&spec.items[0].w)return li(spec.items.map(v=>`<li><b>${esc(v.w)}</b> = ${esc(v.m)}${v.ex?' · <i>'+esc(v.ex)+'</i>':''}</li>`));
  if(spec.items&&spec.items[0]&&spec.items[0].a)return li(spec.items.map(v=>`<li><b>${esc(v.a)}</b> = ${esc(v.b)}</li>`));
  return ''}
const G_PLAY={
  /* Nối cặp: chạm một ô bên trái rồi chạm nghĩa đúng bên phải */
  match(spec,A){
    const pairs=G_SHUF(spec.items).slice(0,(spec.cfg||{}).pairs||6);let sel=null,done=0,sc=0;const missed=new Set();const total=pairs.length;
    const L=pairs.map((p,i)=>({i,t:p.a})),R=G_SHUF(pairs.map((p,i)=>({i,t:p.b})));
    A.stage.innerHTML=`<div class="g-match"><div class="g-col">${L.map(x=>`<button type="button" class="g-tile" data-side="L" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div><div class="g-col">${R.map(x=>`<button type="button" class="g-tile alt" data-side="R" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div>`;
    A.stage.onclick=e=>{const b=e.target.closest('.g-tile');if(!b||b.disabled)return;
      if(!sel||sel.dataset.side===b.dataset.side){if(sel)sel.classList.remove('sel');sel=b;b.classList.add('sel');return}
      if(sel.dataset.i===b.dataset.i){[sel,b].forEach(x=>{x.classList.remove('sel');x.classList.add('ok');x.disabled=true});gBeep(true);
        if(!missed.has(b.dataset.i)){sc++;A.add(1)}done++;sel=null;if(done===total)setTimeout(()=>A.finish(sc,total),500)}
      else{missed.add(sel.dataset.i);missed.add(b.dataset.i);gBeep(false);const pr=[sel,b];pr.forEach(x=>x.classList.add('bad'));setTimeout(()=>pr.forEach(x=>x.classList.remove('bad','sel')),450);sel=null}};
  },
  /* Lật thẻ: tìm các cặp từ – nghĩa */
  flip(spec,A){
    const pairs=G_SHUF(spec.items).slice(0,(spec.cfg||{}).pairs||6);const cards=G_SHUF(pairs.flatMap((p,i)=>[{i,t:p.a,k:'a'},{i,t:p.b,k:'b'}]));
    let open=[],moves=0,found=0,lock=false;
    A.stage.innerHTML=`<div class="g-flip">${cards.map((c,j)=>`<button type="button" class="g-card" data-j="${j}" aria-label="Thẻ ${j+1}"><span class="f">?</span><span class="b ${c.k}">${esc(c.t)}</span></button>`).join('')}</div><p class="small muted g-moves">Số lượt lật: 0</p>`;
    A.stage.onclick=e=>{const b=e.target.closest('.g-card');if(!b||lock||b.classList.contains('up'))return;b.classList.add('up');open.push(b);
      if(open.length<2)return;moves++;A.stage.querySelector('.g-moves').textContent='Số lượt lật: '+moves;
      const [x,y]=open.map(o=>cards[+o.dataset.j]);
      if(x.i===y.i&&x.k!==y.k){open.forEach(o=>o.classList.add('ok'));gBeep(true);A.add(1);found++;open=[];if(found===pairs.length){const sc=Math.max(0,Math.min(pairs.length,Math.round(pairs.length*(pairs.length+2)/moves)));setTimeout(()=>A.finish(sc,pairs.length,moves+' lượt lật'),600)}}
      else{lock=true;gBeep(false);setTimeout(()=>{open.forEach(o=>o.classList.remove('up'));open=[];lock=false},800)}};
  },
  /* Xếp chữ: chạm các chữ cái theo đúng thứ tự để ghép từ */
  anagram(spec,A){
    const qs=G_SHUF(spec.items).slice(0,(spec.cfg||{}).n||5);let k=0,sc=0;
    const next=()=>{if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k];const word=q.a;let letters=G_SHUF(word.split('').map((c,i)=>({c,i})));
      if(letters.map(x=>x.c).join('')===word&&word.length>2)letters=letters.reverse();
      let built=[],miss=0,hint=0;if((spec.cfg||{}).firstLetter){const x=letters.find(y=>y.c===word[0]);if(x)built.push(x)}
      const draw=()=>{A.stage.innerHTML=`<div class="g-ana"><p class="g-prog">Từ ${k+1}/${qs.length}</p><p class="g-clue">${esc(q.b)}</p>${q.c?`<p class="small muted">${esc(q.c)}</p>`:''}
        <div class="g-slots">${word.split('').map((c,i)=>`<span class="g-slot ${built[i]?'full':''}">${built[i]?esc(built[i].c):''}</span>`).join('')}</div>
        <div class="g-letters">${letters.map((x,j)=>`<button type="button" class="g-let" data-j="${j}" ${built.includes(x)?'disabled':''}>${esc(x.c)}</button>`).join('')}</div>
        <div class="row" style="justify-content:center"><button type="button" class="btn ghost g-undo">Xoá chữ cuối</button><button type="button" class="btn ghost g-hint">Gợi ý (−½ điểm)</button></div></div>`};
      draw();
      A.stage.onclick=e=>{const l=e.target.closest('.g-let');
        if(e.target.closest('.g-undo')){built.pop();draw();return}
        if(e.target.closest('.g-hint')){const need=word[built.length];const x=letters.find(y=>y.c===need&&!built.includes(y));if(x){built.push(x);hint++;draw();check()}return}
        if(!l)return;built.push(letters[+l.dataset.j]);draw();check()};
      const check=()=>{if(built.length<word.length)return;const got=built.map(x=>x.c).join('');
        if(got===word){gBeep(true);const p=hint?0.5:1;sc+=p;A.add(p);A.stage.querySelector('.g-slots').classList.add('ok');k++;setTimeout(next,700)}
        else{gBeep(false);miss++;A.stage.querySelector('.g-slots').classList.add('bad');setTimeout(()=>{built=[];draw()},600)}}};
    next();
  },
  /* Đố nhanh: 4 lựa chọn, 15 giây mỗi câu, đúng liên tiếp được thưởng */
  quiz(spec,A){
    const QT=(spec.cfg||{}).qtime||15;const qs=G_SHUF(spec.items).slice(0,(spec.cfg||{}).n||8);let k=0,sc=0,streak=0,tm=null;
    const next=()=>{clearInterval(tm);if(k>=qs.length)return A.finish(sc,qs.length,'chuỗi dài nhất '+best);const q=qs[k];const opts=G_SHUF(q.options.map((t,i)=>({t,ok:i===q.answer})));let left=QT;
      A.stage.innerHTML=`<div class="g-quiz"><div class="g-bar"><i style="width:100%"></i></div><p class="g-prog">Câu ${k+1}/${qs.length}${streak>=2?` · 🔥 ${streak} câu liền`:''}</p><p class="g-q">${esc(q.q)}</p><div class="g-opts">${opts.map((o,j)=>`<button type="button" class="g-opt" data-j="${j}">${esc(o.t)}</button>`).join('')}</div><p class="g-fb small"></p></div>`;
      const bar=A.stage.querySelector('.g-bar i');
      tm=setInterval(()=>{left-=.25;bar.style.width=Math.max(0,left/QT*100)+'%';if(left<=0){clearInterval(tm);answer(-1)}},250);
      const answer=j=>{clearInterval(tm);const bs=A.stage.querySelectorAll('.g-opt');bs.forEach((b,i)=>{b.disabled=true;if(opts[i].ok)b.classList.add('ok');else if(i===j)b.classList.add('bad')});
        const ok=j>=0&&opts[j].ok;gBeep(ok);if(ok){streak++;best=Math.max(best,streak);sc++;A.add(1+(streak>=3?1:0))}else streak=0;
        A.stage.querySelector('.g-fb').innerHTML=(ok?'✓ Đúng! ':j<0?'⏰ Hết giờ. ':'✗ Chưa đúng. ')+(q.explain?fmtVi(q.explain):'');k++;setTimeout(next,ok?900:1800)};
      A.stage.querySelector('.g-opts').onclick=e=>{const b=e.target.closest('.g-opt');if(b&&!b.disabled)answer(+b.dataset.j)}};
    let best=0;next();
  },
  /* Phân nhóm: mỗi thẻ hiện ra, chạm vào nhóm đúng */
  sort(spec,A){
    const groups=spec.groups;const items=G_SHUF(groups.flatMap((g,gi)=>g.items.map(t=>({t,gi}))));let k=0,sc=0;
    const draw=()=>{if(k>=items.length)return A.finish(sc,items.length);const it=items[k];
      A.stage.innerHTML=`<div class="g-sort"><p class="g-prog">Thẻ ${k+1}/${items.length}</p><div class="g-sortcard">${esc(it.t)}</div><div class="g-bins">${groups.map((g,gi)=>`<button type="button" class="g-bin" data-g="${gi}"><b>${esc(g.name)}</b><span>${items.slice(0,k).filter(x=>x.gi===gi).length} thẻ</span></button>`).join('')}</div><p class="g-fb small"></p></div>`;
      A.stage.querySelector('.g-bins').onclick=e=>{const b=e.target.closest('.g-bin');if(!b||b.disabled)return;const ok=+b.dataset.g===it.gi;gBeep(ok);
        A.stage.querySelectorAll('.g-bin').forEach(x=>{x.disabled=true;if(+x.dataset.g===it.gi)x.classList.add('ok');else if(x===b)x.classList.add('bad')});
        if(ok){sc++;A.add(1)}const rl=groups[it.gi].rule_vi;A.stage.querySelector('.g-fb').innerHTML=(ok?'✓ Đúng nhóm! ':'✗ Thẻ này thuộc nhóm <b>'+esc(groups[it.gi].name)+'</b>. ')+(rl?'<br>'+fmtVi(rl):'');k++;setTimeout(draw,ok?(rl?1800:650):2600)}};
    draw();
  },
  /* Xếp câu: chạm các từ theo đúng thứ tự */
  unjumble(spec,A){
    const qs=G_SHUF(spec.items).slice(0,(spec.cfg||{}).un||5);let k=0,sc=0;
    const next=()=>{if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k];const words=q.sentence.trim().split(/\s+/);let pool=G_SHUF(words.map((w,i)=>({w,i})));
      if(pool.every((x,i)=>x.i===i))pool=pool.reverse();let built=[],tries=0;
      const draw=()=>{A.stage.innerHTML=`<div class="g-unj"><p class="g-prog">Câu ${k+1}/${qs.length}</p>${q.hint?`<p class="small muted">Gợi ý: ${esc(q.hint)}</p>`:''}
        <div class="g-line">${built.map((x,j)=>`<button type="button" class="g-word in" data-b="${j}">${esc(x.w)}</button>`).join('')||'<span class="muted small">Chạm các từ bên dưới để xếp câu</span>'}</div>
        <div class="g-pool">${pool.map((x,j)=>`<button type="button" class="g-word" data-p="${j}" ${built.includes(x)?'disabled':''}>${esc(x.w)}</button>`).join('')}</div>
        <div class="row" style="justify-content:center"><button type="button" class="btn g-check" ${built.length<words.length?'disabled':''}>Kiểm tra</button></div><p class="g-fb small"></p></div>`};
      draw();
      A.stage.onclick=e=>{const p=e.target.closest('[data-p]'),bb=e.target.closest('[data-b]');
        if(p&&!p.disabled){built.push(pool[+p.dataset.p]);draw();return}
        if(bb){built.splice(+bb.dataset.b,1);draw();return}
        if(e.target.closest('.g-check')){const got=built.map(x=>x.w).join(' ');const ok=got===words.join(' ');gBeep(ok);tries++;
          const fb=A.stage.querySelector('.g-fb');
          if(ok){const p2=tries===1?1:0.5;sc+=p2;A.add(p2);A.stage.querySelector('.g-line').classList.add('ok');fb.innerHTML='✓ Chính xác!'+(q.why?'<br>'+fmtVi(q.why):'');k++;setTimeout(next,q.why?2200:900)}
          else if(tries>=2){A.stage.querySelector('.g-line').classList.add('bad');fb.innerHTML='Câu đúng: <b>'+esc(q.sentence)+'</b>'+(q.why?'<br>'+fmtVi(q.why):'');k++;setTimeout(next,3200)}
          else{A.stage.querySelector('.g-line').classList.add('bad');fb.textContent='✗ Chưa đúng, thử lại một lần nữa nhé.';setTimeout(()=>{built=[];draw();A.stage.querySelector('.g-fb').textContent='Thử lại lần 2'},900)}}}};
    next();
  },
  /* Đúng hay sai: 8 giây mỗi câu */
  truefalse(spec,A){
    const TT=(spec.cfg||{}).tftime||10;const qs=G_SHUF(spec.items).slice(0,8);let k=0,sc=0,tm=null;
    const next=()=>{clearInterval(tm);if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k];let left=TT;
      A.stage.innerHTML=`<div class="g-tf"><div class="g-bar"><i style="width:100%"></i></div><p class="g-prog">Câu ${k+1}/${qs.length}</p><p class="g-q">${esc(q.s)}</p><div class="g-tfb"><button type="button" class="g-yes" data-v="1">✓ Đúng</button><button type="button" class="g-no" data-v="0">✗ Sai</button></div><p class="g-fb small"></p></div>`;
      const bar=A.stage.querySelector('.g-bar i');tm=setInterval(()=>{left-=.25;bar.style.width=Math.max(0,left/TT*100)+'%';if(left<=0){clearInterval(tm);ans(null)}},250);
      const ans=v=>{clearInterval(tm);A.stage.querySelectorAll('.g-tfb button').forEach(b=>b.disabled=true);const ok=v!==null&&(v===1)===q.ok;gBeep(ok);if(ok){sc++;A.add(1)}
        A.stage.querySelector('.g-fb').innerHTML=(ok?'✓ Đúng rồi! ':v===null?'⏰ Hết giờ. ':'✗ Chưa đúng. ')+(q.ok?'Câu này đúng.':'Sửa: <b>'+esc(q.fix)+'</b>')+(q.why?'<br>'+fmtVi(q.why):'');k++;setTimeout(next,ok&&q.ok?1100:2600)};
      A.stage.querySelector('.g-tfb').onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled)ans(+b.dataset.v)}};
    next();
  }
};

/* ===== Sinh dữ liệu game cho từng buổi, theo mức của con ===== */
const G_CFG={
  nen:{pairs:5,n:5,un:4,qtime:22,tftime:15,lives:8,speed:1300,roundMs:9000,dur:9,size:8,max:8,diag:false,showWords:true,firstLetter:true,hintMeaning:true,extra:0,autoFill:true,useGap:false},
  chuan:{pairs:6,n:7,un:5,qtime:15,tftime:10,lives:6,speed:1000,roundMs:7000,dur:7,size:9,max:9,diag:false,showWords:true,firstLetter:false,hintMeaning:true,extra:1},
  nang:{pairs:8,n:9,un:5,qtime:10,tftime:7,lives:5,speed:750,roundMs:5500,dur:5.5,size:10,max:11,diag:true,showWords:false,firstLetter:false,hintMeaning:false,extra:2,gapOnly:true}};
/* Mỗi buổi một bộ 3 game khác nhau; hai buổi liền nhau không lặp loại game; buổi 1–8, 10 và 14 đều mở một loại game mới. */
const G_PLAN={1:['match','sort','quiz'],2:['flip','unjumble','hangman'],3:['anagram','truefalse','whack'],4:['balloon','sort','match'],5:['wordsearch','truefalse','quiz'],6:['crossword','unjumble','flip'],7:['openbox','quiz','whack'],
  8:['dictation','sort','anagram'],9:['hangman','truefalse','balloon'],10:['missing','unjumble','wordsearch'],11:['whack','openbox','crossword'],12:['flip','sort','dictation'],13:['balloon','truefalse','anagram'],14:['wheel','unjumble','match']};
const G_HOW={hangman:'Đọc nghĩa, chạm từng chữ cái để đoán từ. Mỗi lần đoán sai em mất một quả bóng bay.',whack:'Đọc nghĩa ở trên, đập (chạm) vào con chuột mang đúng từ tiếng Anh. Chạm nhầm không mất điểm nhưng mất thời gian.',
  balloon:'Bóng bay đang bay lên! Chạm quả bóng mang đáp án đúng trước khi nó bay mất.',wordsearch:'Tìm các từ của buổi học trong bảng chữ theo nghĩa cho sẵn.',crossword:'Điền từ tiếng Anh theo nghĩa vào ô chữ; các từ giao nhau ở những chữ cái chung.',
  openbox:'Chọn hộp bất kỳ. Mỗi hộp là một câu hỏi; có hộp quà +2 điểm và hộp nhân đôi điểm.',dictation:'Bấm nghe, rồi gõ lại từ cho đúng chính tả. Có thể nghe lại và nghe từ trong câu.',missing:'Chạm một từ trong khung rồi chạm vào chỗ trống phù hợp trong câu.',wheel:'Quay vòng và làm thử thách vừa quay được: nghĩa của từ, chính tả hoặc đúng hay sai.'};
function gTrack(){return S.track||trackFromLevel(S.diag&&S.diag.level)}
function gPool(n){const D=DAYS[n-1];if(D.vocab)return {v:D.vocab,p:D.phrasal||[],w:(D.wordform&&D.wordform.examples)||[]};
  const from=n===7?[1,2,3,4,5,6]:[8,9,10,11,12,13];const v=[],p=[],w=[];from.forEach(i=>{const d=DAYS[i-1];(d.vocab||[]).slice(0,3).forEach(x=>v.push(x));(d.phrasal||[]).slice(0,1).forEach(x=>p.push(x));((d.wordform&&d.wordform.examples)||[]).slice(0,2).forEach(x=>w.push(x))});return {v,p,w}}
function gQuizItems(v,gapOnly){const words=v.map(x=>x.word);const out=[];v.forEach(x=>{const re=new RegExp('\\b'+x.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');const distract=G_SHUF(words.filter(w=>w!==x.word)).slice(0,3);
  const options=[x.word,...distract];if(re.test(x.example))out.push({q:x.example.replace(re,'______'),options,answer:0,explain:x.word+' = '+x.meaning_vi});
  else if(!gapOnly)out.push({q:'Từ nào có nghĩa là "'+x.meaning_vi+'"?',options,answer:0,explain:x.example})});return out.length>=4?out:gQuizItems(v,false)}
function gamesForDay(n){const tr=gTrack();const cfg=G_CFG[tr]||G_CFG.chuan;const P=gPool(n);const W=(C.web&&C.web[n])||{};const GG=W.grammar_games||{};const out=[];
  const V=P.v.map(x=>({w:x.word,m:x.meaning_vi,ex:x.example,ipa:x.ipa}));const VP=V.concat(P.p.map(x=>({w:x.phrase,m:x.meaning_vi,ex:x.example})));
  const tfPool=(GG.truefalse||[]).map(x=>({kind:'tf',s:x.s,ok:x.ok,fix:x.fix,why:x.why_vi}));const seen=new Set();for(let d=1;d<n;d++)(G_PLAN[d]||[]).forEach(t=>seen.add(t));
  (G_PLAN[n]||['match','quiz','flip']).forEach((t,idx)=>{const key=t+idx;const base={type:t,key,cfg,isNew:!seen.has(t)};let g=null;
    if(t==='match')g={title:'Nối từ với nghĩa',how:'Chạm một từ bên trái, rồi chạm nghĩa đúng bên phải. Nối đúng ngay lần đầu mới được điểm.',items:P.v.map(x=>({a:x.word,b:x.meaning_vi})).concat(P.p.map(x=>({a:x.phrase,b:x.meaning_vi}))).concat(tr==='nang'?P.w.map(x=>({a:x[0],b:x[1]})):[])};
    else if(t==='flip')g={title:'Lật thẻ tìm cặp',how:'Lật hai thẻ một lượt. Tìm thẻ từ tiếng Anh và thẻ nghĩa đi với nhau. Càng ít lượt càng nhiều sao.',items:P.v.map(x=>({a:x.word,b:x.meaning_vi})).concat(P.p.map(x=>({a:x.phrase,b:x.meaning_vi})))};
    else if(t==='anagram')g={title:'Xếp chữ thành từ',how:'Đọc nghĩa, chạm các chữ cái theo đúng thứ tự để ghép thành từ tiếng Anh.'+(cfg.firstLetter?' Chữ cái đầu đã được xếp sẵn.':''),items:P.v.filter(x=>/^[a-z]+$/i.test(x.word)).map(x=>({a:x.word.toLowerCase(),b:x.meaning_vi,c:tr==='nang'?'':(x.ipa||'')}))};
    else if(t==='quiz')g={title:'Đố nhanh từ vựng',how:cfg.qtime+' giây mỗi câu. Đúng 3 câu liền được thưởng điểm.',items:gQuizItems(P.v,cfg.gapOnly)};
    else if(t==='sort'&&GG.sort)g={title:GG.sort.title_vi||'Phân nhóm',how:'Mỗi thẻ hiện ra, em chạm vào nhóm đúng của nó.',groups:GG.sort.groups};
    else if(t==='unjumble'&&GG.unjumble)g={title:'Xếp từ thành câu',how:'Chạm các từ theo đúng thứ tự để thành câu đúng ngữ pháp. Chạm từ đã xếp để bỏ ra. Được thử 2 lần.',items:GG.unjumble.map(u=>({sentence:u.sentence,hint:tr==='nang'?'':u.hint_vi,why:u.why_vi}))};
    else if(t==='truefalse'&&GG.truefalse)g={title:'Câu này đúng hay sai?',how:cfg.tftime+' giây mỗi câu. Đọc nhanh và quyết định câu đúng hay sai ngữ pháp.',items:GG.truefalse.map(x=>({s:x.s,ok:x.ok,fix:x.fix,why:x.why_vi}))};
    else if(t==='openbox')g={title:'Mở hộp bí mật',how:G_HOW.openbox,pool:tfPool.concat(gQuizItems(P.v,cfg.gapOnly).map(q=>Object.assign({kind:'mcq'},q))),cfg:Object.assign({},cfg,{n:tr==='nen'?6:tr==='nang'?10:8})};
    else if(t==='wheel')g={title:'Vòng quay may mắn',how:G_HOW.wheel,items:V,pool:tfPool,cfg:Object.assign({},cfg,{n:tr==='nen'?5:tr==='nang'?8:6})};
    else if(['hangman','wordsearch','crossword','dictation','missing'].includes(t))g={title:G_NAME[t],how:G_HOW[t],items:V};
    else if(t==='whack'||t==='balloon')g={title:G_NAME[t],how:G_HOW[t],items:tr==='nen'?V:VP};
    if(g)out.push(Object.assign(base,g))});
  /* Game vận động: buổi 3, 7, 11 nghiêng đầu; buổi 5, 9, 13 bước sang trái/phải */
  const MO={3:'tilt',7:'tilt',11:'tilt',5:'lean',9:'lean',13:'lean'};
  if(MO[n]){const voc=G_SHUF(V).slice(0,6).map(x=>{const o=G_SHUF(V.filter(y=>y!==x))[0];const L0=Math.random()<.5;return {q:'Từ nào có nghĩa là: '+x.m+'?',L:L0?x.w:o.w,R:L0?o.w:x.w,ans:L0?'L':'R',why:x.w+' = '+x.m}});
    const tfs=(GG.truefalse||[]).map(x=>({q:x.s,L:'✓ Đúng',R:'✗ Sai',ans:x.ok?'L':'R',why:(x.ok?'Câu này đúng. ':'Sửa: **'+x.fix+'**. ')+(x.why_vi||'')}));
    out.push({type:'motion',key:'motion'+n,mode:MO[n],title:MO[n]==='tilt'?'Nghiêng đầu chọn đáp án':'Bước sang trái – phải',how:'Game vận động: chọn đáp án bằng cách '+(MO[n]==='tilt'?'nghiêng đầu':'bước người')+' sang trái hoặc phải. Không có camera thì bấm nút.',items:G_SHUF(voc).slice(0,4).concat(G_SHUF(tfs).slice(0,4)),cfg:Object.assign({},cfg,{mn:8,mtime:tr==='nen'?10:tr==='nang'?6:8}),isNew:n===3||n===5}) }
  if(out.length<3){const have=new Set(out.map(o=>o.type));['quiz','flip','anagram','match'].forEach(t=>{if(out.length<3&&!have.has(t)){have.add(t);const s=gamesForDayFallback(P,t);if(s)out.push(Object.assign(s,{cfg}))}})}
  return out}
function gamesForDayFallback(P,t){const k=t+'f';if(t==='quiz')return {type:'quiz',key:k,title:'Đố nhanh từ vựng',how:'Trả lời nhanh trước khi hết giờ.',items:gQuizItems(P.v)};
  if(t==='flip')return {type:'flip',key:k,title:'Lật thẻ tìm cặp',how:'Lật hai thẻ một lượt để tìm cặp từ – nghĩa.',items:P.v.map(x=>({a:x.word,b:x.meaning_vi}))};
  if(t==='anagram')return {type:'anagram',key:k,title:'Xếp chữ thành từ',how:'Chạm các chữ cái theo đúng thứ tự.',items:P.v.filter(x=>/^[a-z]+$/i.test(x.word)).map(x=>({a:x.word.toLowerCase(),b:x.meaning_vi}))};
  return {type:'match',key:k,title:'Nối từ với nghĩa',how:'Chạm từ rồi chạm nghĩa.',items:P.v.map(x=>({a:x.word,b:x.meaning_vi}))}}
