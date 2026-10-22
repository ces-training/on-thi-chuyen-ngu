/* ===== Bài theo dạng đề thi thật (rút gọn): mcq, cloze_mcq, gap_text (gồm nghe), transform, matching, order =====
   renderExam(box, block, saved, onDone). saved = kết quả lần trước (nếu có) để hiện lại. onDone({correct,total,answers}). */
const X_FMT={sentence_completion:'Hoàn thành câu',synonym:'Đồng nghĩa',antonym:'Trái nghĩa',dialogue_completion:'Hoàn thành hội thoại',pronunciation:'Phát âm',stress:'Trọng âm',
  error_id:'Tìm lỗi sai',sentence_combining:'Kết hợp câu',closest_meaning:'Câu gần nghĩa nhất',reading_mcq:'Đọc hiểu',cloze:'Điền từ vào đoạn văn',open_cloze:'Điền từ tự do',
  word_formation:'Cấu tạo từ trong đoạn văn',listening:'Nghe',transformation:'Viết lại câu',key_word:'Viết lại câu với từ cho sẵn',matching_headings:'Nối tiêu đề với đoạn',dialogue_order:'Sắp xếp hội thoại',mixed:'Đề thi thu nhỏ'};
const xU=s=>esc(s).replace(/\[\[(.+?)\]\]/g,'<u>$1</u>');
function xErr(q,opts){let html='',pos=0;opts.forEach((o,i)=>{const p=q.indexOf(o,pos);if(p<0)return;html+=esc(q.slice(pos,p))+`<u class="x-seg">${esc(o)}<sub>${'ABCD'[i]}</sub></u>`;pos=p+o.length});return html+esc(q.slice(pos))}
function xOk(val,it){const v=norm(val);if(!v)return false;return [it.answer].concat(it.accept||[]).some(a=>norm(a)===v)}
function xSpeak(text,btn,state){const synth=window.speechSynthesis;if(!synth||!window.SpeechSynthesisUtterance){btn.disabled=true;btn.textContent='Máy này không đọc được';return}
  if(state.plays>=2){return}synth.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=.9;
  const vs=synth.getVoices();const v=vs.find(x=>/en-GB/i.test(x.lang))||vs.find(x=>/^en/i.test(x.lang));if(v)u.voice=v;
  u.onend=()=>{btn.disabled=state.plays>=2;btn.textContent=state.plays>=2?'Đã nghe 2 lần':'▶ Nghe lần 2'};
  state.plays++;btn.disabled=true;btn.textContent='Đang phát…';synth.speak(u)}

function renderExam(box,B,saved,onDone){
  const kind=B.kind,items=B.items||[];
  const perm=it=>B.format==='error_id'||!it.options?[0,1,2,3]:G_SHUF([0,1,2,3].slice(0,it.options.length));
  let body='';
  if(B.passage)body+=`<div class="passage">${esc(B.passage)}</div>`;
  if(kind==='mcq'){
    body+=items.map((it,i)=>{const q=B.format==='error_id'?xErr(it.q,it.options):esc(it.q).replace(/\n/g,'<br>');
      return `<div class="q x-item" data-i="${i}"><div class="qhead"><span class="qnum">${i+1}</span>${it.format?`<span class="review-mark">${esc(X_FMT[it.format]||it.format)}</span>`:''}</div><div class="qtext">${q}</div><div class="opts">${perm(it).map(j=>{const o=it.options[j];return `<label class="opt" data-i="${j}"><input type="radio" name="x${i}" value="${j}"><span>${B.format==='pronunciation'?xU(o):B.format==='error_id'?'ABCD'[j]+'. '+esc(o):esc(o)}</span></label>`}).join('')}</div><div class="fbslot"></div></div>`}).join('');
  }else if(kind==='cloze_mcq'){
    body+=`<div class="passage x-text">${esc(B.text).replace(/\[(\d+)\]/g,(m,n)=>`<b class="x-gap" data-g="${n-1}">(${n}) ____</b>`)}</div>`;
    body+=items.map((it,i)=>`<div class="q x-item" data-i="${i}"><div class="qhead"><span class="qnum">${i+1}</span></div><div class="opts row-opts">${perm(it).map(j=>`<label class="opt" data-i="${j}"><input type="radio" name="x${i}" value="${j}"><span>${esc(it.options[j])}</span></label>`).join('')}</div><div class="fbslot"></div></div>`).join('');
  }else if(kind==='gap_text'){
    if(B.format==='listening')body+=`<div class="x-listen"><button type="button" class="btn x-play">▶ Nghe lần 1</button><span class="small muted">Như đề thật, cậu được nghe 2 lần. Đọc trước phần ghi chú bên dưới.</span></div>`;
    body+=`<div class="passage x-text">${esc(B.text).replace(/\[(\d+)\]/g,(m,n)=>{const it=items[n-1]||{};return `<span class="x-inwrap"><b>(${n})</b><input class="x-in" data-i="${n-1}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Chỗ trống ${n}">${it.base?`<i class="x-base">${esc(it.base)}</i>`:''}</span>`})}</div><div class="x-fbs"></div>`;
    if(B.format==='listening')body+=`<details class="x-script" hidden><summary>Xem lời bài nghe</summary><p>${esc(B.script)}</p></details>`;
  }else if(kind==='transform'){
    body+=items.map((it,i)=>`<div class="q x-item" data-i="${i}"><div class="qhead"><span class="qnum">${i+1}</span>${it.word?`<span class="x-key">${esc(it.word)}</span>`:''}</div><div class="qtext">${esc(it.q)}</div>
      <div class="x-tr"><span>${esc(it.start)}</span><input class="x-in" data-i="${i}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Viết tiếp câu ${i+1}">${it.end?`<span>${esc(it.end)}</span>`:''}</div><div class="fbslot"></div></div>`).join('');
  }else if(kind==='matching'){
    body+=`<ol class="x-heads" type="A">${B.headings.map(h=>`<li>${esc(h)}</li>`).join('')}</ol>`;
    body+=B.paragraphs.map((p,i)=>`<div class="q x-item" data-i="${i}"><div class="qhead"><span class="qnum">${i+1}</span><select class="x-sel" data-i="${i}" aria-label="Tiêu đề cho đoạn ${i+1}"><option value="">Chọn tiêu đề…</option>${B.headings.map((h,j)=>`<option value="${j}">${'ABCDEF'[j]}</option>`).join('')}</select></div><div class="passage">${esc(p)}</div><div class="fbslot"></div></div>`).join('');
  }else if(kind==='order'){
    body+=`<div class="x-order"><p class="small muted">Lượt đầu đã đặt sẵn. Chạm các lượt lời còn lại theo đúng thứ tự; chạm lượt đã xếp để bỏ ra.</p><ol class="x-built"></ol><div class="x-pool"></div></div>`;
  }
  box.innerHTML=`<div class="x-intro"><p class="eyebrow">${esc(X_FMT[B.format]||B.format)}</p><h3>${esc(B.title_vi||'')}</h3><p class="small">${esc(B.intro_vi||'')}</p>${B.tip_vi?`<p class="x-tip small">${esc(B.tip_vi)}</p>`:''}</div>
   <form class="x-form">${body}<div class="sticky-submit"><button class="btn hi" type="submit">Chấm bài</button><span class="small muted x-msg"></span></div></form>`;
  const form=box.querySelector('form');wireOptionHighlight(form);
  // nghe
  const play=box.querySelector('.x-play');const lst={plays:0};if(play)play.onclick=()=>xSpeak(B.script,play,lst);
  // cloze: hiện lựa chọn vào chỗ trống
  if(kind==='cloze_mcq')form.addEventListener('change',e=>{const r=e.target;if(r.type!=='radio')return;const i=+r.name.slice(1);const g=form.querySelector(`.x-gap[data-g="${i}"]`);if(g)g.textContent=`(${i+1}) ${items[i].options[+r.value]}`});
  // sắp xếp hội thoại
  let ord=null;
  if(kind==='order'){const lines=B.lines;ord=[0];const pool=G_SHUF(lines.map((l,i)=>i).slice(1));
    const draw=()=>{form.querySelector('.x-built').innerHTML=ord.map((i,j)=>`<li><button type="button" class="x-line ${j===0?'fixed':''}" data-o="${j}" ${j===0?'disabled':''}>${esc(lines[i])}</button></li>`).join('');
      form.querySelector('.x-pool').innerHTML=pool.filter(i=>!ord.includes(i)).map(i=>`<button type="button" class="x-line" data-p="${i}">${esc(lines[i])}</button>`).join('')};
    draw();form.querySelector('.x-order').onclick=e=>{const p=e.target.closest('[data-p]'),o=e.target.closest('[data-o]');if(form.dataset.done)return;if(p){ord.push(+p.dataset.p);draw()}else if(o&&+o.dataset.o>0){ord.splice(+o.dataset.o,1);draw()}}}
  const grade=()=>{let correct=0,total=0;const answers={};
    if(kind==='mcq'||kind==='cloze_mcq'){items.forEach((it,i)=>{total++;const r=form.querySelector(`input[name="x${i}"]:checked`);const v=r?+r.value:null;answers[i]=v;const ok=v===it.answer;if(ok)correct++;
      const q=form.querySelector(`.x-item[data-i="${i}"]`);q.querySelectorAll('.opt').forEach(o=>{const j=+o.dataset.i;o.classList.remove('sel');if(j===it.answer)o.classList.add('right');else if(j===v)o.classList.add('wrong')});
      q.querySelectorAll('input').forEach(x=>x.disabled=true);q.querySelector('.fbslot').innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Chưa đúng. Đáp án: <b>'+(B.format==='pronunciation'?xU(it.options[it.answer]):esc(it.options[it.answer]))+'</b>'}${it.explain_vi?`<span class="ex">${fmtVi(it.explain_vi)}</span>`:''}</div>`})}
    else if(kind==='gap_text'){const fbs=[];items.forEach((it,i)=>{total++;const inp=form.querySelector(`.x-in[data-i="${i}"]`);const v=inp.value;answers[i]=v;const ok=xOk(v,it);if(ok)correct++;inp.classList.add(ok?'ok':'bad');inp.disabled=true;
      fbs.push(`<li class="${ok?'good':'bad'}"><b>(${i+1})</b> ${ok?'✓':'✗ đáp án: <b>'+esc(it.answer)+'</b>'}${it.explain_vi?' – '+fmtVi(it.explain_vi):''}</li>`)});
      form.querySelector('.x-fbs').innerHTML=`<ul class="x-fblist">${fbs.join('')}</ul>`;const sc=form.querySelector('.x-script');if(sc)sc.hidden=false}
    else if(kind==='transform'){items.forEach((it,i)=>{total++;const inp=form.querySelector(`.x-in[data-i="${i}"]`);const v=inp.value;answers[i]=v;const ok=xOk(v,it);if(ok)correct++;inp.classList.add(ok?'ok':'bad');inp.disabled=true;
      form.querySelector(`.x-item[data-i="${i}"] .fbslot`).innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Câu đúng: <b>'+esc(it.start+' '+it.answer+(it.end?' '+it.end:''))+'</b>'}${it.explain_vi?`<span class="ex">${fmtVi(it.explain_vi)}</span>`:''}</div>`})}
    else if(kind==='matching'){B.paragraphs.forEach((p,i)=>{total++;const s=form.querySelector(`.x-sel[data-i="${i}"]`);const v=s.value===''?null:+s.value;answers[i]=v;const ok=v===B.answer[i];if(ok)correct++;s.disabled=true;s.classList.add(ok?'ok':'bad');
      form.querySelector(`.x-item[data-i="${i}"] .fbslot`).innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Đáp án: <b>'+'ABCDEF'[B.answer[i]]+'. '+esc(B.headings[B.answer[i]])+'</b>'}</div>`});
      if(B.explain_vi)form.querySelector('.x-msg').insertAdjacentHTML('afterend',`<p class="small">${fmtVi(B.explain_vi)}</p>`)}
    else if(kind==='order'){const n=B.lines.length-1;total=n;for(let j=1;j<=n;j++){if(ord[j]===j)correct++}answers.order=ord.slice();form.dataset.done='1';
      form.querySelectorAll('.x-built .x-line').forEach((b,j)=>{if(j>0)b.classList.add(ord[j]===j?'ok':'bad')});
      form.querySelector('.x-pool').innerHTML=`<div class="fb ${correct===n?'good':'bad'}">${correct===n?'Đúng thứ tự!':'Thứ tự đúng:'}<ol>${B.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ol>${B.explain_vi?`<span class="ex">${fmtVi(B.explain_vi)}</span>`:''}</div>`}
    return {correct,total,answers}};
  form.addEventListener('submit',e=>{e.preventDefault();if(form.dataset.graded)return;
    if(kind==='order'&&ord.length<B.lines.length){form.querySelector('.x-msg').textContent='Cậu xếp hết các lượt lời rồi mới chấm nhé.';return}
    form.dataset.graded='1';const r=grade();form.querySelector('button[type=submit]').disabled=true;
    form.querySelector('.x-msg').innerHTML=`Cậu đúng <b>${r.correct}/${r.total}</b>. <button type="button" class="linkbtn x-redo">Làm lại</button>`;
    form.querySelector('.x-redo').onclick=()=>renderExam(box,B,null,onDone);
    if(window.speechSynthesis)try{speechSynthesis.cancel()}catch(_){}
    onDone&&onDone(r)});
}

/* ===== Luyện nghe theo khuôn đề Sở: phần 1 hội thoại hai giọng + trắc nghiệm, phần 2 độc thoại + điền ghi chú =====
   renderListening(box, L, track, saved, onDone, day?): L = {part1, part2}. Có file thu sẵn (C.audio) thì phát file; không thì máy đọc bằng giọng của trình duyệt; nghe tối đa 2 lần mỗi phần.
   Mức Nâng cao có tiếng ồn nền nhẹ như đề thật. */
const LS_RATE={nen:.8,chuan:.92,nang:1};
function lsVoices(){const all=(window.speechSynthesis&&speechSynthesis.getVoices())||[];const en=all.filter(v=>/^en/i.test(v.lang));
  const fem=/female|samantha|karen|serena|kate|libby|sonia|hazel|susan|moira|tessa|fiona|victoria|zira|aria|jenny|emma|amy/i,mal=/male|daniel|arthur|george|ryan|thomas|oliver|alex|fred|david|mark|guy|brian|james/i;
  const gb=en.filter(v=>/en-GB/i.test(v.lang));const pick=(re,pool)=>pool.find(v=>re.test(v.name)&&!(re===fem&&/\bmale\b/i.test(v.name)&&!/female/i.test(v.name)));
  const f=pick(fem,gb)||pick(fem,en)||gb[0]||en[0]||null;const m=pick(mal,gb.filter(v=>v!==f))||pick(mal,en.filter(v=>v!==f))||en.find(v=>v!==f)||f;return {female:f,male:m,same:!f||f===m}}
let LS_NOISE=null;
function lsNoise(on){try{if(!on){if(LS_NOISE){LS_NOISE.src.stop();LS_NOISE=null}return}if(LS_NOISE)return;const ac=G_AC=G_AC||new (window.AudioContext||window.webkitAudioContext)();
  const len=ac.sampleRate*2,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.5}
  const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const g=ac.createGain();g.gain.value=.05;src.connect(g);g.connect(ac.destination);src.start();LS_NOISE={src}}catch(e){}}
function lsPlay(lines,track,btn,state,done){const sy=window.speechSynthesis;if(!sy||!window.SpeechSynthesisUtterance){btn.disabled=true;btn.textContent='Máy này không đọc được';return}
  if(state.plays>=2||state.on)return;sy.cancel();const V=lsVoices();state.plays++;state.on=true;btn.disabled=true;btn.textContent='Đang phát…';if(track==='nang')lsNoise(true);
  let i=0;const next=()=>{if(i>=lines.length||!btn.isConnected){state.on=false;lsNoise(false);btn.disabled=state.plays>=2;btn.textContent=state.plays>=2?'Đã nghe 2 lần':'▶ Nghe lần 2';done&&done();return}
    const ln=lines[i++];const u=new SpeechSynthesisUtterance(ln.t);u.lang='en-GB';u.rate=LS_RATE[track]||.92;const v=ln.voice==='male'?V.male:V.female;if(v)u.voice=v;if(V.same)u.pitch=ln.voice==='male'?.75:1.25;
    u.onend=()=>setTimeout(next,ln.pause||350);u.onerror=()=>setTimeout(next,50);sy.speak(u)};next()}
/* File nghe thu sẵn (tools/gemini/gen_audio.py → C.audio["NN/track/partN"] = {file, seconds}). Không có thì dùng giọng đọc của trình duyệt như cũ.
   Buổi và mức được tìm bằng cách so khớp chính đối tượng L trong C.web (hoặc truyền day ở tham số thứ 6 của renderListening). */
function lsAudioSrc(L,track,part,day){try{const A=typeof C!=='undefined'&&C.audio;if(!A)return null;let n=day,t=track;
  if(!n||!(((C.web[n]||{}).listening||{})[t]===L))for(const k in C.web){const LS=(C.web[k]||{}).listening;if(!LS)continue;for(const tt in LS)if(LS[tt]===L){n=k;t=tt}}
  const a=n&&A[String(n).padStart(2,'0')+'/'+t+'/'+part];return a&&a.file?a.file:null}catch(e){return null}}
function lsPlayAudio(au,track,btn,state,fallback){if(state.plays>=2||state.on)return;state.plays++;state.on=true;btn.disabled=true;btn.textContent='Đang phát…';if(track==='nang')lsNoise(true);
  let started=false,settled=false;const off=()=>{au.onended=au.onerror=au.onplaying=au.ontimeupdate=null};
  const end=()=>{if(settled)return;settled=true;off();state.on=false;lsNoise(false);btn.disabled=state.plays>=2;btn.textContent=state.plays>=2?'Đã nghe 2 lần':'▶ Nghe lần 2'};
  const fail=()=>{if(settled)return;if(started){end();return}settled=true;off();lsNoise(false);state.on=false;state.plays--;state.noAudio=true;fallback()};
  try{au.currentTime=0}catch(e){}
  au.onended=end;au.onerror=fail;au.onplaying=()=>{started=true};au.ontimeupdate=()=>{if(!btn.isConnected){au.pause();end()}};
  const pr=au.play();if(pr&&pr.catch)pr.catch(fail)}
function lsSentences(t){return String(t).match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g).map(s=>s.trim()).filter(Boolean)}
function renderListening(box,L,track,saved,onDone,day){const p1=L.part1,p2=L.part2;const au1=lsAudioSrc(L,track,'part1',day),au2=lsAudioSrc(L,track,'part2',day);
  const auTag=f=>f?`<audio class="ls-audio" preload="metadata" src="${esc(f)}"></audio>`:'';
  const lines1=p1.script.map(x=>({t:x.t,voice:(p1.speakers[x.s]||{}).voice||'female',pause:420}));const lines2=lsSentences(p2.script).map(t=>({t,voice:'female',pause:250}));
  const tr=t=>p1.speakers.map(s=>s.name);
  box.innerHTML=`<p class="small muted">Như đề thật: đọc câu hỏi trước, mỗi phần được nghe 2 lần. ${track==='nang'?'Bản Nâng cao có tiếng ồn nền nhẹ giống phòng thi.':''} Nên đeo tai nghe.</p>
   <form class="x-form ls-part" data-p="1"><div class="x-intro"><h3>${esc(p1.title_vi||'Phần 1 · Hội thoại')}</h3><p class="small">${esc(p1.intro_vi||'')}</p></div>
    <div class="x-listen"><button type="button" class="btn ls-play">▶ Nghe lần 1</button><span class="small muted">${p1.speakers.map(s=>esc(s.name)).join(' và ')}</span>${auTag(au1)}</div>
    ${p1.items.map((it,i)=>`<div class="q x-item" data-i="${i}"><div class="qhead"><span class="qnum">${i+1}</span></div><div class="qtext">${esc(it.q)}</div><div class="opts">${G_SHUF([0,1,2,3]).map(j=>`<label class="opt" data-i="${j}"><input type="radio" name="l1_${i}" value="${j}"><span>${esc(it.options[j])}</span></label>`).join('')}</div><div class="fbslot"></div></div>`).join('')}
    <details class="x-script" hidden><summary>Xem lời bài nghe</summary>${p1.script.map(x=>`<p><b>${esc((p1.speakers[x.s]||{}).name||'')}:</b> ${esc(x.t)}</p>`).join('')}</details>
    <div class="sticky-submit"><button class="btn hi" type="submit">Chấm phần 1</button><span class="small muted x-msg"></span></div></form>
   <form class="x-form ls-part" data-p="2"><div class="x-intro"><h3>${esc(p2.title_vi||'Phần 2 · Độc thoại')}</h3><p class="small">${esc(p2.intro_vi||'')}</p></div>
    <div class="x-listen"><button type="button" class="btn ls-play">▶ Nghe lần 1</button>${auTag(au2)}</div>
    <div class="passage x-text">${esc(p2.text).replace(/\[(\d+)\]/g,(m,k)=>`<span class="x-inwrap"><b>(${k})</b><input class="x-in" data-i="${k-1}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Chỗ trống ${k}"></span>`)}</div><div class="x-fbs"></div>
    <details class="x-script" hidden><summary>Xem lời bài nghe</summary><p>${esc(p2.script)}</p></details>
    <div class="sticky-submit"><button class="btn hi" type="submit">Chấm phần 2</button><span class="small muted x-msg"></span></div></form>`;
  const [f1,f2]=box.querySelectorAll('form.ls-part');wireOptionHighlight(f1);
  const st1={plays:0},st2={plays:0};
  const wirePlay=(f,lines,st)=>{const b=f.querySelector('.ls-play'),au=f.querySelector('audio.ls-audio');const tts=()=>lsPlay(lines,track,b,st);b.onclick=()=>au&&!st.noAudio?lsPlayAudio(au,track,b,st,tts):tts()};
  wirePlay(f1,lines1,st1);wirePlay(f2,lines2,st2);
  const fin=(f,c,t,key)=>{f.dataset.graded='1';f.querySelector('button[type=submit]').disabled=true;f.querySelector('.x-script').hidden=false;try{speechSynthesis.cancel()}catch(_){}f.querySelectorAll('audio.ls-audio').forEach(a=>{try{a.pause();a.dispatchEvent(new Event('ended'))}catch(_){}});lsNoise(false);
    f.querySelector('.x-msg').innerHTML=`Cậu đúng <b>${c}/${t}</b>.`;onDone&&onDone(key,{correct:c,total:t})};
  f1.addEventListener('submit',e=>{e.preventDefault();if(f1.dataset.graded)return;let c=0;p1.items.forEach((it,i)=>{const r=f1.querySelector(`input[name="l1_${i}"]:checked`);const v=r?+r.value:null;const ok=v===it.answer;if(ok)c++;
      const q=f1.querySelector(`.x-item[data-i="${i}"]`);q.querySelectorAll('.opt').forEach(o=>{const j=+o.dataset.i;o.classList.remove('sel');if(j===it.answer)o.classList.add('right');else if(j===v)o.classList.add('wrong')});q.querySelectorAll('input').forEach(x=>x.disabled=true);
      q.querySelector('.fbslot').innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Chưa đúng. Đáp án: <b>'+esc(it.options[it.answer])+'</b>'}${it.explain_vi?`<span class="ex">${fmtVi(it.explain_vi)}</span>`:''}</div>`});fin(f1,c,p1.items.length,'p1')});
  f2.addEventListener('submit',e=>{e.preventDefault();if(f2.dataset.graded)return;let c=0;const fbs=[];p2.items.forEach((it,i)=>{const inp=f2.querySelector(`.x-in[data-i="${i}"]`);const ok=xOk(inp.value,it);if(ok)c++;inp.classList.add(ok?'ok':'bad');inp.disabled=true;
      fbs.push(`<li class="${ok?'good':'bad'}"><b>(${i+1})</b> ${ok?'✓':'✗ đáp án: <b>'+esc(it.answer)+'</b>'}${it.explain_vi?' – '+fmtVi(it.explain_vi):''}</li>`)});f2.querySelector('.x-fbs').innerHTML=`<ul class="x-fblist">${fbs.join('')}</ul>`;fin(f2,c,p2.items.length,'p2')});
}
