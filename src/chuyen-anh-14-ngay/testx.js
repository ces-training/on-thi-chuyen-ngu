/* ===== Bài đầu vào / đầu ra: phần nghe bằng bản ghi thật (YouTube), phần 4 "Dạng đề của sở", phần 5 viết đoạn văn =====
   Hai bài là hai dạng song song bám nội dung 14 buổi (mỗi câu có obj, day). Phần 4–5 chấm riêng, không dùng để xếp mức:
   chỉ để so trước và sau 14 buổi. Dạng ở phần 4 lấy theo gói luyện riêng của sở (REG().pack), chốt lúc làm bài đầu vào
   (S.diag.locF) để bài đầu ra hỏi đúng các dạng đó. Kết quả: S[kind].loc = {fmt:{correct,total}}, S[kind].wr = {score,of,words,text,checks}. */
const TX_OBJ=['open_cloze','key_word','matching_headings','gap_text','true_false'];
function txFormats(){const TL=C.test_local||{};if(S.diag&&S.diag.locF)return S.diag.locF.filter(f=>TL[f]);
  const p=(REG().pack||[]).filter(f=>TX_OBJ.includes(f)&&TL[f]);const out=p.slice(0,2);
  ['open_cloze','key_word','matching_headings'].forEach(f=>{if(out.length<2&&TL[f]&&!out.includes(f))out.push(f)});return out}
const TX_KEY=k=>k==='diag'?'diagnostic':'final';
function txDone(kind){const r=S[kind];if(!r)return false;const F=txFormats();return F.every(f=>r.loc&&r.loc[f])&&!!r.wr}

/* --- phần nghe: một đoạn YouTube, nghe tối đa 2 lần khi làm bài --- */
function txYtHTML(kind){const R=TESTS[kind].listen_yt;if(!R)return '';
  return `<div class="t-yt" data-kind="${kind}"><div class="yl-head"><span class="yl-tag">BẢN GHI THẬT</span><b>${esc(R.title)}</b><span class="small muted">${esc(R.channel||'')}</span></div>
   <p class="small">${esc(R.intro_vi||'')} Đọc 5 câu hỏi bên dưới trước, rồi bấm nghe. Cậu được nghe <b>2 lần</b>.</p>
   <div class="yl-stage"><div class="yl-frame"><div class="tyt-player"></div><div class="yl-cover"><span style="font-size:2.2rem">🎧</span></div></div>
   <div class="yl-ctl"><button type="button" class="btn hi tyt-play">▶ Nghe lần 1</button><span class="small muted tyt-msg"></span></div></div></div>`}
function txWireYt(form,kind,state){const box=form.querySelector('.t-yt');const R=TESTS[kind].listen_yt;if(!box||!R)return;
  const done=!!S[kind];let plays=0,player=null;const btn=box.querySelector('.tyt-play'),msg=box.querySelector('.tyt-msg');
  const link=`<a href="https://www.youtube.com/watch?v=${encodeURIComponent(R.yt)}&t=${R.start||0}s" target="_blank" rel="noopener">mở trên YouTube</a>`;
  const label=()=>{if(done){btn.textContent='▶ Nghe lại';btn.disabled=false;return}btn.textContent=plays===0?'▶ Nghe lần 1':plays===1?'▶ Nghe lần 2':'Đã nghe 2 lần';btn.disabled=plays>=2};
  btn.onclick=()=>{if(!done&&plays>=2)return;box.querySelector('.yl-cover').hidden=true;
    if(player&&player.seekTo){player.seekTo(R.start||0,true);player.playVideo();return}
    msg.textContent='Đang tải…';ytApi().then(YT=>{player=new YT.Player(box.querySelector('.tyt-player'),{videoId:R.yt,playerVars:{start:R.start||0,end:R.end||undefined,autoplay:1,controls:done?1:0,rel:0,modestbranding:1,playsinline:1,disablekb:done?0:1,cc_load_policy:0},
      events:{onReady:ev=>{msg.textContent='';ev.target.playVideo()},onStateChange:ev=>{if(ev.data===1)msg.textContent='Đang phát…';if(ev.data===0){if(!done)plays++;msg.textContent=done?'':plays>=2?'Hết lượt nghe.':'Xong lần 1. Xem lại đáp án rồi nghe lần 2.';label()}},
        onError:()=>{state.err=true;msg.innerHTML=`Video không phát được ở đây, cậu ${link} rồi làm tiếp.`}}})}).catch(()=>{state.err=true;msg.innerHTML=`Chưa tải được trình phát, cậu ${link} rồi làm tiếp.`})};
  label()}

/* --- phần 4, 5: hiện sau khi nộp 45 câu --- */
function txExtrasHTML(kind){const r=S[kind];if(!r)return '';const F=txFormats();const W=((C.test_local||{}).writing||{})[TX_KEY(kind)];
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
function txSum(kind){const r=S[kind];if(!r)return {};return {lc:r.loc||null,lf:r.locF||null,w:r.wr?{s:r.wr.score,of:r.wr.of,n:r.wr.words}:null,bd:r.byDay||txByDay(kind)}}
/* --- so trước / sau theo từng buổi (mỗi câu của 45 câu gắn với một buổi qua it.day) --- */
function txByDay(kind){const r=S[kind];if(!r||!r.answers)return null;const out={};
  TESTS[kind].items.forEach(it=>{if(!it.day)return;const d=it.day;out[d]=out[d]||[0,0];out[d][1]++;if(isCorrect(it,r.answers[it.id]))out[d][0]++});return out}

(function(){const st=document.createElement('style');st.textContent=`
.t-yt{margin:8px 0 14px;padding:12px;border:2px dashed var(--line,#c9d6d8);border-radius:14px}
.t-yt .yl-frame .tyt-player,.t-yt .yl-frame iframe{position:absolute;inset:0;width:100%;height:100%}
.tx-ex h4{margin:16px 0 6px}.tx-done{margin:6px 0;padding:8px 12px;border-radius:10px;background:var(--good-bg,#E3F4EA)}
.tx-blk{margin:8px 0 14px;padding:10px;border:1.5px solid var(--line,#c9d6d8);border-radius:12px}
.tx-c{border:none;margin:10px 0;padding:0}.tx-c legend{font-weight:700;margin-bottom:4px}.tx-txt{white-space:pre-wrap}
`;document.head.appendChild(st)})();
