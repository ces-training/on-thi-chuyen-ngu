/* ================= VIDEO GIỚI THIỆU WEB =================
   - Lần đầu mở trang: video tự chạy, thử có tiếng trước; trình duyệt chặn thì chạy không tiếng và cú chạm đầu tiên bật tiếng,
     hiện TRÊN popup chọn tỉnh. Phụ huynh bấm "Tắt video" hoặc xem hết thì video thu về một góc trang.
   - Góc trang luôn có ô "Video giới thiệu web" để xem lại bất cứ lúc nào.
   - Bản xem trước của cô và trang báo cáo không tự chạy video. */
const IV_SRC='media/gioi-thieu-web.mp4',IV_POSTER='media/gioi-thieu-web.jpg',IV_KEY='ca14_intro_seen';
function ivSeen(){try{return localStorage.getItem(IV_KEY)==='1'}catch(e){return false}}
function ivMark(){try{localStorage.setItem(IV_KEY,'1')}catch(e){}}
(function(){const st=document.createElement('style');st.textContent=`
.iv{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;background:rgba(10,40,48,.72)}
.iv[hidden]{display:none}
.iv-card{width:min(960px,100%);background:#14303A;border:3px solid #14303A;border-radius:18px;box-shadow:6px 8px 0 rgba(0,0,0,.35);overflow:hidden;transform-origin:0 0}
.iv-head{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;color:#fff}
.iv-head b{flex:1;font-size:1.05rem}
.iv-x{all:unset;box-sizing:border-box;cursor:pointer;background:#FFD23F;color:#14303A;border:2px solid #14303A;border-radius:999px;padding:6px 14px;font-weight:700;font-size:.92rem}
.iv-x:focus-visible,.iv-snd:focus-visible span,.iv-corner:focus-visible{outline:3px solid #FFD23F;outline-offset:3px}
.iv-stage{position:relative;background:#000}
.iv-stage video{display:block;width:100%;height:auto;max-height:calc(100vh - 120px);max-height:calc(100dvh - 120px);background:#000}
.iv-snd{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;inset:0;z-index:2}
.iv-snd span{position:absolute;left:14px;top:14px;transform-origin:0 0;background:#FFD23F;color:#14303A;border:3px solid #14303A;border-radius:999px;padding:12px 22px;font-weight:800;font-size:1.05rem;box-shadow:4px 5px 0 rgba(0,0,0,.35);animation:ivPulse 1.8s ease-in-out infinite}
.iv-snd[hidden]{display:none}
@keyframes ivPulse{50%{transform:scale(1.06)}}
.iv-corner{all:unset;box-sizing:border-box;position:fixed;left:12px;bottom:12px;z-index:55;cursor:pointer;display:flex;flex-direction:column;width:220px;background:#14303A;color:#fff;border:3px solid #14303A;border-radius:14px;overflow:hidden;box-shadow:4px 5px 0 rgba(10,40,48,.35);transition:transform .2s}
.iv-corner:hover{transform:translateY(-2px)}
.iv-corner[hidden]{display:none}
.iv-thumb{position:relative;display:block;aspect-ratio:16/9;background:#0D303C center/cover no-repeat}
.iv-thumb::after{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:#FFD23F url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 6.5v11l9-5.5z' fill='%2314303A'/%3E%3C/svg%3E") center/26px no-repeat;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.iv-lab{display:block;padding:7px 10px;font-weight:700;font-size:.9rem;text-align:center}
@media (min-width:1100px){.iv-corner{left:160px;bottom:16px}}
@media (max-width:700px){.iv-corner{width:auto;flex-direction:row;align-items:center;gap:8px;border-radius:999px;padding:4px 14px 4px 4px;left:10px;bottom:10px}
 .iv-thumb{width:34px;height:34px;aspect-ratio:auto;border-radius:50%;background:#FFD23F}.iv-thumb::after{width:34px;height:34px;margin:-17px 0 0 -17px;background-size:20px}.iv-lab{padding:0;font-size:.85rem}
 .iv{padding:8px}.iv-head b{font-size:.95rem}.iv-snd span{left:8px;top:8px;padding:7px 12px;font-size:.85rem}}
body.pv .iv-corner{bottom:90px}
@media (max-width:700px){body.pv .iv-corner{bottom:134px}}
@media print{.iv,.iv-corner{display:none!important}}
@media (prefers-reduced-motion:reduce){.iv-snd span{animation:none}}`;document.head.appendChild(st)})();

function introBoot(auto){
  if(document.getElementById('ivCorner'))return;
  const corner=document.createElement('button');corner.type='button';corner.id='ivCorner';corner.className='iv-corner';
  corner.setAttribute('aria-label','Mở video giới thiệu web');
  corner.innerHTML=`<span class="iv-thumb" style="background-image:url('${IV_POSTER}')"></span><span class="iv-lab">Video giới thiệu web</span>`;
  const ov=document.createElement('div');ov.id='ivBox';ov.className='iv';ov.hidden=true;ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Video giới thiệu web');
  ov.innerHTML=`<div class="iv-card"><div class="iv-head"><b>Video giới thiệu web</b><button type="button" class="iv-x" id="ivX">Tắt video ✕</button></div>
   <div class="iv-stage"><video id="ivV" playsinline controls preload="${auto?'auto':'none'}" poster="${IV_POSTER}"><source src="${IV_SRC}" type="video/mp4"></video>
   <button type="button" class="iv-snd" id="ivSnd" hidden aria-label="Bật tiếng video"><span>🔊 Chạm để bật tiếng</span></button></div></div>`;
  document.body.appendChild(ov);document.body.appendChild(corner);
  const v=ov.querySelector('#ivV'),snd=ov.querySelector('#ivSnd'),card=ov.querySelector('.iv-card');
  const sync=()=>{snd.hidden=!(v.muted&&!v.paused)};
  v.addEventListener('volumechange',sync);v.addEventListener('play',()=>{if(ov.hidden){v.pause();return}sync()});v.addEventListener('playing',()=>{if(ov.hidden)v.pause()});v.addEventListener('pause',sync);
  /* trình duyệt chỉ cho phát CÓ TIẾNG sau khi người xem chạm/bấm/gõ phím lần đầu trên trang:
     thử phát có tiếng trước; bị chặn thì phát không tiếng, và cú chạm đầu tiên ở bất cứ đâu sẽ bật tiếng, quay lại đầu video */
  let waitGesture=false;
  function unmute(){waitGesture=false;off();const restart=v.muted&&v.currentTime<25;v.muted=false;v.volume=1;if(restart)v.currentTime=0;if(v.paused)v.play().catch(()=>{});sync()}
  const onGesture=e=>{if(!waitGesture||ov.hidden)return;if(e.type==='keydown'&&e.key==='Escape')return;if(e.target&&e.target.closest&&e.target.closest('#ivX'))return;unmute()};
  const EV=['pointerdown','touchend','keydown'];
  function on(){EV.forEach(t=>document.addEventListener(t,onGesture,true))}
  function off(){EV.forEach(t=>document.removeEventListener(t,onGesture,true))}
  snd.onclick=unmute;
  let lastFocus=null;
  function open(){lastFocus=document.activeElement;ov.hidden=false;corner.hidden=true;
    if(v.ended)v.currentTime=0;v.muted=false;v.volume=1;
    v.play().catch(()=>{if(ov.hidden)return;v.muted=true;waitGesture=true;on();v.play().catch(()=>{})}).finally(sync);
    try{ov.querySelector('#ivX').focus({preventScroll:true})}catch(e){}}
  function close(){if(ov.hidden)return;waitGesture=false;off();v.pause();ivMark();corner.hidden=false;
    const a=card.getBoundingClientRect(),b=corner.getBoundingClientRect();
    const done=()=>{ov.hidden=true;card.style.transform='';ov.style.background='';
      const gate=document.querySelector('#regGate select');try{(gate||lastFocus||corner).focus({preventScroll:true})}catch(e){}};
    const still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(still||!card.animate||!a.width){done();return}
    const sx=b.width/a.width,sy=b.height/a.height,s=Math.max(.08,Math.min(sx,sy));
    card.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${s})`,opacity:.25}],{duration:450,easing:'cubic-bezier(.4,0,.2,1)'});
    ov.animate([{background:'rgba(10,40,48,.72)'},{background:'rgba(10,40,48,0)'}],{duration:450,easing:'ease-out'}).onfinish=done;
    corner.animate([{transform:'scale(.85)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:300,delay:300,fill:'backwards'})}
  ov.querySelector('#ivX').onclick=close;
  /* bấm ra nền tối không đóng video (cú bấm đầu tiên còn dùng để bật tiếng); đóng bằng nút "Tắt video" hoặc Esc */
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)close()});
  v.addEventListener('ended',close);
  corner.onclick=()=>open();
  if(auto)open()}
