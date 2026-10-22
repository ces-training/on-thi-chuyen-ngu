/* ----- Bản đồ 14 ngày: con đường uốn từ gần ra xa, 14 biển số buổi học, nền phong cảnh vẽ chì tô màu nước -----
   Bố cục theo kiểu "con đường lên level" (biển số gần to, xa nhỏ). Mỗi lần mở trang chọn ngẫu nhiên một cảnh.
   Dùng: S, DAYS, dayStatus, dayOpen, go, esc, HUNG. Chèn vào template.html bởi build.py. */
const MAP_W=1000,MAP_H=660,HZ=250;
/* ---- 8 kiểu vẽ: mỗi cảnh một kiểu nét và một tông màu ----
   ink: màu nét · w/w2: độ dày nét chính/phụ · disp/freq: độ run tay · fill: cách tô (wash loang, flat phẳng, hatch gạch chì màu)
   k: độ đậm màu · dbl: nét đúp kiểu phác thảo · grain: hạt than · xh: đánh bóng chéo · paper/grid: màu giấy */
const STYLES={
  sepia:   {label:'chì màu nâu đỏ',ink:'#6B4A2F',w:1.7,w2:1.1,disp:2.2,freq:.05,fill:'hatch',k:1,  dbl:0,grain:0,  xh:.2, paper:'#FBF3E6',grid:'#F1E4CC'},
  fine:    {label:'chì kỹ thuật nét mảnh',ink:'#4A4F55',w:1.1,w2:.75,disp:.9,freq:.07,fill:'flat',k:.55,dbl:0,grain:0,xh:.15,paper:'#F5F6F7',grid:'#E6EAED'},
  inkwash: {label:'mực và màu nước',ink:'#23324A',w:1.5,w2:1,disp:1.4,freq:.05,fill:'wash',k:1.15,dbl:0,grain:0,xh:.1, paper:'#F7F9FC',grid:'#E5ECF4'},
  soft:    {label:'chì mềm đánh bóng chéo',ink:'#3C4346',w:2.4,w2:1.4,disp:3.2,freq:.035,fill:'wash',k:.85,dbl:0,grain:.08,xh:.6,paper:'#F2F5F1',grid:'#E2E9E1'},
  charcoal:{label:'than chì',ink:'#2A2420',w:2.9,w2:1.7,disp:4.2,freq:.03,fill:'wash',k:1.05,dbl:0,grain:.28,xh:.45,paper:'#FAEFDA',grid:'#EFE0C0'},
  sketch:  {label:'phác thảo nét đúp',ink:'#4B4B4B',w:1.3,w2:.9,disp:2.2,freq:.06,fill:'flat',k:.6,dbl:1,grain:0,xh:.25,paper:'#F6F4EF',grid:'#E9E5DB'},
  blue:    {label:'chì màu xanh',ink:'#2F5F8A',w:1.6,w2:1,disp:2,freq:.05,fill:'hatch',k:1,dbl:0,grain:0,xh:.2,paper:'#F3F9FB',grid:'#DFEEF4'},
  water:   {label:'màu nước loang',ink:'#7A5546',w:1,w2:.7,disp:1.3,freq:.05,fill:'wash',k:1.45,dbl:0,grain:0,xh:.05,paper:'#FCF3EF',grid:'#F3E2DA'}
};
let ST=STYLES.sepia;const HATCHES=new Map();
function hatchId(c){if(!HATCHES.has(c))HATCHES.set(c,'mph'+HATCHES.size);return HATCHES.get(c)}
function mapDefs(){return `<defs>
 <filter id="mpPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${ST.freq}" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${ST.disp}"/></filter>
 <filter id="mpWash" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${ST.fill==='wash'?18:10}"/><feGaussianBlur stdDeviation="${ST.fill==='wash'?1.6:.6}"/></filter>
 <filter id="mpGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 1.4 -0.55"/></filter>
 <pattern id="mpHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="${ST.ink}" stroke-width="1" stroke-opacity=".55"/></pattern>
 <pattern id="mpHatchX" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="9" stroke="${ST.ink}" stroke-width=".9" stroke-opacity=".45"/></pattern>
 <pattern id="mpHatchY" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="9" stroke="${ST.ink}" stroke-width=".9" stroke-opacity=".4"/></pattern>
 <pattern id="mpPaper" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${ST.grid}" stroke-width="1"/></pattern>
 ${[...HATCHES].map(([c,id])=>`<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(${38+(id.length*7)%20})"><line x1="0" y1="0" x2="0" y2="5" stroke="${c}" stroke-width="2.2"/></pattern>`).join('')}
</defs>`}
const penAttr=w=>`fill="none" stroke="${ST.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
/* tô màu theo kiểu của cảnh: loang (màu nước), phẳng (bút dạ nhạt) hoặc gạch chì màu */
function wash(d,c,o){o=o||.55;
  if(ST.fill==='hatch')return `<path d="${d}" fill="${c}" opacity="${(o*.35).toFixed(2)}"/><path d="${d}" fill="url(#${hatchId(c)})" opacity="${Math.min(1,o*1.25*ST.k).toFixed(2)}"/>`;
  if(ST.fill==='flat')return `<path d="${d}" fill="${c}" opacity="${Math.min(1,o*ST.k).toFixed(2)}"/>`;
  return `<path d="${d}" fill="${c}" opacity="${Math.min(1,o*ST.k).toFixed(2)}" filter="url(#mpWash)"/>`}
function pen(d,extra){return `<path d="${d}" ${penAttr(ST.w)} ${extra||''}/>`+(ST.dbl?`<path d="${d}" ${penAttr(ST.w*.7)} opacity=".5" transform="translate(1.8 1.3)"/>`:'')}
function pen2(d){return `<path d="${d}" ${penAttr(ST.w2)}/>`+(ST.dbl?`<path d="${d}" ${penAttr(ST.w2*.7)} opacity=".45" transform="translate(1.4 1)"/>`:'')}
/* số ngẫu nhiên có hạt để cỏ, mây cố định trong một cảnh */
function mpRand(seed){let s=seed>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
function mpCloud(x,y,s){return pen(`M${x} ${y} q${8*s} ${-14*s} ${22*s} ${-6*s} q${10*s} ${-16*s} ${28*s} ${-4*s} q${16*s} ${-8*s} ${22*s} ${8*s} q${12*s} ${2*s} ${6*s} ${12*s} z`)}
function mpTree(x,y,s,c){return `${c?wash(`M${x-20*s} ${y-30*s} q-6 ${-34*s} ${20*s} ${-44*s} q${26*s} ${-12*s} ${32*s} ${14*s} q${14*s} ${22*s} ${-10*s} ${34*s} z`,c,.6):''}${pen(`M${x} ${y} l${-1*s} ${-26*s} M${x+3*s} ${y} l${1*s} ${-24*s}`)}${pen(`M${x-20*s} ${y-30*s} q${-8*s} ${-12*s} ${2*s} ${-22*s} q${-2*s} ${-18*s} ${18*s} ${-22*s} q${12*s} ${-14*s} ${26*s} ${-2*s} q${18*s} ${0} ${14*s} ${18*s} q${12*s} ${14*s} ${-6*s} ${26*s} q${-8*s} ${8*s} ${-20*s} ${2*s} q${-14*s} ${6*s} ${-28*s} ${0} z`)}`}
function mpGrass(r,n,box){let g='';for(let i=0;i<n;i++){const x=box[0]+r()*(box[2]-box[0]),y=box[1]+r()*(box[3]-box[1]),s=.5+(y-HZ)/(MAP_H-HZ);g+=pen2(`M${x.toFixed(0)} ${y.toFixed(0)} l${(2*s).toFixed(1)} ${(-6*s).toFixed(1)} M${(x+4*s).toFixed(0)} ${y.toFixed(0)} l${(1*s).toFixed(1)} ${(-8*s).toFixed(1)} M${(x+8*s).toFixed(0)} ${y.toFixed(0)} l${(-1*s).toFixed(1)} ${(-5*s).toFixed(1)}`)}return g}
/* nền chung: trời, đồi xa, đồi gần (màu theo cảnh) */
function mpGround(sc){const r=mpRand(sc.seed);
  return `${wash(`M-20 -20 H1020 V${HZ-90} Q760 ${HZ-60} 520 ${HZ-110} Q260 ${HZ-150} -20 ${HZ-70} Z`,sc.sky,.5)}
  ${mpCloud(80+r()*80,70,1.1)}${mpCloud(430+r()*120,48,.8)}${mpCloud(720+r()*120,90,.9)}
  ${sc.water?wash(`M-20 ${HZ-4} H1020 V${HZ+26} H-20 Z`,sc.water,.6)+pen2(`M40 ${HZ+8} q20 -4 40 0 M180 ${HZ+14} q20 -4 40 0 M610 ${HZ+10} q24 -4 48 0 M820 ${HZ+16} q20 -4 40 0`):''}
  ${wash(`M-20 ${HZ+26} Q130 ${HZ-6} 300 ${HZ+20} Q420 ${HZ+36} 520 ${HZ+30} Q760 ${HZ+4} 1020 ${HZ+24} V${MAP_H+20} H-20 Z`,sc.hill,.5)}
  ${pen(`M-10 ${HZ+26} Q130 ${HZ-6} 300 ${HZ+20} Q420 ${HZ+36} 520 ${HZ+30} Q760 ${HZ+4} 1010 ${HZ+24}`)}
  ${wash(`M-20 ${HZ+120} Q180 ${HZ+60} 420 ${HZ+104} Q540 ${HZ+124} 660 ${HZ+150} L660 ${MAP_H+20} H-20 Z`,sc.hill2||sc.hill,.55)}${pen(`M-10 ${HZ+120} Q180 ${HZ+60} 420 ${HZ+104}`)}
  ${wash(`M380 ${HZ+150} Q480 ${HZ+110} 600 ${HZ+90} Q800 ${HZ+40} 1020 ${HZ+80} V${MAP_H+20} H380 Z`,sc.hill2||sc.hill,.55)}${pen(`M600 ${HZ+90} Q800 ${HZ+40} 1010 ${HZ+80}`)}
  <rect x="0" y="${HZ+140}" width="1000" height="${MAP_H}" fill="url(#mpHatchX)" opacity="${(.15+ST.xh).toFixed(2)}"/>${ST.xh>.4?`<rect x="0" y="${HZ+40}" width="1000" height="${MAP_H}" fill="url(#mpHatchY)" opacity="${(ST.xh-.1).toFixed(2)}"/>`:""}
  ${mpGrass(r,46,[20,HZ+50,980,MAP_H-10])}
  ${mpTree(70,HZ+150,1.2,sc.tree)}${mpTree(330,HZ+95,.8,'')}${mpTree(950,HZ+165,1.4,sc.tree)}${mpTree(735,HZ+70,.7,sc.tree)}`}
/* ---- các cảnh: danh lam vẽ chì, tô màu vài chỗ ---- */
const SCENES={
 paris:{name:'Paris · Pháp',seed:11,style:'sepia',tone:'nóng',sky:'#F4B79E',hill:'#D9D79A',hill2:'#E3CF95',tree:'#B7B26A',draw:()=>`
  ${wash('M790 252 C805 200 820 150 832 95 L840 20 L848 95 C860 150 875 200 890 252 Z','#E9C9A0',.45)}
  ${pen('M790 252 C805 200 820 150 832 95 L836 60 L840 18 M890 252 C875 200 860 150 848 95 L844 60 L840 18 M805 252 Q840 206 875 252')}
  ${pen('M800 204 H880 M802 196 H878 M818 144 H862 M820 138 H860 M831 84 H849')}
  ${pen2('M812 196 L826 144 M868 196 L854 144 M812 144 L868 196 M868 144 L812 196 M826 138 L834 84 M854 138 L846 84 M826 84 L854 138 M854 84 L826 138 M800 252 L816 204 M880 252 L864 204')}
  ${pen('M640 252 V232 L660 222 L680 232 V252 M680 252 V226 L702 214 L724 226 V252 M724 252 V236 L744 228 L764 236 V252 M668 222 V212 M712 214 V204')}
  ${pen2('M646 240 h6 M660 240 h6 M690 236 h6 M706 236 h6 M732 244 h6 M748 244 h6')}
  ${wash('M150 150 q0 -48 34 -48 q34 0 34 48 q0 24 -34 44 q-34 -20 -34 -44 z','#E8604C',.6)}
  ${pen('M150 150 q0 -48 34 -48 q34 0 34 48 q0 24 -34 44 q-34 -20 -34 -44 z M168 104 q16 30 16 90 M200 104 q-16 30 -16 90 M176 196 h16 v12 h-16 z')}`},
 london:{name:'London · Anh',seed:23,style:'fine',tone:'trung tính',sky:'#C9CFD4',hill:'#BFC8BA',hill2:'#CBD0C4',tree:'#9FAE98',water:'#9CC4DC',draw:()=>`
  ${wash('M840 252 V82 H880 V252 Z','#E7D3A8',.5)}
  ${pen('M840 252 V82 H880 V252 M836 82 H884 V70 H836 Z M838 70 L860 22 L882 70 M846 70 L846 58 M874 70 L874 58')}
  ${wash('M860 96 a14 14 0 1 1 -0.1 0 z','#FFF3C4',.9)}${pen('M860 96 a14 14 0 1 1 -0.1 0 z M860 110 v-9 M860 110 l7 4')}
  ${pen2('M848 130 V246 M860 130 V246 M872 130 V246 M840 160 H880 M840 200 H880')}
  ${pen('M700 252 V206 H840 M700 206 l6 -12 l6 12 M730 206 l6 -12 l6 12 M760 206 l6 -12 l6 12 M790 206 l6 -12 l6 12 M818 206 l6 -12 l6 12')}
  ${pen2('M712 220 v20 M728 220 v20 M744 220 v20 M760 220 v20 M776 220 v20 M792 220 v20 M808 220 v20 M824 220 v20')}
  ${wash('M150 252 V122 H182 V252 Z M270 252 V122 H302 V252 Z','#C9C2B2',.5)}
  ${pen('M150 252 V122 H182 V252 M146 122 L166 96 L186 122 M270 252 V122 H302 V252 M266 122 L286 96 L306 122 M182 142 H270 M182 150 H270 M100 230 H350')}
  ${wash('M182 150 Q226 200 270 150','#5B9BD5',.5)}${pen2('M182 150 Q226 204 270 150 M110 230 Q130 200 150 170 M302 170 Q322 200 342 230 M200 172 v58 M226 182 v48 M252 172 v58')}
  ${wash('M560 236 h46 v-22 h-46 z','#E8604C',.75)}${pen('M560 236 h46 v-22 h-46 z M560 224 h46 M566 236 a4 4 0 1 0 8 0 M592 236 a4 4 0 1 0 8 0')}`},
 japan:{name:'Núi Phú Sĩ · Nhật Bản',seed:37,style:'inkwash',tone:'lạnh',sky:'#BFD3EE',hill:'#BFD9C8',hill2:'#AFCFC0',tree:'#F2A9C0',draw:()=>`
  ${wash('M560 252 L700 120 Q730 104 760 120 L900 252 Z','#AAB6E0',.55)}
  ${pen('M560 252 L700 120 Q730 104 760 120 L900 252')}
  ${wash('M700 120 L680 142 L700 150 L716 138 L730 152 L746 140 L762 150 L782 140 L760 120 Q730 104 700 120 Z','#FFFFFF',.95)}${pen2('M680 142 L700 150 L716 138 L730 152 L746 140 L762 150 L782 140')}
  <path d="M600 252 L700 140 L700 252 Z" fill="url(#mpHatch)" opacity=".5"/>
  ${wash('M128 150 Q200 136 272 150 L270 162 Q200 150 130 162 Z M148 172 H252 V180 H148 Z M160 162 H170 V252 H160 Z M230 162 H240 V252 H230 Z','#E8604C',.75)}
  ${pen('M128 150 Q200 136 272 150 L270 162 Q200 150 130 162 Z M148 172 H252 V180 H148 Z M160 162 V252 M170 162 V252 M230 162 V252 M240 162 V252 M196 162 V172 M204 162 V172')}
  ${wash('M455 70 a32 32 0 1 1 -0.1 0 z','#E8604C',.45)}${pen2('M455 70 a32 32 0 1 1 -0.1 0 z')}`},
 halong:{name:'Vịnh Hạ Long · Việt Nam',seed:53,style:'soft',tone:'lạnh',sky:'#BBDCDC',hill:'#B7D3B4',hill2:'#A9C9AA',tree:'#8DB79A',water:'#8FC7D2',draw:()=>{
  const k=(x,h,w)=>`M${x} 252 C${x} ${252-h*.55} ${x+w*.1} ${252-h} ${x+w*.45} ${252-h} C${x+w*.85} ${252-h} ${x+w} ${252-h*.6} ${x+w} 252`;
  const peaks=[[30,110,70],[95,150,80],[180,90,60],[690,140,70],[760,190,90],[860,120,70],[925,160,70]];
  return peaks.map(([x,h,w])=>wash(k(x,h,w)+' Z','#9FBFA8',.55)+pen(k(x,h,w))+`<path d="${k(x,h,w)} Z" fill="url(#mpHatch)" opacity=".35"/>`).join('')+
  wash('M300 262 q40 10 80 0 l-8 12 h-64 z','#B5793E',.7)+pen('M300 262 q40 10 80 0 l-8 12 h-64 z M318 262 V214 M342 262 V206 M364 262 V218')+
  wash('M318 214 q14 4 18 20 l-18 4 z M342 206 q16 6 20 26 l-20 4 z M364 218 q12 4 14 18 l-14 3 z','#E0703A',.8)+
  pen2('M318 214 q14 4 18 20 l-18 4 z M342 206 q16 6 20 26 l-20 4 z M364 218 q12 4 14 18 l-14 3 z M322 222 h10 M346 216 h12 M346 226 h12')}},
 egypt:{name:'Kim tự tháp Giza · Ai Cập',seed:71,style:'charcoal',tone:'nóng',sky:'#F4C27E',hill:'#E7C88C',hill2:'#DDB574',tree:'#A9B86A',draw:()=>`
  ${wash('M700 252 L800 138 L900 252 Z M860 252 L920 184 L980 252 Z M620 252 L662 204 L704 252 Z','#E9C27A',.6)}
  ${pen('M700 252 L800 138 L900 252 M860 252 L920 184 L980 252 M620 252 L662 204 L704 252')}
  <path d="M800 138 L900 252 L812 252 Z M920 184 L980 252 L926 252 Z" fill="url(#mpHatch)" opacity=".6"/>
  ${pen2('M760 184 L840 184 M736 212 L866 212 M720 236 L884 236')}
  ${wash('M250 92 a42 42 0 1 1 -0.1 0 z','#F5A04B',.55)}${pen2('M250 92 a42 42 0 1 1 -0.1 0 z')}
  ${pen('M160 252 q-6 -50 10 -96 M170 156 q-30 -6 -44 14 M170 156 q-20 -20 -46 -14 M170 156 q4 -26 30 -30 M170 156 q26 -10 46 6 M170 156 q14 4 26 26')}
  ${wash('M170 156 q-30 -6 -44 14 q20 -18 44 -14 q-20 -20 -46 -14 q30 0 46 14 q4 -26 30 -30 q-20 10 -30 30 q26 -10 46 6 q-26 -4 -46 -6 z','#7DB86A',.6)}
  ${pen2('M520 238 q10 -10 22 -4 q6 -12 16 -4 l4 18 M530 248 v-12 M550 248 v-12')}`},
 newyork:{name:'New York · Mỹ',seed:89,style:'sketch',tone:'trung tính',sky:'#E6E5E1',hill:'#D3D2CB',hill2:'#C5C4BC',tree:'#AEB0A6',water:'#B9C6CC',draw:()=>`
  ${wash('M832 200 L838 140 Q850 120 862 140 L868 200 Z M850 104 a8 8 0 1 1 -0.1 0 z M858 132 L872 72 L878 74 L864 134 Z','#8FC9B5',.75)}
  ${pen('M816 252 L824 214 H876 L884 252 M828 214 V200 H872 V214 M832 200 L838 140 Q850 120 862 140 L868 200 M850 104 a8 8 0 1 1 -0.1 0 z M858 132 L872 72 L878 74 L864 134 M836 150 L826 170 L834 176')}
  ${pen2('M842 104 l-6 -8 M846 100 l-2 -9 M850 99 v-9 M854 100 l2 -9 M858 104 l6 -8 M842 160 Q850 170 858 160 M840 184 Q850 190 860 184')}
  ${wash('M872 64 q6 -12 2 -20 q10 8 6 20 z','#F5A04B',.9)}${pen2('M870 72 h10 l-2 -6 h-6 z M872 64 q6 -12 2 -20 q10 8 6 20')}
  ${wash('M40 252 V180 H80 V252 Z M120 252 V160 H150 V252 Z M200 252 V196 H240 V252 Z','#C7CBD8',.5)}
  ${pen('M40 252 V180 H80 V252 M80 252 V206 H112 V252 M112 252 V160 H122 V120 H130 V96 L134 70 L138 96 V120 H146 V160 H156 V252 M156 252 V196 H200 V252 M200 252 V176 H240 V252 M240 252 V210 H280 V252 M280 252 V188 H318 V252')}
  ${pen2('M48 192 h6 M62 192 h6 M48 210 h6 M62 210 h6 M48 228 h6 M62 228 h6 M124 176 h6 M138 176 h6 M124 200 h6 M138 200 h6 M124 224 h6 M138 224 h6 M208 188 h6 M224 188 h6 M208 212 h6 M224 212 h6 M288 200 h6 M302 200 h6 M288 222 h6 M302 222 h6')}`},
 sydney:{name:'Sydney · Úc',seed:97,style:'blue',tone:'lạnh',sky:'#A9DDF0',hill:'#B7E0C9',hill2:'#A3D6BE',tree:'#7FC3A8',water:'#7FC4E0',draw:()=>`
  ${pen('M170 252 V238 H430 V252')}
  ${wash('M200 238 Q212 180 262 158 Q252 200 252 238 Z M244 238 Q262 170 318 150 Q300 196 300 238 Z M296 238 Q316 186 362 172 Q348 206 348 238 Z M340 238 Q358 200 398 194 Q388 214 388 238 Z','#FFFFFF',.95)}
  ${pen('M200 238 Q212 180 262 158 Q252 200 252 238 M244 238 Q262 170 318 150 Q300 196 300 238 M296 238 Q316 186 362 172 Q348 206 348 238 M340 238 Q358 200 398 194 Q388 214 388 238')}
  ${pen2('M214 230 Q228 196 256 174 M262 230 Q276 186 310 162 M312 230 Q326 196 356 182 M354 230 Q366 212 392 202')}
  ${wash('M650 252 Q815 118 980 252 L966 252 Q815 140 664 252 Z','#9AA6AE',.5)}
  ${pen('M650 252 Q815 118 980 252 M664 252 Q815 140 966 252 M640 206 H990 M640 214 H990 M640 252 V196 H664 V252 M966 252 V196 H990 V252')}
  ${pen2('M700 206 V184 M730 206 V168 M760 206 V156 M790 206 V150 M820 206 V148 M850 206 V152 M880 206 V160 M910 206 V172 M940 206 V188')}`},
 agra:{name:'Đền Taj Mahal · Ấn Độ',seed:113,style:'water',tone:'nóng',sky:'#F2C6CF',hill:'#E6D7A7',hill2:'#DCC98F',tree:'#B9C47E',draw:()=>`
  ${wash('M750 236 V170 H890 V236 Z M770 170 Q770 110 820 96 Q870 110 870 170 Z','#F6DCE2',.7)}
  ${pen('M690 252 V236 H950 V252 M750 236 V170 H890 V236 M770 170 Q770 110 820 96 Q870 110 870 170 M820 96 V72 M816 80 h8')}
  ${pen('M800 236 V196 Q820 168 840 196 V236 M762 228 V204 Q770 192 778 204 V228 M862 228 V204 Q870 192 878 204 V228')}
  ${pen('M752 170 Q752 150 764 146 Q776 150 776 170 M864 170 Q864 150 876 146 Q888 150 888 170')}
  ${pen('M700 236 V124 H710 V236 M698 124 Q705 110 712 124 M930 236 V124 H940 V236 M928 124 Q935 110 942 124')}
  ${pen2('M700 160 h10 M700 196 h10 M930 160 h10 M930 196 h10 M808 120 Q820 112 832 120')}
  ${[648,672,968,992].map(x=>wash(`M${x} 252 Q${x-11} 214 ${x} 176 Q${x+11} 214 ${x} 252 Z`,'#9FB46A',.75)+pen(`M${x} 252 Q${x-11} 214 ${x} 176 Q${x+11} 214 ${x} 252`)).join('')}
  ${pen2('M160 120 q8 -6 16 0 q8 -6 16 0 M210 140 q6 -5 12 0 q6 -5 12 0 M120 150 q6 -5 12 0 q6 -5 12 0')}`}
};
const SCENE_KEYS=Object.keys(SCENES);
/* mỗi lần mở trang một cảnh, tránh trùng cảnh lần trước */
const MAP_SCENE=(()=>{let last='';try{last=localStorage.getItem('ca14_scene')||''}catch(e){}
  let k=SCENE_KEYS[Math.floor(Math.random()*SCENE_KEYS.length)];if(k===last)k=SCENE_KEYS[(SCENE_KEYS.indexOf(k)+1)%SCENE_KEYS.length];
  try{localStorage.setItem('ca14_scene',k)}catch(e){}return k})();
/* đường cong của con đường: 3 đoạn Bézier bậc ba, từ gần (dưới trái) ra xa (đường chân trời) */
const ROAD=[[[520,760],[500,640],[330,600],[370,500]],[[370,500],[400,420],[540,420],[522,350]],[[522,350],[512,302],[566,274],[592,HZ]]];
function bz(s,t){const u=1-t;return[0,1].map(k=>u*u*u*s[0][k]+3*u*u*t*s[1][k]+3*u*t*t*s[2][k]+t*t*t*s[3][k])}
const ROAD_PTS=(()=>{const pts=[];ROAD.forEach((s,i)=>{for(let j=i?1:0;j<=80;j++)pts.push(bz(s,j/80))});
  const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  return pts.map((p,i)=>({x:p[0],y:p[1],u:L[i]/L[L.length-1]}))})();
function roadAt(u){const P=ROAD_PTS;let i=P.findIndex(p=>p.u>=u);if(i<1)i=1;const a=P[i-1],b=P[i];const f=(u-a.u)/((b.u-a.u)||1);
  const x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return {x,y,nx:-dy/l,ny:dx/l}}
/* đoạn đường nhìn thấy bắt đầu khi đường lên khỏi mép dưới khung */
const U0=(ROAD_PTS.find(p=>p.y<=MAP_H-40)||{u:0.1}).u;
const roadW=u=>210*Math.pow(1-u,1.6)+5;
function roadSVG(){const L=[],R=[];ROAD_PTS.forEach(p=>{const q=roadAt(p.u),w=roadW(p.u)/2;L.push([q.x+q.nx*w,q.y+q.ny*w]);R.push([q.x-q.nx*w,q.y-q.ny*w])});
  const f=a=>a.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');
  return `<path d="M${f(L)} L${f(R.reverse())} Z" fill="${ST.paper}"/><path d="M${f(L)} L${f(R.slice().reverse())} Z" fill="#E6DCC6" opacity=".45"/><path d="M${f(L)} L${f(R.slice().reverse())} Z" fill="url(#mpHatchX)" opacity=".25"/>
   <path d="M${f(L)}" ${penAttr(ST.w)} filter="url(#mpPencil)"/><path d="M${f(R.slice().reverse())}" ${penAttr(ST.w)} filter="url(#mpPencil)"/>
   <path d="M${ROAD_PTS.map(p=>p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' L')}" fill="none" stroke="#D9A21B" stroke-width="3" stroke-dasharray="16 14" stroke-linecap="round" opacity=".85"/>`}
/* 14 biển số: gần to, xa nhỏ, xen kẽ hai bên đường */
function signShape(kind,r){
  if(kind===0)return `M${-r} ${-r} H${r} V${r} H${-r} Z`;
  if(kind===1)return `M0 ${-r*1.25} L${r*1.25} 0 L0 ${r*1.25} L${-r*1.25} 0 Z`;
  if(kind===2)return `M${r*1.1} 0 A${r*1.1} ${r*1.1} 0 1 1 ${-r*1.1} 0 A${r*1.1} ${r*1.1} 0 1 1 ${r*1.1} 0 Z`;
  if(kind===3)return `M0 ${-r*1.3} L${r*1.25} ${r*.9} L${-r*1.25} ${r*.9} Z`;
  let d='';for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*.62:r*1.35;d+=(k?'L':'M')+(Math.cos(a)*rr).toFixed(1)+' '+(Math.sin(a)*rr).toFixed(1)}return d+'Z'}
function mapSVG(nd){
  const sc=SCENES[MAP_SCENE];ST=STYLES[sc.style]||STYLES.sepia;HATCHES.clear();let signs='';const scene=mpGround(sc)+sc.draw();const road=roadSVG();
  const order=DAYS.map(x=>x.day).sort((a,b)=>b-a); // vẽ xa trước, gần sau
  order.forEach(n=>{
    const ty=HZ+8+(MAP_H-30-HZ-8)*Math.pow(1-(n-1)/13,1.5),u=(ROAD_PTS.find(p=>p.y<=ty)||ROAD_PTS[ROAD_PTS.length-1]).u,q=roadAt(u),s=0.5+0.5*Math.pow((ty-HZ)/(MAP_H-HZ),0.9),side=n%2?-1:1;
    const w=roadW(u)/2+40*s,bx=q.x+side*w,by=q.y,L=48*s,cx=bx,cy=by-L,r=17*s;
    const st=dayStatus(n),open=dayOpen(n),cur=open&&n===nd,rev=DAYS[n-1].type==='review';
    const kind=rev?4:(n-1)%4;
    const fill=st==='done'?'#2E8799':cur?'#FFD23F':st==='part'?'#FFE7A0':open?'#FFFFFF':'#E6EAEC';
    const ink=open||st==='done'?'#14303A':'#8A979C',txt=st==='done'?'#FFFFFF':'#14303A';
    const D=DAYS[n-1];
    signs+=`<g class="msign${open?'':' lk'}${cur?' cur':''}" data-d="${n}" role="button" tabindex="0" aria-label="Buổi ${n}: ${esc(D.theme_vi)}${st==='done'?', đã xong':cur?', buổi tiếp theo':open?'':', đang khoá'}">
      <line x1="${bx}" y1="${by}" x2="${cx}" y2="${cy+r}" stroke="#5a4a36" stroke-width="${(4*s).toFixed(1)}" stroke-linecap="round"/>
      ${cur?`<circle cx="${cx}" cy="${cy}" r="${(r*2).toFixed(1)}" fill="#FFD23F" opacity=".35" class="mp-glow"/>`:''}
      <path transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${((n*37)%9-4)})" d="${signShape(kind,r)}" fill="${fill}" stroke="${ink}" stroke-width="${(3*s+.6).toFixed(1)}" stroke-linejoin="round" ${open||st==='done'?'':'stroke-dasharray="5 4"'}/>
      ${s>.55?`<rect x="${(cx-15*s).toFixed(1)}" y="${(cy-r*1.45-13*s).toFixed(1)}" width="${(30*s).toFixed(1)}" height="${(11*s).toFixed(1)}" rx="2" fill="#14303A"/><text x="${cx.toFixed(1)}" y="${(cy-r*1.45-4.6*s).toFixed(1)}" text-anchor="middle" font-size="${(8*s).toFixed(1)}" font-weight="800" fill="#fff" style="font-family:var(--f-body)">BUỔI</text>`:''}
      <text x="${cx.toFixed(1)}" y="${(cy+(kind===3?r*.35:0)+6.5*s+(s<.5?1:0)).toFixed(1)}" text-anchor="middle" font-size="${(Math.max(9,20*s)).toFixed(1)}" font-weight="800" fill="${open||st==='done'?txt:'#8A979C'}" style="font-family:var(--f-display)">${n}</text>
      ${!open&&st!=='done'&&s>.45?`<g transform="translate(${(cx+r).toFixed(1)} ${(cy-r).toFixed(1)}) scale(${(s*.8).toFixed(2)})"><circle r="10" fill="#8A979C"/><rect x="-5" y="-2" width="10" height="8" rx="1.5" fill="#fff"/><path d="M-3 -2v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#fff" stroke-width="2"/></g>`:''}
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(16,r*1.8).toFixed(1)}" fill="transparent"/>
    </g>`});
  const cur=DAYS.find(x=>dayOpen(x.day)&&x.day===nd);
  const say=!S.diag?'Làm bài đầu vào đã nha!':DAYS.every(x=>dayStatus(x.day)==='done')?'Về đích rồi! Quá đỉnh!':`Tới buổi ${nd} nào!`;
  return `<svg class="mapsvg" viewBox="0 0 ${MAP_W} ${MAP_H}" role="group" aria-label="Bản đồ 14 buổi học, cảnh ${esc(sc.name)}, vẽ ${esc(ST.label)}">${mapDefs()}
    <rect width="${MAP_W}" height="${MAP_H}" fill="${ST.paper}"/><rect width="${MAP_W}" height="${MAP_H}" fill="url(#mpPaper)"/>
    <g filter="url(#mpPencil)">${scene}</g>
    ${ST.grain?`<rect width="${MAP_W}" height="${MAP_H}" filter="url(#mpGrain)" opacity="${ST.grain}"/>`:''}
    ${road}${signs}
    <g class="mp-hung"><image href="${HUNG()}" x="842" y="${MAP_H-196}" width="150" height="200"/>
      <path d="M700 ${MAP_H-178} h150 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 h-96 l-16 16 l2 -16 h-40 a10 10 0 0 1 -10 -10 v-34 a10 10 0 0 1 10 -10 z" fill="#fff" stroke="#14303A" stroke-width="2.5"/>
      <text x="780" y="${MAP_H-145}" text-anchor="middle" font-size="17" fill="#14303A" style="font-family:var(--f-hand)">${esc(say)}</text>
      <rect x="880" y="${MAP_H-34}" width="60" height="22" rx="5" fill="#14303A" transform="rotate(-4 910 ${MAP_H-23})"/><text x="910" y="${MAP_H-18}" text-anchor="middle" font-size="15" fill="#fff" style="font-family:var(--f-hand)" transform="rotate(-4 910 ${MAP_H-23})">Hùng</text></g>
    <g transform="translate(18 16) rotate(-2)"><rect width="${(sc.name.length*8.6+44).toFixed(0)}" height="34" rx="4" fill="#FFF3B0" stroke="#14303A" stroke-width="2"/><text x="14" y="23" font-size="16" fill="#14303A" style="font-family:var(--f-hand)">📍 ${esc(sc.name)}</text></g>
  </svg>`}
function wireMap(root){root.querySelectorAll('.msign').forEach(g=>{const f=()=>go('days',{day:+g.dataset.d});g.addEventListener('click',f);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})})}
