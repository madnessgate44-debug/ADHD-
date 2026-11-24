import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
const frame = page.frames().find(f=>f.url()!==url && f.url()!=='about:blank') || page.mainFrame();
const height = await frame.evaluate(()=>document.body.scrollHeight);
console.log('frame url:', frame.url().slice(0,80), 'content height:', height);
const innerText = await frame.evaluate(()=>document.body.innerText.length);
console.log('frame text length:', innerText);
// scroll the iframe's window and take 4 shots
for (let i=0;i<4;i++){
  await frame.evaluate((y)=>window.scrollTo(0,y), Math.floor(height*i/4));
  await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:`/downloads/preview_scroll${i}.png`});
}
// photo viewer inside frame
const pv = await frame.evaluate(()=>{ const img=document.querySelector('img'); if(!img) return 'no-img'; (img.closest('button')||img).click(); return 'clicked'; });
await new Promise(r=>setTimeout(r,1200));
await page.screenshot({path:'/downloads/preview_viewer.png'});
console.log('viewer:', pv);
await browser.close();
