/* ===== Bài đầu vào / đầu ra: phần nghe bằng bản ghi thật (YouTube), phần 4 "Dạng đề của sở", phần 5 viết đoạn văn =====
   Hai bài là hai dạng song song bám nội dung 14 buổi (mỗi câu có obj, day). Phần 4–5 chấm riêng, không dùng để xếp mức:
   chỉ để so trước và sau 14 buổi. Dạng ở phần 4 lấy theo gói luyện riêng của sở (REG().pack), chốt lúc làm bài đầu vào
   (S.diag.locF) để bài đầu ra hỏi đúng các dạng đó. Kết quả: S[kind].loc = {fmt:{correct,total}}, S[kind].wr = {score,of,words,text,checks}. */
const TX_OBJ=['open_cloze','key_word','matching_headings','gap_text','true_false'];
function txFormats(){const TL=C.test_local||{};if(S.diag&&S.diag.locF)return S.diag.locF.filter(f=>TL[f]);
  const p=(REG().pack||[]).filter(f=>TX_OBJ.includes(f)&&TL[f]);const out=p.slice(0,2);
  ['open_cloze','key_word','matching_headings'].forEach(f=>{if(out.length<2&&TL[f]&&!out.includes(f))out.push(f)});return out}
const TX_KEY=k=>k==='diag'?'diagnostic':'final';
function txDone(kind){if(!C.test_local)return true;const r=S[kind];if(!r)return false;const F=txFormats();return F.every(f=>r.loc&&r.loc[f])&&!!r.wr}

/* --- phần nghe: một đoạn YouTube, nghe tối đa 2 lần khi làm bài --- */
function txYtHTML(kind){const R=TESTS[kind].listen_yt;if(!R)return '';
  const MP=R.max_plays||2;const pdf=R.paper_pdf?`${R.paper_pdf}${R.paper_page?'#page='+R.paper_page:''}`:'';
  return `<div class="t-yt" data-kind="${kind}"><div class="yl-head"><span class="yl-tag">${R.exam?'ĐỀ MẪU CAMBRIDGE':'BẢN GHI THẬT'}</span><b>${R.exam?esc(R.exam+' · '+R.test+' · Part '+R.part):esc(R.title)}</b><span class="small muted">${R.exam?'mức '+esc(R.level||''):esc(R.channel||'')}</span></div>
   <p class="small">${esc(R.intro_vi||'')} ${MP===1?'Đoạn nghe đã có sẵn 2 lần đọc như đề thật: bấm nghe <b>1 lượt</b> liền tới hết.':'Đọc 5 câu hỏi bên dưới trước, rồi bấm nghe. Cậu được nghe <b>2 lần</b>.'}</p>
   ${pdf?`<p><a class="btn ghost" href="${esc(pdf)}" target="_blank" rel="noopener">📄 Mở đề gốc (PDF)</a> <span class="small muted">${R.paper_hint?esc(R.paper_hint)+'.':''}</span></p>`:''}
   <div class="yl-stage"><div class="yl-frame"><div class="tyt-player"></div><div class="yl-cover"><span style="font-size:2.2rem">🎧</span></div></div>
   <div class="yl-ctl"><button type="button" class="btn hi tyt-play">▶ Nghe lần 1</button><span class="small muted tyt-msg"></span></div></div></div>`}
function txWireYt(form,kind,state){const box=form.querySelector('.t-yt');const R=TESTS[kind].listen_yt;if(!box||!R)return;
  const done=!!S[kind];let plays=0,player=null;const btn=box.querySelector('.tyt-play'),msg=box.querySelector('.tyt-msg');
  const link=`<a href="https://www.youtube.com/watch?v=${encodeURIComponent(R.yt)}&t=${R.start||0}s" target="_blank" rel="noopener">mở trên YouTube</a>`;
  const MP=R.max_plays||2;
  const label=()=>{if(done){btn.textContent='▶ Nghe lại';btn.disabled=false;return}btn.textContent=MP===1?(plays?'Đã nghe xong':'▶ Bắt đầu nghe'):plays===0?'▶ Nghe lần 1':plays===1?'▶ Nghe lần 2':'Đã nghe 2 lần';btn.disabled=plays>=MP};
  btn.onclick=()=>{if(!done&&plays>=MP)return;box.querySelector('.yl-cover').hidden=true;
    if(player&&player.seekTo){player.seekTo(R.start||0,true);player.playVideo();return}
    msg.textContent='Đang tải…';ytApi().then(YT=>{player=new YT.Player(box.querySelector('.tyt-player'),{videoId:R.yt,playerVars:{start:R.start||0,end:R.end||undefined,autoplay:1,controls:done?1:0,rel:0,modestbranding:1,playsinline:1,disablekb:done?0:1,cc_load_policy:0},
      events:{onReady:ev=>{msg.textContent='';ev.target.playVideo()},onStateChange:ev=>{if(ev.data===1)msg.textContent='Đang phát…';if(ev.data===0){if(!done)plays++;msg.textContent=done?'':plays>=MP?'Hết lượt nghe.':'Xong lần 1. Xem lại đáp án rồi nghe lần 2.';label()}},
        onError:()=>{state.err=true;msg.innerHTML=`Video không phát được ở đây, cậu ${link} rồi làm tiếp.`}}})}).catch(()=>{state.err=true;msg.innerHTML=`Chưa tải được trình phát, cậu ${link} rồi làm tiếp.`})};
  label()}

/* --- phần 4, 5: hiện sau khi nộp 45 câu --- */
function txExtrasHTML(kind){const r=S[kind];if(!r||!C.test_local)return '';const F=txFormats();const W=((C.test_local||{}).writing||{})[TX_KEY(kind)];
  const nLeft=F.filter(f=>!(r.loc&&r.loc[f])).length+(r.wr?0:1);
  return `<div class="card tx-ex" id="txEx"><p class="eyebrow">${kind==='diag'?'Bài đầu vào':'Bài đầu ra'} · phần 4 và 5</p><h3>${nLeft?'Còn 2 phần ngắn để so tiến bộ sau 14 buổi':'Đã xong cả 5 phần'}</h3>
   <p class="small">Hai phần này không dùng để xếp mức. Chúng đo đúng những dạng cậu sẽ luyện trong gói <b>Dạng bài riêng của đề ${esc(REG().name)}</b> và bài viết, để ${kind==='diag'?'sau 14 buổi so với bài đầu ra':'so với lúc làm bài đầu vào'}. Khoảng 20 phút, làm luôn bây giờ hoặc trước buổi 2.</p>
   <h4>Phần 4 · Dạng đề của sở</h4>${F.map((f,i)=>{const v=r.loc&&r.loc[f];return v?`<p class="tx-done">✓ ${esc(LP_NAME[f]||f)}: <b>${v.correct}/${v.total}</b></p>`:`<div class="tx-blk" data-f="${f}"></div>`}).join('')}
   <h4>Phần 5 · Viết đoạn văn</h4>${r.wr?`<p class="tx-done">✓ Bài viết ${r.wr.words} từ · tự chấm <b>${r.wr.score}/${r.wr.of}</b></p><details class="small"><summary>Xem lại bài viết</summary><p class="tx-txt">${esc(r.wr.text)}</p></details>`:W?txWriteHTML(W):'<p class="muted small">Đang soạn đề.</p>'}</div>`}
function txWriteHTML(W){const RB=(C.test_local.writing||{}).rubric||[];
  return `<div class="tx-wr"><p class="lp-prompt"><b>${esc(W.prompt_en)}</b></p><p class="small">${esc(W.prompt_vi)} Viết khoảng ${esc(W.words||'120–150')} từ trong 15 phút, không tra từ điển.</p>
   <textarea class="lp-ta" rows="9" spellcheck="false" aria-label="Bài viết của cậu"></textarea><div class="row small"><span class="lp-wc pill">0 từ</span><button type="button" class="btn hi tx-wsub">Nộp bài viết</button><span class="muted tx-wmsg"></span></div>
   <div class="tx-rb" hidden><p class="small"><b>Tự chấm</b> theo bảng dưới đây, thật lòng nhé: cô sẽ xem lại bài của cậu.</p>${RB.map((c,i)=>`<fieldset class="tx-c"><legend>${esc(c.name_vi)}</legend>${(c.levels||[]).map((lv,j)=>`<label class="lp-ck"><input type="radio" name="rb${i}" value="${j}"><span>${esc(lv)}</span></label>`).join('')}</fieldset>`).join('')}
   <div class="row"><button type="button" class="btn tx-rsave">Lưu điểm tự chấm</button><span class="small muted tx-rmsg"></span></div></div></div>`}
function wireTestExtras(kind,after){const box=$('#txEx');if(!box)return;const r=S[kind];const F=txFormats();const TL=C.test_local||{};
  if(kind==='diag'&&!r.locF){r.locF=F;save()}
  box.querySelectorAll('.tx-blk').forEach(el=>{const f=el.dataset.f;const B=(TL[f]||{})[TX_KEY(kind)];if(!B){el.innerHTML='<p class="muted small">Đang soạn đề.</p>';return}
    renderExam(el,Object.assign({},B,{local:true,noRedo:true}),null,res=>{r.loc=r.loc||{};r.loc[f]={correct:res.correct,total:res.total,at:Date.now()};save();setTimeout(()=>{const t=box.querySelector('h3');if(t&&txDone(kind))t.textContent='Đã xong cả 5 phần'},0)})});
  const wr=box.querySelector('.tx-wr');if(!wr)return;const ta=wr.querySelector('.lp-ta'),wc=wr.querySelector('.lp-wc');
  ta.oninput=()=>{const w=lpWc(ta.value);wc.textContent=w+' từ';wc.className='lp-wc pill '+(w>=100&&w<=170?'good':'')};
  wr.querySelector('.tx-wsub').onclick=()=>{const w=lpWc(ta.value);if(w<20){wr.querySelector('.tx-wmsg').textContent='Cậu viết thêm rồi nộp nhé (bài này để so tiến bộ, viết được bao nhiêu cứ viết).';return}
    ta.readOnly=true;wr.querySelector('.tx-wsub').disabled=true;wr.querySelector('.tx-rb').hidden=false;wr.querySelector('.tx-wmsg').textContent=`Đã nộp ${w} từ. Giờ cậu tự chấm.`};
  wr.querySelector('.tx-rsave').onclick=()=>{const RB=(TL.writing||{}).rubric||[];const ch=RB.map((c,i)=>{const x=wr.querySelector(`input[name="rb${i}"]:checked`);return x?+x.value:null});
    if(ch.some(x=>x==null)){wr.querySelector('.tx-rmsg').textContent='Chọn mức cho đủ các mục nhé.';return}
    r.wr={score:ch.reduce((a,b)=>a+b,0),of:RB.length*2,checks:ch,words:lpWc(ta.value),text:ta.value,at:Date.now()};save();after&&after()}}

/* gói gọn phần 4–5 và điểm theo buổi để gửi mã kết quả cho cô */
function txSum(kind){const r=S[kind];if(!r)return {};return {tv:r.tv||1,lc:r.loc||null,lf:r.locF||null,w:r.wr?{s:r.wr.score,of:r.wr.of,n:r.wr.words}:null,bd:r.byDay||txByDay(kind)}}
/* --- so trước / sau theo từng buổi (mỗi câu của 45 câu gắn với một buổi qua it.day) --- */
function txByDay(kind){const r=S[kind];if(!r||!r.answers||(r.tv||1)!==(TESTS[kind].version||1))return null;const out={};
  TESTS[kind].items.forEach(it=>{if(!it.day)return;const d=it.day;out[d]=out[d]||[0,0];out[d][1]++;if(isCorrect(it,r.answers[it.id]))out[d][0]++});return out}

(function(){const st=document.createElement('style');st.textContent=`
.t-yt{margin:8px 0 14px;padding:12px;border:2px dashed var(--line,#c9d6d8);border-radius:14px}
.t-yt .yl-frame .tyt-player,.t-yt .yl-frame iframe{position:absolute;inset:0;width:100%;height:100%}
.tx-ex h4{margin:16px 0 6px}.tx-done{margin:6px 0;padding:8px 12px;border-radius:10px;background:var(--good-bg,#E3F4EA)}
.tx-blk{margin:8px 0 14px;padding:10px;border:1.5px solid var(--line,#c9d6d8);border-radius:12px}
.tx-c{border:none;margin:10px 0;padding:0}.tx-c legend{font-weight:700;margin-bottom:4px}.tx-txt{white-space:pre-wrap}
`;document.head.appendChild(st)})();

/* ===== Bài nghe từ đề mẫu chính thức Cambridge (Flyers, KET, PET, FCE) =====
   R = {exam, level, test, part, topic_vi, instructions_vi, paper_pdf, paper_page, yt, start, end, audio_mp3, items:[{n,type:'mcq'|'gap',choices,answer,accept,explain_vi}]}
   Trang không chép lại đề: học sinh mở đề gốc (PDF) để đọc câu hỏi, nhập đáp án ở đây; chấm theo đáp án gốc. */
function renderCamListen(box,R,saved,onDone){
  const L='ABCDEFGH';const pdf=R.paper_pdf?`${R.paper_pdf}${R.paper_page?'#page='+R.paper_page:''}`:'';
  const useYt=!!R.yt;let plays=0,player=null,graded=!!saved;
  const MP=R.max_plays||2;const OS=!!R.on_screen;
  box.innerHTML=`<div class="yl-head"><span class="yl-tag">${esc(R.tag||'ĐỀ MẪU CAMBRIDGE')}</span><b>${esc(R.exam)} · ${esc(R.test)} · Part ${esc(String(R.part))}</b><span class="small muted">mức ${esc(R.level||'')}${R.topic_vi?' · '+esc(R.topic_vi):''}</span></div>
   ${R.intro_vi?`<p class="notice small">${esc(R.intro_vi)}</p>`:''}
   <p>${esc(R.instructions_vi||'')} ${MP===1?'Đoạn nghe đã có sẵn 2 lần đọc như đề thật, nên cậu chỉ bấm nghe <b>1 lượt</b> và nghe liền tới hết.':'Cậu được nghe <b>2 lần</b>.'}</p>
   ${pdf?`<p><a class="btn ghost" href="${esc(pdf)}" target="_blank" rel="noopener">📄 Mở đề gốc (PDF)</a> <span class="small muted">${R.paper_hint?esc(R.paper_hint)+'. ':''}Đọc câu hỏi ở đề gốc trước khi nghe, rồi chọn hoặc gõ đáp án vào ô bên dưới theo đúng số câu.</span></p>`:''}
   ${OS?'<p class="small"><b>Đề nằm ngay trong video:</b> bấm nghe là câu hỏi và tranh hiện ra, cậu vừa xem đề vừa nghe rồi chọn hoặc gõ đáp án ở dưới.</p>':''}
   <div class="cam-body"><div class="yl-stage">${useYt?`<div class="yl-frame${OS?' yl-big':''}"><div class="cam-player"></div><div class="yl-cover"><span style="font-size:2.2rem">🎧</span></div></div>`:`<audio class="cam-audio" preload="none" src="${esc(R.audio_mp3||'')}"></audio>`}
     <div class="yl-ctl"><button type="button" class="btn hi cam-play">▶ Nghe lần 1</button>${OS?'<button type="button" class="btn ghost cam-fs">⛶ Làm bài toàn màn hình</button>':''}<span class="small muted cam-msg"></span></div></div>
   <form class="cam-form">${R.items.map((it,i)=>`<div class="q cam-q" data-i="${i}"><div class="qhead"><span class="qnum">${it.n}</span><span class="small muted">Câu ${it.n} ${OS?'trên video':'trong đề gốc'}${it.label?' · '+esc(it.label):''}</span></div>
     ${it.type==='mcq'?`<div class="opts cam-opts">${Array.from({length:it.choices||3},(_,j)=>`<label class="opt"><input type="radio" name="cm${i}" value="${j}"><span><b>${L[j]}</b></span></label>`).join('')}</div>`:`<input type="text" name="cm${i}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ hoặc số cậu nghe được">`}
     <div class="yl-fb" hidden></div></div>`).join('')}
     <div class="row"><button class="btn" type="submit">Chấm bài nghe</button><span class="small muted cam-res"></span></div></form></div>
   <p class="small muted">${OS?`Video của kênh ${esc(R.yt_channel||'')} trên YouTube, trang chỉ nhúng để luyện nghe.`:'Đề, audio và đáp án: © Cambridge University Press & Assessment (đề mẫu công khai). Trang chỉ dẫn link tới đề gốc.'}</p>`;
  const btn=box.querySelector('.cam-play'),msg=box.querySelector('.cam-msg'),form=box.querySelector('.cam-form');
  const fsb=box.querySelector('.cam-fs');
  const focusOff=()=>{box.classList.remove('cam-focus');document.body.style.overflow='';if(fsb)fsb.textContent='⛶ Làm bài toàn màn hình';try{if(document.fullscreenElement===box)document.exitFullscreen()}catch(e){}};
  if(fsb){fsb.onclick=()=>{if(box.classList.contains('cam-focus')){focusOff();return}box.classList.add('cam-focus');document.body.style.overflow='hidden';fsb.textContent='✕ Thu nhỏ lại';try{if(box.requestFullscreen)box.requestFullscreen().catch(()=>{})}catch(e){}};
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&box.classList.contains('cam-focus'))focusOff()})}
  const label=()=>{if(graded){btn.textContent='▶ Nghe lại';btn.disabled=false;return}btn.textContent=MP===1?(plays?'Đã nghe xong':'▶ Bắt đầu nghe'):plays===0?'▶ Nghe lần 1':plays===1?'▶ Nghe lần 2':'Đã nghe 2 lần';btn.disabled=plays>=MP};
  const ended=()=>{if(!graded)plays++;msg.textContent=graded?'':plays>=MP?'Hết lượt nghe. Làm nốt rồi chấm bài nhé.':'Xong lần 1. Xem lại đáp án rồi nghe lần 2.';label()};
  const link=R.yt?`<a href="https://www.youtube.com/watch?v=${encodeURIComponent(R.yt)}&t=${R.start||0}s" target="_blank" rel="noopener">mở trên YouTube</a>`:`<a href="${esc(R.audio_mp3||'')}" target="_blank" rel="noopener">mở file nghe</a>`;
  btn.onclick=()=>{if(!graded&&plays>=MP)return;
    if(!useYt){const au=box.querySelector('.cam-audio');au.onended=ended;au.onerror=()=>{msg.innerHTML=`Chưa phát được, cậu ${link}.`};try{au.currentTime=0}catch(e){}au.play().then(()=>{msg.textContent='Đang phát…'}).catch(()=>{msg.innerHTML=`Chưa phát được, cậu ${link}.`});return}
    box.querySelector('.yl-cover').hidden=true;if(player&&player.seekTo){player.seekTo(R.start||0,true);player.playVideo();return}
    msg.textContent='Đang tải…';ytApi().then(YT=>{player=new YT.Player(box.querySelector('.cam-player'),{videoId:R.yt,playerVars:{start:R.start||0,end:R.end||undefined,autoplay:1,controls:graded?1:0,rel:0,modestbranding:1,playsinline:1,disablekb:graded?0:1,cc_load_policy:0,iv_load_policy:3,fs:0},
      events:{onReady:ev=>{msg.textContent='';ev.target.playVideo()},onStateChange:ev=>{if(ev.data===1){msg.textContent='Đang phát…';noCC(ev.target)}if(ev.data===0)ended()},onError:()=>{msg.innerHTML=`Video không phát được ở đây, cậu ${link}.`}}})}).catch(()=>{msg.innerHTML=`Chưa tải được trình phát, cậu ${link}.`})};
  form.addEventListener('change',e=>{const o=e.target.closest('.opt');if(o)o.parentElement.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x.querySelector('input').checked))});
  const show=ans=>{let c=0;R.items.forEach((it,i)=>{const q=form.querySelector(`.cam-q[data-i="${i}"]`);const v=ans[i];let ok;
      if(it.type==='mcq'){ok=+v===it.answer;q.querySelectorAll('.opt').forEach(o=>{const inp=o.querySelector('input');inp.disabled=true;if(v!=null&&+inp.value===+v)inp.checked=true;o.classList.toggle('sel',v!=null&&+inp.value===+v);if(+inp.value===it.answer)o.classList.add('right');else if(v!=null&&+inp.value===+v)o.classList.add('wrong')})}
      else{const inp=q.querySelector('input');inp.value=v||'';inp.disabled=true;ok=[it.answer].concat(it.accept||[]).map(normAns).includes(normAns(v));inp.classList.add(ok?'ok':'bad')}
      if(ok)c++;const fb=q.querySelector('.yl-fb');fb.hidden=false;fb.className='yl-fb '+(ok?'good':'bad');fb.innerHTML=`<b>${ok?'Đúng rồi.':'Chưa đúng.'}</b> Đáp án: <b>${it.type==='mcq'?L[it.answer]:esc(it.answer)}</b>. ${fmtVi(it.explain_vi||'')}`});
    const sb=form.querySelector('button[type=submit]');sb.style.display='none';form.querySelector('.cam-res').innerHTML=`Cậu đúng <b>${c}/${R.items.length}</b> câu.${R.key_url?` <a href="${esc(R.key_url)}" target="_blank" rel="noopener">Đáp án gốc của Cambridge</a>`:''}`;return c};
  form.onsubmit=e=>{e.preventDefault();if(graded)return;const ans=R.items.map((it,i)=>{if(it.type==='mcq'){const r=form.querySelector(`input[name="cm${i}"]:checked`);return r?+r.value:null}return form.querySelector(`input[name="cm${i}"]`).value.trim()});
    if(ans.some(a=>a==null||a==='')&&!form.dataset.w){form.dataset.w=1;form.querySelector('.cam-res').textContent='Còn câu trống. Bấm Chấm lần nữa để chấm luôn.';return}
    graded=true;const c=show(ans);label();msg.textContent='';onDone&&onDone({correct:c,total:R.items.length,answers:ans})};
  if(saved){show(saved.answers||[]);graded=true}
  label()}
function noCC(p){try{p.unloadModule('captions')}catch(e){}try{p.unloadModule('cc')}catch(e){}try{p.setOption('captions','track',{})}catch(e){}}
(function(){const st=document.createElement('style');st.textContent=`.yl-big .yl-cover[hidden]{display:none}
.cam-focus{position:fixed;inset:0;z-index:3000;margin:0;border-radius:0;overflow:auto;padding:12px 16px;background:var(--surface,#fff)}
.cam-focus>p{display:none}.cam-focus .cam-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);gap:18px;align-items:start}
.cam-focus .yl-stage{position:sticky;top:0}.cam-focus .yl-frame.yl-big{max-width:none}
.cam-focus .cam-form{max-height:calc(100vh - 110px);overflow:auto;margin-top:0;padding-right:6px}
@media (max-width:760px){.cam-focus .cam-body{grid-template-columns:1fr}.cam-focus .yl-stage{z-index:2;background:var(--surface,#fff);padding:12px 0 6px;top:-12px}.cam-focus .cam-form{max-height:none}.cam-focus .yl-ctl{flex-direction:row;flex-wrap:wrap;align-items:center}.cam-focus .yl-ctl .btn{min-height:40px;padding:6px 12px}}
.cam-form{display:flex;flex-direction:column;gap:10px;margin-top:8px}.cam-opts{display:flex;gap:10px;flex-wrap:wrap}.cam-opts .opt{min-width:64px;justify-content:center}.cam-q input[type=text]{max-width:280px}.yl-frame.yl-big{width:100%;max-width:880px}`;document.head.appendChild(st)})();
