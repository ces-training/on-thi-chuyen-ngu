/* ===== Gói "Dạng bài riêng của đề {sở}" (content/web/local_pack.json → C.local_pack) =====
   Mỗi sở có một danh sách dạng cần bù (REG().pack, build.py → pack_for): bài luận, điền câu, Đúng/Sai/Không có thông tin,
   điền một từ, viết lại câu với từ cho sẵn, nối tiêu đề, thi nói. Trang rải các bài vào buổi 2–13 theo thứ tự ưu tiên
   (bài luận trước vì nặng điểm nhất), mỗi buổi 1–2 bài. Kết quả lưu ở S.days[n].local[key]. */
const LP_NAME={essay:'Bài luận',gap_text:'Điền câu vào bài đọc',true_false:'Đúng / Sai / Không có thông tin',open_cloze:'Điền một từ',key_word:'Viết lại câu với từ cho sẵn',matching_headings:'Nối tiêu đề',speaking:'Thi nói'};
const LP_ICON={essay:'memo',speaking:'television'};
const LP_HEAVY={essay:1,speaking:1};
function localPlan(){const P=C.local_pack||{};const RG=REG();const fm=(RG.pack||[]).filter(f=>P[f]&&P[f].length);
  // nơi chỉ viết đoạn văn (không có bài luận dài): đưa bài 150–200 từ lên đầu
  const ordOf=f=>{const ix=P[f].map((b,i)=>i);if(f==='essay'&&RG.cov&&!RG.cov.some(x=>x.k==='essay')){const s=ix.filter(i=>+String(P.essay[i].words||'').split(/[–-]/)[1]<=220);return s.concat(ix.filter(i=>!s.includes(i)))}return ix};
  const ords={};fm.forEach(f=>ords[f]=ordOf(f));
  const seq=[];for(let r=0;;r++){let more=false;fm.forEach(f=>{const i=ords[f][r];if(i!=null){seq.push({f,i,key:f+'-'+i});more=true}});if(!more)break}
  const N=12,days={};const put=(d,x)=>(days[d]=days[d]||[]).push(x);
  if(seq.length<=N)seq.forEach((x,j)=>put(2+Math.round(j*(N-1)/Math.max(1,seq.length-1)),x));
  else{seq.slice(0,N).forEach((x,j)=>put(2+j,x));
    // bài dư: xếp vào buổi ít bài nhất, không để hai bài nặng (luận, nói) chung một buổi, ưu tiên buổi muộn
    seq.slice(N).forEach(x=>{let best=null,bs=1e9;for(let d=13;d>=2;d--){const a=days[d]||[];const heavy=a.some(o=>LP_HEAVY[o.f]);const sc=a.length*10+(LP_HEAVY[x.f]&&heavy?100:0)+(heavy?3:0);if(sc<bs){bs=sc;best=d}}put(best,x)})}
  return days}
function localFor(n){return (localPlan()[n]||[]).map(x=>Object.assign({B:C.local_pack[x.f][x.i]},x))}
function lPackPill(n){const L=localFor(n);if(!L.length)return '';const r=(S.days[n]||{}).local||{};const k=L.filter(x=>r[x.key]).length;return `<span class="pill ${k>=L.length?'good':''}">${k>=L.length?'✓ ':''}Dạng riêng ${k}/${L.length}</span>`}
function lpTab(x,v){const t=esc(LP_NAME[x.f]||x.f);if(!v)return t;const self=LP_HEAVY[x.f];
  return t+` <span class="pill ${self||v.correct/v.total>=.6?'good':'warn'}">✓${self?(v.checks?' tự chấm '+v.correct+'/'+v.total:' đã nộp'):' '+v.correct+'/'+v.total}</span>`}
function localIntro(){const RG=REG();if(RG.slug==='ha-noi')return 'Những dạng hay gặp ở đề chuyên Anh Trường THPT Chuyên Ngoại ngữ và nhiều trường chuyên khác, mà đề Sở Hà Nội ít có. Luyện thêm để không bị bất ngờ.';
  if(!RG.cov)return `Sở ${esc(RG.name)} chưa công bố cấu trúc đề chuyên Anh. Tớ chọn những dạng hay gặp nhất trong đề chuyên Anh các tỉnh để cậu không bị bất ngờ.`;
  return `Đề chuyên Anh ${esc(RG.name)} có những dạng này mà khuôn đề Hà Nội ở Bước 3 ít luyện. Mỗi buổi có 1–2 bài, làm sau Bước 3.`}
function localCardHTML(n){const L=localFor(n);if(!L.length)return '';const r=(S.days[n]||{}).local||{};
  const tabs=L.map((x,i)=>`<button type="button" class="x-tab" data-l="${i}" aria-selected="${i===0}">${lpTab(x,r[x.key])}</button>`).join('');
  return `<div class="card" id="locCard"><h3 class="ih">${em(LP_ICON[L[0].f]||'bullseye')}Bước 3+ · Dạng bài riêng của đề ${esc(REG().name)}</h3><p class="small">${localIntro()}</p>${L.length>1?`<div class="x-tabs">${tabs}</div>`:''}<div id="locBox"></div></div>`}
function wireLocal(n,refresh){const L=localFor(n);const box=$('#locBox');if(!box||!L.length)return;
  const rec=()=>{const R=S.days[n]=S.days[n]||{};R.local=R.local||{};return R.local};
  const open=i=>{document.querySelectorAll('#locCard .x-tab').forEach(b=>b.setAttribute('aria-selected',+b.dataset.l===i?'true':'false'));const x=L[i];
    const done=res=>{rec()[x.key]=Object.assign({f:x.f,at:Date.now()},res);save();const tab=document.querySelector(`#locCard .x-tab[data-l="${i}"]`);
      if(tab)tab.innerHTML=lpTab(x,rec()[x.key]);refresh&&refresh()};
    if(x.f==='essay')renderEssay(box,x.B,rec()[x.key],done,()=>{const R=rec();R[x.key+'~']=box.querySelector('.lp-ta').value;save()},rec()[x.key+'~']);
    else if(x.f==='speaking')renderSpeaking(box,x.B,done);
    else renderExam(box,Object.assign({},x.B,{local:true}),null,r=>done({correct:r.correct,total:r.total}))};
  const t=$('#locCard .x-tabs');if(t)t.onclick=e=>{const b=e.target.closest('.x-tab');if(b)open(+b.dataset.l)};open(0)}

/* ----- bài luận: dàn ý, cụm từ, ô viết có đếm từ, nộp xong mới mở bài mẫu và bảng tự kiểm ----- */
const lpWc=s=>(String(s).trim().match(/[A-Za-zÀ-ỹ0-9'’-]+/g)||[]).length;
function renderEssay(box,E,saved,onDone,onDraft,draft){const [lo,hi]=String(E.words).split(/[–-]/).map(Number);const tr=curTrack();
  const txt=(saved&&saved.text)||draft||'';
  box.innerHTML=`<div class="x-intro"><p class="eyebrow">Bài luận · ${esc(E.words)} từ · ${esc(E.theme||'')}</p><h3 class="lp-prompt">${esc(E.prompt_en)}</h3><p class="small">${esc(E.prompt_vi)}</p>
    ${tr==='nen'?`<p class="x-tip small">Mức Nền tảng: lần đầu viết khoảng ${Math.round(lo*.7)} từ là tốt rồi. Bám dàn ý, mỗi đoạn 3–4 câu, rồi tăng dần ở các bài sau.</p>`:tr==='nang'?`<p class="x-tip small">Mức Nâng cao: thêm một câu thừa nhận ý kiến ngược lại rồi phản bác, và dùng ít nhất hai cấu trúc nâng cao (đảo ngữ, mệnh đề quan hệ rút gọn, câu điều kiện hỗn hợp).</p>`:''}</div>
    <details class="lp-d" open><summary><b>Dàn ý gợi ý</b></summary><ol class="lp-ol">${E.outline_vi.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>
    <details class="lp-d"><summary><b>Cụm từ nên dùng</b></summary><p class="lp-phr">${E.useful.map(x=>`<span class="pill">${esc(x)}</span>`).join(' ')}</p></details>
    <p class="small muted">Tự đặt giờ khoảng 30 phút như trong phòng thi. Viết xong bấm nộp để xem bài mẫu và tự chấm.</p>
    <textarea class="lp-ta" rows="12" spellcheck="false" placeholder="Viết bài của cậu ở đây…" aria-label="Bài luận của cậu">${esc(txt)}</textarea>
    <div class="row small lp-bar"><span class="lp-wc pill">0 từ</span><button type="button" class="btn hi lp-sub">Nộp bài, xem bài mẫu</button><span class="muted lp-msg"></span></div><div class="lp-after"></div>`;
  const ta=box.querySelector('.lp-ta'),wc=box.querySelector('.lp-wc'),msg=box.querySelector('.lp-msg');let tm=null;
  const upd=()=>{const w=lpWc(ta.value);wc.textContent=w+' từ';wc.className='lp-wc pill '+(w>=lo&&w<=hi+20?'good':w>hi+20?'warn':'')};upd();
  ta.oninput=()=>{upd();clearTimeout(tm);tm=setTimeout(()=>onDraft&&onDraft(),600)};
  const after=()=>{const ck=(saved&&saved.checks)||[];
    box.querySelector('.lp-after').innerHTML=`<div class="card lp-model"><h3>Bài mẫu (${lpWc(E.model)} từ)</h3>${E.model.split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}</div>
      <div class="lp-chk"><h3>Tự kiểm bài của cậu</h3><p class="small muted">So bài của cậu với bài mẫu, đánh dấu những điều cậu đã làm được.</p>${E.checklist_vi.map((c,i)=>`<label class="lp-ck"><input type="checkbox" data-c="${i}"${ck.includes(i)?' checked':''}><span>${esc(c)}</span></label>`).join('')}
      <div class="row"><button type="button" class="btn lp-save">Lưu tự chấm</button><span class="small muted lp-smsg"></span></div>
      <p class="small">Muốn cô chấm kỹ hơn: chép bài vào vở rồi gửi ảnh cùng bài giấy ở Bước 5.</p></div>`;
    box.querySelector('.lp-save').onclick=()=>{const c=[...box.querySelectorAll('.lp-chk input:checked')].map(x=>+x.dataset.c);onDone({correct:c.length,total:E.checklist_vi.length,checks:c,words:lpWc(ta.value),text:ta.value});saved={checks:c,text:ta.value};box.querySelector('.lp-smsg').textContent='Đã lưu ✓'}};
  box.querySelector('.lp-sub').onclick=()=>{const w=lpWc(ta.value);if(w<30){msg.textContent='Cậu viết thêm một chút (ít nhất 30 từ) rồi nộp nhé.';return}
    msg.textContent=w<lo?`Bài đang ngắn hơn yêu cầu (${lo}–${hi} từ). Lần sau cố thêm một ví dụ nhé.`:w>hi+20?'Bài hơi dài so với yêu cầu; trong phòng thi viết quá dài dễ bị trừ điểm.':'Độ dài vừa đúng yêu cầu.';
    if(!saved)onDone({correct:0,total:E.checklist_vi.length,words:w,text:ta.value});saved=saved||{text:ta.value};after()};
  if(saved&&saved.text)after()}

/* ----- thi nói: 1 phút chuẩn bị, 2 phút nói, ghi âm để nghe lại (nếu trình duyệt cho phép) ----- */
function renderSpeaking(box,P,onDone){
  box.innerHTML=`<div class="x-intro"><p class="eyebrow">Thi nói · ${Math.round(P.prep_sec/60)} phút chuẩn bị, ${Math.round(P.talk_sec/60)} phút nói</p><h3 class="lp-prompt">${esc(P.prompt_en)}</h3><p class="small">${esc(P.prompt_vi)}</p></div>
    <details class="lp-d" open><summary><b>Ý để nói</b></summary><ol class="lp-ol">${P.ideas.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>
    <details class="lp-d"><summary><b>Cụm từ nên dùng</b></summary><p class="lp-phr">${P.phrases.map(x=>`<span class="pill">${esc(x)}</span>`).join(' ')}</p></details>
    <div class="lp-sp"><div class="lp-clock" aria-live="polite">${lpClock(P.prep_sec)}</div><div class="lp-phase small muted">Sẵn sàng</div>
      <div class="row"><button type="button" class="btn hi lp-go">▶ Bắt đầu chuẩn bị</button><label class="small"><input type="checkbox" class="lp-rec" checked> Ghi âm phần nói để nghe lại</label></div><div class="lp-play"></div></div>
    <div class="lp-chk" hidden><h3>Tự chấm phần nói</h3>${P.rubric_vi.map((c,i)=>`<label class="lp-ck"><input type="checkbox" data-c="${i}"><span>${esc(c)}</span></label>`).join('')}<div class="row"><button type="button" class="btn lp-save">Lưu tự chấm</button><span class="small muted lp-smsg"></span></div></div>`;
  const clock=box.querySelector('.lp-clock'),ph=box.querySelector('.lp-phase'),go=box.querySelector('.lp-go'),chk=box.querySelector('.lp-chk');let tick=null,rec=null,chunks=[],stream=null;
  const stopRec=()=>{try{if(rec&&rec.state!=='inactive')rec.stop()}catch(e){}};
  const count=(sec,label,next)=>{let t=sec;clock.textContent=lpClock(t);ph.textContent=label;clearInterval(tick);tick=setInterval(()=>{if(!box.isConnected){clearInterval(tick);stopRec();return}t--;clock.textContent=lpClock(Math.max(0,t));if(t<=0){clearInterval(tick);next()}},1000)};
  const finish=()=>{stopRec();ph.textContent='Hết giờ. Nghe lại rồi tự chấm nhé.';go.disabled=false;go.textContent='↺ Làm lại';chk.hidden=false};
  const talk=async()=>{go.textContent='■ Nói xong';go.disabled=false;go.onclick=()=>{clearInterval(tick);finish();go.onclick=start};
    if(box.querySelector('.lp-rec').checked&&navigator.mediaDevices&&window.MediaRecorder){try{stream=stream||await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];rec=new MediaRecorder(stream);
      rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const url=URL.createObjectURL(new Blob(chunks,{type:rec.mimeType||'audio/webm'}));box.querySelector('.lp-play').innerHTML=`<p class="small">Bài nói của cậu:</p><audio controls src="${url}"></audio>`;try{stream.getTracks().forEach(t=>t.stop());stream=null}catch(e){}};rec.start()}
      catch(e){box.querySelector('.lp-play').innerHTML='<p class="small muted">Máy chưa cho dùng micro, nên lần này cậu nói to và nhờ bố mẹ hoặc bạn nghe cùng nhé.</p>'}}
    count(P.talk_sec,'Đang nói: nói liền mạch, đủ các ý',finish)};
  const start=()=>{go.disabled=false;go.textContent='▶ Nói luôn';chk.hidden=true;box.querySelector('.lp-play').innerHTML='';go.onclick=()=>{clearInterval(tick);talk()};count(P.prep_sec,'Đang chuẩn bị: ghi nhanh từ khoá ra giấy',talk)};
  go.onclick=start;
  box.querySelector('.lp-save').onclick=()=>{const c=[...chk.querySelectorAll('input:checked')].map(x=>+x.dataset.c);onDone({correct:c.length,total:P.rubric_vi.length,checks:c});box.querySelector('.lp-smsg').textContent='Đã lưu ✓'}}
const lpClock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

/* ----- thẻ "Độ khớp với đề" ở tab Thông tin thi ----- */
function coverageCardHTML(){const RG=REG();const P=C.local_pack||{};
  const ST={full:['good','Có trong 14 buổi'],pack:['good','Có trong gói riêng'],part:['warn','Luyện một phần']};
  const plan=localPlan();const dayOf={};Object.keys(plan).forEach(d=>plan[d].forEach(x=>{(dayOf[x.f]=dayOf[x.f]||[]).push(+d)}));
  const packLine=(RG.pack||[]).filter(f=>P[f]).map(f=>`<li><b>${esc(LP_NAME[f])}</b>: ${P[f].length} bài, ở buổi ${(dayOf[f]||[]).join(', ')}</li>`).join('');
  if(!RG.cov)return `<div class="card ix-cov"><h3>Chương trình 14 buổi khớp với đề ${esc(RG.name)} đến đâu?</h3>
    <p>Sở ${esc(RG.name)} chưa công bố cấu trúc đề chuyên Anh nên tớ chưa so được từng dạng. 14 buổi luyện đủ các dạng chung của đề chuyên Anh (ngữ pháp, từ vựng, cấu tạo từ, đọc hiểu, đọc điền, viết lại câu, nghe), và tớ thêm một gói dạng hay gặp ở các tỉnh:</p><ul>${packLine}</ul>
    <p class="small muted">Khi sở công bố đề mẫu, cô sẽ cập nhật cho khớp.</p></div>`;
  const rows=RG.cov.map(x=>{const s=ST[x.st]||ST.part;return `<tr><td>${esc(x.label)}</td><td class="num">${x.items||''}</td><td><span class="pill ${s[0]}">${s[1]}</span>${x.why?`<br><span class="small muted">${esc(x.why)}</span>`:''}</td></tr>`}).join('');
  const nP=RG.cov.filter(x=>x.st==='part').length;
  return `<div class="card ix-cov"><h3>Chương trình 14 buổi khớp với đề ${esc(RG.name)} đến đâu?</h3>
    <p>Tớ so từng phần của đề chuyên Anh ${esc(RG.name)} với những gì cậu sẽ luyện.${nP?` Có ${nP} phần mới luyện một phần: cậu nên làm thêm đề cũ của sở ở dạng đó.`:' Phần nào trong đề cũng có bài luyện tương ứng.'}</p>
    <div class="tbl-wrap"><table class="ix-tbl"><thead><tr><th>Phần trong đề</th><th>Số câu</th><th>Trong chương trình</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${packLine?`<p><b>Gói dạng bài riêng của đề ${esc(RG.name)}</b> (hiện trong mỗi buổi, ngay sau Bước 3):</p><ul>${packLine}</ul>`:''}
    ${RG.no_listen?`<p class="small">Đề ${esc(RG.name)} không có phần nghe, nên bài nghe trong mỗi buổi là phần tự chọn.</p>`:''}</div>`}

/* style */
(function(){const st=document.createElement('style');st.textContent=`
.lp-d{margin:8px 0;padding:8px 12px;border:1.5px dashed var(--line,#c9d6d8);border-radius:12px;background:var(--paper2,#fbfaf5)}
.lp-d summary{cursor:pointer}.lp-ol{margin:6px 0 2px 18px}.lp-ol li{margin:3px 0}.lp-phr .pill{margin:3px 2px;display:inline-block}
.lp-prompt{font-size:1.15rem;line-height:1.5}
.lp-ta{width:100%;box-sizing:border-box;font:inherit;font-size:1.05rem;line-height:1.6;padding:12px;border:2px solid var(--ink,#222);border-radius:12px;background:#fff;color:#1d1d1d;resize:vertical;min-height:240px}
.lp-bar{align-items:center;gap:10px;margin-top:6px}.lp-model p{line-height:1.65}.lp-chk{margin-top:10px}.lp-ck{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;margin:6px 0;border:1.5px solid var(--line,#c9d6d8);border-radius:12px;background:#fff;color:#1d1d1d;cursor:pointer}.lp-ck input{width:20px;height:20px;flex:none;margin-top:2px;accent-color:#16707e}.lp-ck:has(input:checked){border-color:#16707e;background:#E8F6F3}
.lp-sp{margin:10px 0;padding:12px;border:2px solid var(--ink,#222);border-radius:14px;text-align:center;background:#fff;color:#1d1d1d}
.lp-clock{font:700 2.6rem/1.1 'JetBrains Mono',monospace}.lp-sp .row{justify-content:center;align-items:center;gap:12px}.lp-play audio{width:100%;max-width:420px}
.ix-cov td .pill{white-space:nowrap}.ix-cov td.num{text-align:center}
.ls-opt{margin:4px 0 10px;padding:8px 12px;border-radius:10px;background:#FFF6D6;color:#4a3b00;border:1.5px solid #e9cf6a}
`;document.head.appendChild(st)})();
