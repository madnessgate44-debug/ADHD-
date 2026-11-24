import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
console.log('frames:', page.frames().map(f=>f.url().slice(0,90)).join('\n  '));
// find the deepest frame with real text
let target = null;
for (const f of page.frames()){
  try { const n = await f.evaluate(()=>document.body ? document.body.innerText.length : 0);
    console.log('frame', f.url().slice(0,60), 'text', n);
    if (n > 500) target = f;
  } catch(e){ console.log('frame inaccessible', f.url().slice(0,60)); }
}
if (target){
  const h = await target.evaluate(()=>document.body.scrollHeight);
  console.log('target height', h);
  for (let i=0;i<4;i++){
    await target.evaluate((y)=>window.scrollTo(0,y), Math.floor(h*i/4));
    await new Promise(r=>setTimeout(r,700));
    await page.screenshot({path:`/downloads/pv_${i}.png`});
  }
}
await browser.close();
