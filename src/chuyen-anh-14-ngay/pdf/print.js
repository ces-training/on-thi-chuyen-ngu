// In các trang HTML ra PDF bằng Playwright. Dùng: node print.js jobs.json
// Nếu đặt FONTS_DIR (thư mục node_modules/@fontsource), phông chữ được lấy từ máy thay vì Google Fonts.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const FS=process.env.FONTS_DIR;
function localCSS(){let css='';for(const [pkg,ws] of Object.entries({'bricolage-grotesque':['700','800'],'plus-jakarta-sans':['400','600','700','400-italic']}))for(const w of ws){const f=path.join(FS,pkg,w+'.css');if(fs.existsSync(f))css+=fs.readFileSync(f,'utf8').replace(/url\(\.\/files\/([^)]+)\)/g,(m,x)=>`url(https://fonts.gstatic.com/fs/${pkg}/${x})`)}return css}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();
  if(FS){const css=localCSS();await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:css}));
    await ctx.route('https://fonts.gstatic.com/fs/**',r=>{const u=new URL(r.request().url());const [, ,pkg,file]=u.pathname.split('/');r.fulfill({path:path.join(FS,pkg,'files',file)})})}
  const p=await ctx.newPage();
  for(const [src,dst,title] of jobs){await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
    await p.pdf({path:dst,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
      footerTemplate:`<div style="font-size:8px;width:100%;padding:0 14mm;color:#666;display:flex;justify-content:space-between;font-family:sans-serif"><span>Chuyên Anh 14 Ngày · ${title}</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
      margin:{top:'14mm',bottom:'16mm',left:'14mm',right:'14mm'}});
    console.log('pdf',path.basename(dst),fs.statSync(dst).size)}
  await b.close()})();
