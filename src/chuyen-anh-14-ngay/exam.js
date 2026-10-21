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
    if(B.format==='listening')body+=`<div class="x-listen"><button type="button" class="btn x-play">▶ Nghe lần 1</button><span class="small muted">Như đề thật, em được nghe 2 lần. Đọc trước phần ghi chú bên dưới.</span></div>`;
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
      q.querySelectorAll('input').forEach(x=>x.disabled=true);q.querySelector('.fbslot').innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Chưa đúng. Đáp án: <b>'+(B.format==='pronunciation'?xU(it.options[it.answer]):esc(it.options[it.answer]))+'</b>'}${it.explain_vi?`<span class="ex">${esc(it.explain_vi)}</span>`:''}</div>`})}
    else if(kind==='gap_text'){const fbs=[];items.forEach((it,i)=>{total++;const inp=form.querySelector(`.x-in[data-i="${i}"]`);const v=inp.value;answers[i]=v;const ok=xOk(v,it);if(ok)correct++;inp.classList.add(ok?'ok':'bad');inp.disabled=true;
      fbs.push(`<li class="${ok?'good':'bad'}"><b>(${i+1})</b> ${ok?'✓':'✗ đáp án: <b>'+esc(it.answer)+'</b>'}${it.explain_vi?' – '+esc(it.explain_vi):''}</li>`)});
      form.querySelector('.x-fbs').innerHTML=`<ul class="x-fblist">${fbs.join('')}</ul>`;const sc=form.querySelector('.x-script');if(sc)sc.hidden=false}
    else if(kind==='transform'){items.forEach((it,i)=>{total++;const inp=form.querySelector(`.x-in[data-i="${i}"]`);const v=inp.value;answers[i]=v;const ok=xOk(v,it);if(ok)correct++;inp.classList.add(ok?'ok':'bad');inp.disabled=true;
      form.querySelector(`.x-item[data-i="${i}"] .fbslot`).innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Câu đúng: <b>'+esc(it.start+' '+it.answer+(it.end?' '+it.end:''))+'</b>'}${it.explain_vi?`<span class="ex">${esc(it.explain_vi)}</span>`:''}</div>`})}
    else if(kind==='matching'){B.paragraphs.forEach((p,i)=>{total++;const s=form.querySelector(`.x-sel[data-i="${i}"]`);const v=s.value===''?null:+s.value;answers[i]=v;const ok=v===B.answer[i];if(ok)correct++;s.disabled=true;s.classList.add(ok?'ok':'bad');
      form.querySelector(`.x-item[data-i="${i}"] .fbslot`).innerHTML=`<div class="fb ${ok?'good':'bad'}">${ok?'Đúng rồi!':'Đáp án: <b>'+'ABCDEF'[B.answer[i]]+'. '+esc(B.headings[B.answer[i]])+'</b>'}</div>`});
      if(B.explain_vi)form.querySelector('.x-msg').insertAdjacentHTML('afterend',`<p class="small">${esc(B.explain_vi)}</p>`)}
    else if(kind==='order'){const n=B.lines.length-1;total=n;for(let j=1;j<=n;j++){if(ord[j]===j)correct++}answers.order=ord.slice();form.dataset.done='1';
      form.querySelectorAll('.x-built .x-line').forEach((b,j)=>{if(j>0)b.classList.add(ord[j]===j?'ok':'bad')});
      form.querySelector('.x-pool').innerHTML=`<div class="fb ${correct===n?'good':'bad'}">${correct===n?'Đúng thứ tự!':'Thứ tự đúng:'}<ol>${B.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ol>${B.explain_vi?`<span class="ex">${esc(B.explain_vi)}</span>`:''}</div>`}
    return {correct,total,answers}};
  form.addEventListener('submit',e=>{e.preventDefault();if(form.dataset.graded)return;
    if(kind==='order'&&ord.length<B.lines.length){form.querySelector('.x-msg').textContent='Em xếp hết các lượt lời rồi mới chấm nhé.';return}
    form.dataset.graded='1';const r=grade();form.querySelector('button[type=submit]').disabled=true;
    form.querySelector('.x-msg').innerHTML=`Em đúng <b>${r.correct}/${r.total}</b>. <button type="button" class="linkbtn x-redo">Làm lại</button>`;
    form.querySelector('.x-redo').onclick=()=>renderExam(box,B,null,onDone);
    if(window.speechSynthesis)try{speechSynthesis.cancel()}catch(_){}
    onDone&&onDone(r)});
}
