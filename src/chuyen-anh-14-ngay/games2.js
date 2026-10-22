/* ===== Game bổ sung: đoán chữ, đập chuột, bắn bóng bay, tìm từ, ô chữ, mở hộp bí mật, nghe và viết, điền từ còn thiếu, vòng quay =====
   Dữ liệu từ vựng: spec.items = [{w, m, ex, ipa}] (từ, nghĩa, ví dụ, phiên âm). Câu ngữ pháp: spec.pool = [{kind:'tf'|'mcq', …}].
   spec.cfg chứa tham số theo mức (số câu, thời gian, gợi ý). */
Object.assign(G_ICON,{hangman:'red-apple',whack:'flexed-biceps',balloon:'party-popper',wordsearch:'brain',crossword:'puzzle-piece',openbox:'trophy',dictation:'television',missing:'writing-hand',wheel:'glowing-star'});
Object.assign(G_NAME,{hangman:'Đoán chữ',whack:'Đập chuột',balloon:'Bắn bóng bay',wordsearch:'Tìm từ',crossword:'Ô chữ',openbox:'Mở hộp bí mật',dictation:'Nghe và viết',missing:'Điền từ còn thiếu',wheel:'Vòng quay may mắn'});
const G_WORD=s=>/^[a-z]+$/i.test(s);
function gSay(text,rate){try{const sy=window.speechSynthesis;if(!sy||!window.SpeechSynthesisUtterance)return false;sy.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=rate||.85;const v=sy.getVoices().find(x=>/en-GB/i.test(x.lang))||sy.getVoices().find(x=>/^en/i.test(x.lang));if(v)u.voice=v;sy.speak(u);return true}catch(e){return false}}
function gGap(it){const re=new RegExp('\\b'+it.w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');return re.test(it.ex||'')?(it.ex||'').replace(re,'______'):null}

Object.assign(G_PLAY,{
  /* Đoán chữ: đọc nghĩa, đoán từng chữ cái; mỗi lần sai mất một quả bóng */
  hangman(spec,A){const L=spec.cfg||{};const qs=G_SHUF(spec.items.filter(x=>G_WORD(x.w))).slice(0,L.n||5);let k=0,sc=0;
    const next=()=>{if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k],w=q.w.toLowerCase();const lives0=L.lives||6;let lives=lives0;const got=new Set(L.firstLetter?[w[0]]:[]);
      const draw=()=>{const done=[...w].every(c=>got.has(c));A.stage.innerHTML=`<div class="g-hang"><p class="g-prog">Từ ${k+1}/${qs.length}</p><p class="g-clue">${esc(q.m)}</p>
        <div class="g-lives" aria-label="Còn ${lives} lượt">${'🎈'.repeat(lives)}<span class="lost">${'🎈'.repeat(lives0-lives)}</span></div>
        <div class="g-slots">${[...w].map(c=>`<span class="g-slot ${got.has(c)?'full':''}">${got.has(c)?c:''}</span>`).join('')}</div>
        <div class="g-keys">${'qwertyuiopasdfghjklzxcvbnm'.split('').map(c=>`<button type="button" class="g-key" data-c="${c}" ${got.has(c)||A.stage.dataset['x'+c]?'disabled':''}>${c}</button>`).join('')}</div><p class="g-fb small"></p></div>`;
        if(done){gBeep(true);sc++;A.add(1);A.stage.querySelector('.g-slots').classList.add('ok');k++;clean();setTimeout(next,800)}
        else if(lives<=0){gBeep(false);A.stage.querySelector('.g-fb').innerHTML='Từ đúng là <b>'+esc(w)+'</b>';k++;clean();setTimeout(next,1800)}};
      const clean=()=>{Object.keys(A.stage.dataset).forEach(x=>{if(x[0]==='x')delete A.stage.dataset[x]})};
      A.stage.onclick=e=>{const b=e.target.closest('.g-key');if(!b||b.disabled||lives<=0)return;const c=b.dataset.c;if(w.includes(c)){got.add(c);gBeep(true)}else{lives--;A.stage.dataset['x'+c]='1';gBeep(false)}draw()};
      draw()};next()},
  /* Đập chuột: đọc nghĩa, đập con chuột mang đúng từ */
  whack(spec,A){const L=spec.cfg||{};const pool=spec.items;const qs=G_SHUF(pool).slice(0,L.n||8);let k=0,sc=0,iv=null,to=null;const speed=L.speed||1000;
    A.stage.innerHTML=`<div class="g-whack"><p class="g-prog"></p><p class="g-clue"></p><div class="g-holes">${Array.from({length:9},(_,i)=>`<button type="button" class="g-hole" data-h="${i}"><span class="g-mole"></span></button>`).join('')}</div><p class="g-fb small"></p></div>`;
    const holes=[...A.stage.querySelectorAll('.g-hole')];
    const round=()=>{clearInterval(iv);clearTimeout(to);holes.forEach(h=>{h.classList.remove('up','hit','miss')});if(k>=qs.length){return A.finish(sc,qs.length)}
      const q=qs[k];const opts=[q,...G_SHUF(pool.filter(x=>x!==q)).slice(0,3)];A.stage.querySelector('.g-prog').textContent=`Lượt ${k+1}/${qs.length}`;A.stage.querySelector('.g-clue').textContent=q.m;A.stage.querySelector('.g-fb').textContent='';
      const pop=()=>{holes.forEach(h=>{if(!h.classList.contains('hit'))h.classList.remove('up')});const free=G_SHUF(holes).slice(0,2);free.forEach((h,j)=>{const o=j===0&&Math.random()<.55?q:opts[1+Math.floor(Math.random()*3)];h.querySelector('.g-mole').textContent=o.w;h.dataset.ok=o===q?'1':'0';h.classList.add('up')})};
      pop();iv=setInterval(pop,speed);to=setTimeout(()=>{clearInterval(iv);A.stage.querySelector('.g-fb').innerHTML='⏰ Hết giờ: <b>'+esc(q.w)+'</b>';gBeep(false);k++;setTimeout(round,1300)},(L.roundMs||7000))};
    A.stage.querySelector('.g-holes').onclick=e=>{const h=e.target.closest('.g-hole');if(!h||!h.classList.contains('up'))return;
      if(h.dataset.ok==='1'){clearInterval(iv);clearTimeout(to);h.classList.add('hit');gBeep(true);sc++;A.add(1);A.stage.querySelector('.g-fb').textContent='✓ Trúng rồi!';k++;setTimeout(round,700)}
      else{h.classList.add('miss');gBeep(false);setTimeout(()=>h.classList.remove('miss','up'),300)}};
    round()},
  /* Bắn bóng bay: bóng bay lên mang 4 lựa chọn, chạm quả đúng trước khi nó bay mất */
  balloon(spec,A){const L=spec.cfg||{};const qs=G_SHUF(spec.items).slice(0,L.n||8);let k=0,sc=0,to=null;const dur=L.dur||7;
    const next=()=>{clearTimeout(to);if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k];const gap=gGap(q);const prompt=gap&&L.useGap!==false&&Math.random()<.5?gap:q.m;
      const opts=G_SHUF([q,...G_SHUF(spec.items.filter(x=>x!==q)).slice(0,3)]);const cols=['#2638C4','#E83FA4','#F8551A','#579F6C'];
      A.stage.innerHTML=`<div class="g-bal"><p class="g-prog">Lượt ${k+1}/${qs.length}</p><p class="g-q">${esc(prompt)}</p><div class="g-sky">${opts.map((o,j)=>`<button type="button" class="g-ball" data-ok="${o===q?1:0}" style="left:${4+j*24}%;animation-duration:${dur+j*.6}s;animation-delay:${j*.25}s;--c:${cols[j]}"><span>${esc(o.w)}</span></button>`).join('')}</div><p class="g-fb small"></p></div>`;
      to=setTimeout(()=>{A.stage.querySelector('.g-fb').innerHTML='Bóng bay mất rồi! Đáp án: <b>'+esc(q.w)+'</b>';gBeep(false);k++;setTimeout(next,1500)},(dur+1.4)*1000);
      A.stage.querySelector('.g-sky').onclick=e=>{const b=e.target.closest('.g-ball');if(!b||b.classList.contains('pop'))return;b.classList.add('pop');
        if(b.dataset.ok==='1'){clearTimeout(to);gBeep(true);sc++;A.add(1);A.stage.querySelector('.g-fb').textContent='✓ Bùm! Chính xác.';A.stage.querySelectorAll('.g-ball').forEach(x=>x.style.animationPlayState='paused');k++;setTimeout(next,800)}
        else{gBeep(false);b.classList.add('bad')}}};
    next()},
  /* Tìm từ: chạm chữ cái đầu rồi chữ cái cuối của từ trong bảng */
  wordsearch(spec,A){const L=spec.cfg||{};const words=G_SHUF(spec.items.filter(x=>G_WORD(x.w)&&x.w.length<=(L.max||9))).slice(0,L.n||6).map(x=>({w:x.w.toUpperCase(),m:x.m}));
    const N=Math.max(L.size||9,...words.map(x=>x.w.length+1));const g=Array.from({length:N},()=>Array(N).fill(''));const dirs=L.diag?[[0,1],[1,0],[1,1]]:[[0,1],[1,0]];const placed=[];
    words.forEach(o=>{for(let t=0;t<200;t++){const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)];const r=Math.floor(Math.random()*(N-(dr?o.w.length:0)+ (dr?0:0)));const c=Math.floor(Math.random()*(N-(dc?o.w.length:0)));
      if(r+dr*(o.w.length-1)>=N||c+dc*(o.w.length-1)>=N)continue;let ok=true;for(let i=0;i<o.w.length;i++){const x=g[r+dr*i][c+dc*i];if(x&&x!==o.w[i]){ok=false;break}}
      if(!ok)continue;for(let i=0;i<o.w.length;i++)g[r+dr*i][c+dc*i]=o.w[i];placed.push(Object.assign(o,{r,c,dr,dc}));return}});
    const AB='ABCDEFGHIKLMNOPRSTUW';for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!g[r][c])g[r][c]=AB[Math.floor(Math.random()*AB.length)];
    let start=null,found=0;
    A.stage.innerHTML=`<div class="g-ws"><div class="g-grid" style="grid-template-columns:repeat(${N},1fr)">${g.map((row,r)=>row.map((ch,c)=>`<button type="button" class="g-cell" data-r="${r}" data-c="${c}">${ch}</button>`).join('')).join('')}</div>
      <ol class="g-clues">${placed.map((o,i)=>`<li data-w="${i}">${esc(o.m)}${L.showWords?` <b>(${o.w.length} chữ)</b>`:''}</li>`).join('')}</ol><p class="small muted">Chạm chữ cái ĐẦU rồi chữ cái CUỐI của từ. Từ nằm ngang${L.diag?', dọc hoặc chéo':' hoặc dọc'}.</p><div class="row" style="justify-content:center"><button type="button" class="btn ghost g-giveup">Xong, xem đáp án</button></div></div>`;
    const cell=(r,c)=>A.stage.querySelector(`.g-cell[data-r="${r}"][data-c="${c}"]`);
    const end=()=>{placed.forEach(o=>{for(let i=0;i<o.w.length;i++)cell(o.r+o.dr*i,o.c+o.dc*i).classList.add(o.f?'ok':'show')});setTimeout(()=>A.finish(found,placed.length),1500)};
    A.stage.querySelector('.g-giveup').onclick=end;
    A.stage.querySelector('.g-grid').onclick=e=>{const b=e.target.closest('.g-cell');if(!b)return;const r=+b.dataset.r,c=+b.dataset.c;
      if(!start){start={r,c,b};b.classList.add('sel');return}start.b.classList.remove('sel');
      const hit=placed.find(o=>!o.f&&o.r===start.r&&o.c===start.c&&o.r+o.dr*(o.w.length-1)===r&&o.c+o.dc*(o.w.length-1)===c);start=null;
      if(hit){hit.f=true;found++;A.add(1);gBeep(true);for(let i=0;i<hit.w.length;i++)cell(hit.r+hit.dr*i,hit.c+hit.dc*i).classList.add('ok');const li=A.stage.querySelector(`.g-clues li[data-w="${placed.indexOf(hit)}"]`);li.classList.add('ok');li.insertAdjacentHTML('beforeend',' → <b>'+esc(hit.w.toLowerCase())+'</b>');if(found===placed.length)setTimeout(()=>A.finish(found,placed.length),900)}
      else{gBeep(false);b.classList.add('bad');setTimeout(()=>b.classList.remove('bad'),400)}}},
  /* Ô chữ: điền từ theo nghĩa, các từ giao nhau */
  crossword(spec,A){const L=spec.cfg||{};const ws=G_SHUF(spec.items.filter(x=>G_WORD(x.w)&&x.w.length>=3&&x.w.length<=11)).slice(0,L.n||6).map(x=>({w:x.w.toUpperCase(),m:x.m})).sort((a,b)=>b.w.length-a.w.length);
    const P=[],cells=new Map();const key=(r,c)=>r+','+c;
    const fits=(w,r,c,d)=>{for(let i=0;i<w.length;i++){const rr=r+(d?i:0),cc=c+(d?0:i);const x=cells.get(key(rr,cc));if(x&&x!==w[i])return false;
        if(!x){const n1=d?key(rr,cc-1):key(rr-1,cc),n2=d?key(rr,cc+1):key(rr+1,cc);if(cells.has(n1)||cells.has(n2))return false}}
      const b=d?key(r-1,c):key(r,c-1),a=d?key(r+w.length,c):key(r,c+w.length);return !cells.has(b)&&!cells.has(a)};
    const put=(o,r,c,d)=>{for(let i=0;i<o.w.length;i++)cells.set(key(r+(d?i:0),c+(d?0:i)),o.w[i]);P.push(Object.assign(o,{r,c,d}))};
    if(ws.length)put(ws[0],0,0,0);
    ws.slice(1).forEach(o=>{let done=false;for(const p of G_SHUF(P)){if(done)break;for(let i=0;i<p.w.length&&!done;i++)for(let j=0;j<o.w.length&&!done;j++){if(p.w[i]!==o.w[j])continue;const d=p.d?0:1;const r=p.r+(p.d?i:0)-(d?j:0),c=p.c+(p.d?0:i)-(d?0:j);if(fits(o.w,r,c,d)){put(o,r,c,d);done=true}}}});
    let r0=1e9,c0=1e9,r1=-1e9,c1=-1e9;cells.forEach((v,k2)=>{const [r,c]=k2.split(',').map(Number);r0=Math.min(r0,r);c0=Math.min(c0,c);r1=Math.max(r1,r);c1=Math.max(c1,c)});
    const R=r1-r0+1,Cn=c1-c0+1;P.sort((a,b)=>a.r-b.r||a.c-b.c);const num=new Map();let nn=0;P.forEach(p=>{const k2=key(p.r,p.c);if(!num.has(k2))num.set(k2,++nn);p.n=num.get(k2)});
    let html='';for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const k2=key(r,c);html+=cells.has(k2)?`<span class="g-xc">${num.has(k2)?`<i>${num.get(k2)}</i>`:''}<input maxlength="1" data-k="${k2}" autocomplete="off" autocapitalize="off" aria-label="ô ${r},${c}" ${L.firstLetter&&P.some(p=>key(p.r,p.c)===k2)?`value="${cells.get(k2).toLowerCase()}"`:''}></span>`:'<span class="g-xe"></span>'}
    const cl=d=>P.filter(p=>p.d===d).map(p=>`<li><b>${p.n}.</b> ${esc(p.m)} <span class="muted">(${p.w.length})</span></li>`).join('');
    A.stage.innerHTML=`<div class="g-cw"><div class="g-cwgrid" style="grid-template-columns:repeat(${Cn},minmax(0,34px))">${html}</div><div class="g-cwclues"><div><b>Hàng ngang</b><ul>${cl(0)}</ul></div><div><b>Hàng dọc</b><ul>${cl(1)}</ul></div></div><div class="row" style="justify-content:center"><button type="button" class="btn g-cwcheck">Kiểm tra ô chữ</button></div><p class="g-fb small"></p></div>`;
    let dir=0;A.stage.querySelector('.g-cwgrid').addEventListener('input',e=>{const inp=e.target;const [r,c]=inp.dataset.k.split(',').map(Number);if(!inp.value)return;
      const nx=A.stage.querySelector(`input[data-k="${dir?key(r+1,c):key(r,c+1)}"]`)||A.stage.querySelector(`input[data-k="${dir?key(r,c+1):key(r+1,c)}"]`);if(nx)nx.focus()});
    A.stage.querySelector('.g-cwgrid').addEventListener('focusin',e=>{const inp=e.target;if(inp.tagName!=='INPUT')return;const [r,c]=inp.dataset.k.split(',').map(Number);dir=cells.has(key(r,c+1))||cells.has(key(r,c-1))?0:1});
    A.stage.querySelector('.g-cwcheck').onclick=()=>{let ok=0;P.forEach(p=>{let good=true;for(let i=0;i<p.w.length;i++){const inp=A.stage.querySelector(`input[data-k="${key(p.r+(p.d?i:0),p.c+(p.d?0:i))}"]`);if((inp.value||'').toUpperCase()!==p.w[i])good=false}if(good)ok++});
      A.stage.querySelectorAll('.g-cwgrid input').forEach(inp=>{const v=(inp.value||'').toUpperCase();inp.classList.toggle('ok',v===cells.get(inp.dataset.k));inp.classList.toggle('bad',!!v&&v!==cells.get(inp.dataset.k))});
      gBeep(ok===P.length);if(ok===P.length||A.stage.dataset.tried){A.add(ok);setTimeout(()=>A.finish(ok,P.length),1200);if(ok<P.length)A.stage.querySelector('.g-fb').innerHTML='Đáp án: '+P.map(p=>p.n+'. '+esc(p.w.toLowerCase())).join(' · ')}
      else{A.stage.dataset.tried='1';A.stage.querySelector('.g-fb').textContent=`Đúng ${ok}/${P.length} từ. Sửa các ô đỏ rồi bấm kiểm tra lần nữa.`}}},
  /* Mở hộp bí mật: mỗi hộp là một câu hỏi, vài hộp có thưởng */
  openbox(spec,A){const L=spec.cfg||{};const pool=G_SHUF(spec.pool).slice(0,L.n||10);const boxes=G_SHUF(pool.map(q=>({q})).concat([{bonus:'x2'},{bonus:'+2'}]));let sc=0,opened=0,dbl=false;
    const grid=()=>`<div class="g-boxes">${boxes.map((b,i)=>`<button type="button" class="g-boxi ${b.open?'open':''}" data-b="${i}" ${b.open?'disabled':''}>${b.open?(b.ok===true?'✓':b.ok===false?'✗':b.bonus==='x2'?'×2':'+2'):i+1}</button>`).join('')}</div>`;
    const draw=(msg)=>{A.stage.innerHTML=`<div class="g-ob"><p class="g-prog">Chọn một hộp bất kỳ${dbl?' · câu tới được nhân đôi điểm!':''}</p>${grid()}<p class="g-fb small">${msg||''}</p></div>`;
      A.stage.querySelector('.g-boxes').onclick=e=>{const b=e.target.closest('.g-boxi');if(!b||b.disabled)return;open(+b.dataset.b)}};
    const open=i=>{const B=boxes[i];B.open=true;if(B.bonus){if(B.bonus==='x2'){dbl=true;draw('🎁 Hộp nhân đôi: câu tiếp theo được ×2 điểm!')}else{A.add(2);draw('🎁 Hộp quà: +2 điểm!')}gBeep(true);return}
      const q=B.q;const fin=ok=>{B.ok=ok;opened++;if(ok){sc++;A.add(dbl?2:1)}dbl=false;gBeep(ok);setTimeout(()=>{if(opened>=pool.length)A.finish(sc,pool.length);else draw(ok?'✓ Đúng rồi!':'✗ Chưa đúng.')},ok?700:1800)};
      if(q.kind==='tf'){A.stage.innerHTML=`<div class="g-tf"><p class="g-prog">Hộp ${i+1} · Câu này đúng hay sai?</p><p class="g-q">${esc(q.s)}</p><div class="g-tfb"><button type="button" class="g-yes" data-v="1">✓ Đúng</button><button type="button" class="g-no" data-v="0">✗ Sai</button></div><p class="g-fb small"></p></div>`;
        A.stage.querySelector('.g-tfb').onclick=e=>{const b=e.target.closest('button');if(!b)return;A.stage.querySelectorAll('.g-tfb button').forEach(x=>x.disabled=true);const ok=(+b.dataset.v===1)===q.ok;A.stage.querySelector('.g-fb').innerHTML=(ok?'✓ ':'✗ ')+(q.ok?'Câu này đúng.':'Sửa: <b>'+esc(q.fix)+'</b>');fin(ok)}}
      else{const opts=G_SHUF(q.options.map((t,j)=>({t,ok:j===q.answer})));A.stage.innerHTML=`<div class="g-quiz"><p class="g-prog">Hộp ${i+1}</p><p class="g-q">${esc(q.q)}</p><div class="g-opts">${opts.map((o,j)=>`<button type="button" class="g-opt" data-j="${j}">${esc(o.t)}</button>`).join('')}</div><p class="g-fb small"></p></div>`;
        A.stage.querySelector('.g-opts').onclick=e=>{const b=e.target.closest('.g-opt');if(!b)return;const bs=A.stage.querySelectorAll('.g-opt');bs.forEach((x,j)=>{x.disabled=true;if(opts[j].ok)x.classList.add('ok');else if(x===b)x.classList.add('bad')});const ok=opts[+b.dataset.j].ok;A.stage.querySelector('.g-fb').innerHTML=q.explain?esc(q.explain):'';fin(ok)}}};
    draw()},
  /* Nghe và viết: máy đọc từ, em gõ lại cho đúng chính tả */
  dictation(spec,A){const L=spec.cfg||{};const qs=G_SHUF(spec.items.filter(x=>G_WORD(x.w))).slice(0,L.n||6);let k=0,sc=0;
    const next=()=>{if(k>=qs.length)return A.finish(sc,qs.length);const q=qs[k];const w=q.w.toLowerCase();let tries=0;
      A.stage.innerHTML=`<div class="g-dict"><p class="g-prog">Từ ${k+1}/${qs.length}</p><div class="row" style="justify-content:center"><button type="button" class="btn g-say">🔊 Nghe từ</button><button type="button" class="btn ghost g-sayex">Nghe trong câu</button></div>
        ${L.hintMeaning?`<p class="small muted" style="text-align:center">Gợi ý nghĩa: ${esc(q.m)}</p>`:''}${L.firstLetter?`<p class="small muted" style="text-align:center">Bắt đầu bằng "<b>${esc(w[0])}</b>", có ${w.length} chữ cái</p>`:''}
        <input class="g-type" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ em nghe được" aria-label="Gõ từ em nghe được"><div class="row" style="justify-content:center"><button type="button" class="btn hi g-ok">Kiểm tra</button></div><p class="g-fb small"></p></div>`;
      const say=()=>{if(!gSay(w,.8))A.stage.querySelector('.g-fb').textContent='Máy này không đọc được: nghĩa của từ là "'+q.m+'".'};
      A.stage.querySelector('.g-say').onclick=say;A.stage.querySelector('.g-sayex').onclick=()=>gSay(q.ex||w,.9);setTimeout(say,300);
      const inp=A.stage.querySelector('.g-type');inp.onkeydown=e=>{if(e.key==='Enter')A.stage.querySelector('.g-ok').click()};
      A.stage.querySelector('.g-ok').onclick=()=>{const v=inp.value.trim().toLowerCase();if(!v)return;tries++;const ok=v===w;gBeep(ok);inp.classList.toggle('ok',ok);inp.classList.toggle('bad',!ok);
        if(ok){const p=tries===1?1:.5;sc+=p;A.add(p);A.stage.querySelector('.g-fb').innerHTML='✓ Chính xác! <b>'+esc(w)+'</b> = '+esc(q.m);k++;setTimeout(next,1100)}
        else if(tries>=2){A.stage.querySelector('.g-fb').innerHTML='Từ đúng: <b>'+esc(w)+'</b> ('+esc(q.m)+')';k++;setTimeout(next,2000)}
        else A.stage.querySelector('.g-fb').textContent='Chưa đúng chính tả, nghe lại và thử lần 2.'}};
    next()},
  /* Điền từ còn thiếu: chạm từ trong khung rồi chạm chỗ trống */
  missing(spec,A){const L=spec.cfg||{};const its=G_SHUF(spec.items.filter(x=>gGap(x))).slice(0,L.n||5);const extra=G_SHUF(spec.items.filter(x=>!its.includes(x))).slice(0,L.extra||1);
    const bank=G_SHUF(its.concat(extra).map(x=>x.w));const fill=Array(its.length).fill(null);let sel=null;
    const draw=(checked)=>{A.stage.innerHTML=`<div class="g-miss"><div class="g-bank">${bank.map((w,i)=>`<button type="button" class="g-chip ${sel===i?'sel':''}" data-i="${i}" ${fill.includes(i)||checked?'disabled':''}>${esc(w)}</button>`).join('')}</div>
      <ol class="g-msent">${its.map((x,j)=>{const parts=gGap(x).split('______');return `<li>${esc(parts[0])}<button type="button" class="g-blank ${checked?(fill[j]!==null&&bank[fill[j]]===x.w?'ok':'bad'):''}" data-j="${j}" ${checked?'disabled':''}>${fill[j]!==null?esc(bank[fill[j]]):'______'}</button>${esc(parts.slice(1).join('______'))}${checked&&!(fill[j]!==null&&bank[fill[j]]===x.w)?` <span class="small">→ <b>${esc(x.w)}</b></span>`:''}</li>`}).join('')}</ol>
      ${checked?'':'<div class="row" style="justify-content:center"><button type="button" class="btn g-mcheck">Kiểm tra</button></div>'}<p class="small muted">Chạm một từ trong khung, rồi chạm chỗ trống. Chạm chỗ đã điền để bỏ ra.${extra.length?' Có '+extra.length+' từ thừa.':''}</p></div>`};
    draw();A.stage.onclick=e=>{const c=e.target.closest('.g-chip'),b=e.target.closest('.g-blank');
      if(c&&!c.disabled){sel=+c.dataset.i;const empty=fill.indexOf(null);if(L.autoFill&&empty>=0){fill[empty]=sel;sel=null}draw();return}
      if(b&&!b.disabled){const j=+b.dataset.j;if(fill[j]!==null){fill[j]=null}else if(sel!==null){fill[j]=sel;sel=null}draw();return}
      if(e.target.closest('.g-mcheck')){let ok=0;its.forEach((x,j)=>{if(fill[j]!==null&&bank[fill[j]]===x.w)ok++});gBeep(ok===its.length);A.add(ok);draw(true);setTimeout(()=>A.finish(ok,its.length),2200)}}},
  /* Vòng quay may mắn: quay vòng, trả lời thử thách vừa quay được */
  wheel(spec,A){const L=spec.cfg||{};const spins=L.n||6;let k=0,sc=0,tot=0,dbl=false,angle=0;const voc=spec.items,tf=(spec.pool||[]).filter(x=>x.kind==='tf');
    const seg=[{t:'Nghĩa của từ',k:'mean'},{t:'Chính tả',k:'spell'},{t:'Đúng hay sai',k:'tf'},{t:'×2',k:'x2'},{t:'Nghĩa của từ',k:'mean'},{t:'Chính tả',k:'spell'},{t:'Đúng hay sai',k:'tf'},{t:'+1',k:'p1'}];
    const cols=['#2638C4','#FCC539','#E83FA4','#579F6C','#2638C4','#FCC539','#E83FA4','#F8551A'];
    const svg=()=>`<svg viewBox="-110 -110 220 220" class="g-wsvg" style="transform:rotate(${angle}deg)">${seg.map((s,i)=>{const a0=i*45-90-22.5,a1=a0+45,r=100,p=(a)=>[r*Math.cos(a*Math.PI/180),r*Math.sin(a*Math.PI/180)];const [x0,y0]=p(a0),[x1,y1]=p(a1);const tx=62*Math.cos((a0+22.5)*Math.PI/180),ty=62*Math.sin((a0+22.5)*Math.PI/180);
      return `<path d="M0 0L${x0.toFixed(1)} ${y0.toFixed(1)}A100 100 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${cols[i]}" stroke="#151521" stroke-width="2"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${s.t.length>4?10:16}" font-weight="800" fill="${cols[i]==='#FCC539'?'#151521':'#fff'}" transform="rotate(${a0+22.5+90} ${tx.toFixed(1)} ${ty.toFixed(1)})">${s.t}</text>`}).join('')}<circle r="14" fill="#fff" stroke="#151521" stroke-width="3"/></svg>`;
    const home=(msg)=>{if(k>=spins)return A.finish(sc,Math.max(tot,1));A.stage.innerHTML=`<div class="g-wheel"><p class="g-prog">Lượt quay ${k+1}/${spins}${dbl?' · lượt này ×2!':''}</p><div class="g-wwrap"><div class="g-wptr">▼</div>${svg()}</div><div class="row" style="justify-content:center"><button type="button" class="btn hi g-spin">Quay!</button></div><p class="g-fb small">${msg||''}</p></div>`;
      A.stage.querySelector('.g-spin').onclick=e=>{e.target.disabled=true;const i=Math.floor(Math.random()*8);angle+=1080+((360-i*45)-(angle%360)+360)%360;const el=A.stage.querySelector('.g-wsvg');el.style.transition='transform 2.2s cubic-bezier(.2,.8,.2,1)';el.style.transform=`rotate(${angle}deg)`;setTimeout(()=>play(seg[i]),2300)}};
    const fin=ok=>{tot++;if(ok){sc++;A.add(dbl?2:1)}dbl=false;gBeep(ok);k++;setTimeout(()=>home(ok?'✓ Đúng!':'✗ Chưa đúng.'),ok?800:1900)};
    const play=s=>{if(s.k==='x2'){dbl=true;k++;gBeep(true);return home('🎁 Lượt sau được nhân đôi điểm!')}if(s.k==='p1'){A.add(1);k++;gBeep(true);return home('🎁 Được tặng 1 điểm!')}
      if(s.k==='tf'&&tf.length){const q=tf[Math.floor(Math.random()*tf.length)];A.stage.innerHTML=`<div class="g-tf"><p class="g-prog">Đúng hay sai?</p><p class="g-q">${esc(q.s)}</p><div class="g-tfb"><button type="button" class="g-yes" data-v="1">✓ Đúng</button><button type="button" class="g-no" data-v="0">✗ Sai</button></div><p class="g-fb small"></p></div>`;
        A.stage.querySelector('.g-tfb').onclick=e=>{const b=e.target.closest('button');if(!b)return;A.stage.querySelectorAll('.g-tfb button').forEach(x=>x.disabled=true);const ok=(+b.dataset.v===1)===q.ok;A.stage.querySelector('.g-fb').innerHTML=q.ok?'Câu này đúng.':'Sửa: <b>'+esc(q.fix)+'</b>';fin(ok)};return}
      const q=voc[Math.floor(Math.random()*voc.length)];
      if(s.k==='spell'&&G_WORD(q.w)){A.stage.innerHTML=`<div class="g-dict"><p class="g-prog">Chính tả: gõ từ có nghĩa là</p><p class="g-clue">${esc(q.m)}</p>${L.firstLetter?`<p class="small muted" style="text-align:center">Bắt đầu bằng "${esc(q.w[0])}", ${q.w.length} chữ cái</p>`:''}<input class="g-type" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Gõ từ"><div class="row" style="justify-content:center"><button type="button" class="btn hi g-ok">Kiểm tra</button></div><p class="g-fb small"></p></div>`;
        const inp=A.stage.querySelector('.g-type');inp.focus();inp.onkeydown=e=>{if(e.key==='Enter')A.stage.querySelector('.g-ok').click()};A.stage.querySelector('.g-ok').onclick=e=>{e.target.disabled=true;const ok=inp.value.trim().toLowerCase()===q.w.toLowerCase();A.stage.querySelector('.g-fb').innerHTML='Đáp án: <b>'+esc(q.w)+'</b>';fin(ok)};return}
      const opts=G_SHUF([q,...G_SHUF(voc.filter(x=>x!==q)).slice(0,3)]);A.stage.innerHTML=`<div class="g-quiz"><p class="g-prog">Từ nào có nghĩa là</p><p class="g-q">${esc(q.m)}</p><div class="g-opts">${opts.map((o,j)=>`<button type="button" class="g-opt" data-j="${j}">${esc(o.w)}</button>`).join('')}</div><p class="g-fb small"></p></div>`;
      A.stage.querySelector('.g-opts').onclick=e=>{const b=e.target.closest('.g-opt');if(!b)return;A.stage.querySelectorAll('.g-opt').forEach((x,j)=>{x.disabled=true;if(opts[j]===q)x.classList.add('ok');else if(x===b)x.classList.add('bad')});fin(opts[+b.dataset.j]===q)}};
    home()}
});

/* ===== Game vận động: nghiêng đầu hoặc dịch người sang trái/phải để chọn đáp án (camera của máy) =====
   Hình ảnh camera chỉ được xử lý ngay trên máy (MediaPipe Face Landmarker chạy trong trình duyệt), không gửi đi đâu.
   Không có camera thì chơi bằng nút bấm hoặc phím mũi tên ← →. */
Object.assign(G_ICON,{motion:'flexed-biceps'});Object.assign(G_NAME,{motion:'Game vận động'});
const MP_VER='0.10.14';let MP_LM=null;
async function mpLoad(){if(MP_LM)return MP_LM;const vis=await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/vision_bundle.mjs`);
  const fs=await vis.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/wasm`);
  MP_LM=await vis.FaceLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numFaces:1});return MP_LM}
G_PLAY.motion=function(spec,A){const L=spec.cfg||{};const tilt=spec.mode!=='lean';const qs=G_SHUF(spec.items).slice(0,L.mn||8);const secs=L.mtime||8;
  let k=0,sc=0,stream=null,raf=0,base=null,calib=[],state='idle',hold=null,tm=null,left=secs,video=null;
  const stop=()=>{cancelAnimationFrame(raf);clearInterval(tm);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;document.removeEventListener('keydown',onKey)};
  const onKey=e=>{if(state!=='q')return;if(e.key==='ArrowLeft')choose('L');if(e.key==='ArrowRight')choose('R')};
  const how=tilt?'Nghiêng đầu sang TRÁI để chọn đáp án bên trái, nghiêng sang PHẢI để chọn đáp án bên phải. Xong mỗi câu, đưa đầu về thẳng.':'Bước người sang TRÁI hoặc PHẢI (cả đầu ra khỏi giữa khung hình) để chọn đáp án bên đó. Xong mỗi câu, quay về giữa.';
  A.stage.innerHTML=`<div class="g-mo"><div class="g-mo-intro">${em(tilt?'sparkles':'flexed-biceps','',64)}<h3>${tilt?'Nghiêng đầu chọn đáp án':'Bước sang trái – phải'}</h3><p>${how}</p>
    <p class="small muted">Camera chỉ dùng ngay trên máy này để nhận biết tư thế, không ghi hình và không gửi đi đâu. Nên đứng/ngồi cách màn hình khoảng 1 mét, đủ sáng.</p>
    <div class="row" style="justify-content:center"><button type="button" class="btn hi g-cam">📷 Bật camera và chơi</button><button type="button" class="btn ghost g-nocam">Chơi bằng nút bấm</button></div><p class="g-fb small"></p></div></div>`;
  const view=()=>{A.stage.innerHTML=`<div class="g-mo"><div class="g-mo-top"><p class="g-prog"></p><div class="g-bar"><i style="width:100%"></i></div></div><p class="g-q"></p>
    <div class="g-mo-row"><button type="button" class="g-mo-opt" data-s="L"><span class="arr">←</span><b></b></button><div class="g-mo-cam">${stream?'<video playsinline muted></video><div class="g-mo-meter"><i></i></div>':''}</div><button type="button" class="g-mo-opt" data-s="R"><b></b><span class="arr">→</span></button></div><p class="g-fb small"></p></div>`;
    if(stream){video=A.stage.querySelector('video');video.srcObject=stream;video.play().catch(()=>{})}
    A.stage.querySelector('.g-mo-row').onclick=e=>{const b=e.target.closest('.g-mo-opt');if(b&&state==='q')choose(b.dataset.s)}};
  const ask=()=>{clearInterval(tm);if(k>=qs.length){stop();return A.finish(sc,qs.length)}const q=qs[k];state=stream?'center':'q';left=secs;
    A.stage.querySelector('.g-prog').textContent=`Câu ${k+1}/${qs.length}`+(stream&&state==='center'?' · đưa đầu về giữa':'');A.stage.querySelector('.g-q').textContent=q.q;
    const [l,r]=A.stage.querySelectorAll('.g-mo-opt');l.className='g-mo-opt';r.className='g-mo-opt';l.querySelector('b').textContent=q.L;r.querySelector('b').textContent=q.R;A.stage.querySelector('.g-fb').textContent='';
    const bar=A.stage.querySelector('.g-bar i');tm=setInterval(()=>{if(state==='center')return;left-=.25;bar.style.width=Math.max(0,left/secs*100)+'%';if(left<=0)choose(null)},250)};
  const choose=s=>{if(state==='done')return;state='done';clearInterval(tm);const q=qs[k];const ok=s===q.ans;gBeep(ok);if(ok){sc++;A.add(1)}
    const opts=A.stage.querySelectorAll('.g-mo-opt');opts.forEach(o=>{if(o.dataset.s===q.ans)o.classList.add('ok');else if(o.dataset.s===s)o.classList.add('bad')});
    A.stage.querySelector('.g-fb').innerHTML=(ok?'✓ Đúng rồi! ':s===null?'⏰ Hết giờ. ':'✗ Chưa đúng. ')+(q.why?esc(q.why):'');k++;setTimeout(ask,ok?1100:2200)};
  const loop=async()=>{if(!stream||!A.stage.isConnected){stop();return}try{if(video&&video.readyState>=2){const r=MP_LM.detectForVideo(video,performance.now());const f=r.faceLandmarks&&r.faceLandmarks[0];
      if(f){const a=f[33],b=f[263],nz=f[1];const v=tilt?Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI:(nz.x-.5)*100;
        if(base===null){calib.push(v);if(calib.length>=15){base=calib.reduce((x,y)=>x+y,0)/calib.length;ask()}}
        else{const d=v-base;const th=tilt?14:13;const m=A.stage.querySelector('.g-mo-meter i');if(m)m.style.left=Math.max(0,Math.min(100,50-d*(tilt?1.6:1.8)))+'%';
          const side=d>th?'L':d<-th?'R':null;
          if(state==='center'&&!side){state='q';const pg=A.stage.querySelector('.g-prog');if(pg)pg.textContent=`Câu ${k+1}/${qs.length}`}
          else if(state==='q'&&side){if(!hold||hold.s!==side)hold={s:side,t:performance.now()};else if(performance.now()-hold.t>450){hold=null;choose(side)}
            A.stage.querySelectorAll('.g-mo-opt').forEach(o=>o.classList.toggle('lean',o.dataset.s===side))}
          else{hold=null;A.stage.querySelectorAll('.g-mo-opt').forEach(o=>o.classList.remove('lean'))}}}}}catch(e){}
    raf=requestAnimationFrame(loop)};
  A.stage.querySelector('.g-nocam').onclick=()=>{document.addEventListener('keydown',onKey);view();ask()};
  A.stage.querySelector('.g-cam').onclick=async e=>{const fb=A.stage.querySelector('.g-fb');e.target.disabled=true;fb.textContent='Đang bật camera và tải bộ nhận diện (lần đầu mất vài giây)…';
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});await mpLoad();document.addEventListener('keydown',onKey);view();
      A.stage.querySelector('.g-q').textContent=tilt?'Nhìn thẳng vào camera, giữ đầu thẳng 2 giây để máy làm quen…':'Đứng ở giữa khung hình 2 giây để máy làm quen…';A.stage.querySelector('.g-prog').textContent='Chuẩn bị';loop()}
    catch(err){stop();e.target.disabled=false;fb.textContent='Không bật được camera hoặc không tải được bộ nhận diện ('+(err&&err.name||'lỗi')+'). Em chơi bằng nút bấm nhé.'}};
};
