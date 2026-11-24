import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
await page.screenshot({path:'/downloads/preview_full.png', fullPage:true});
// exercise photo viewer: click first photo
const clicked = await page.evaluate(()=>{ const img=document.querySelector('img'); if(!img) return 'no-img'; const el=img.closest('button')||img; el.click(); return 'clicked'; });
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'/downloads/preview_photoviewer.png'});
console.log('photo click:', clicked);
// check a text link is inert-safe / external links exist?
const txt = await page.evaluate(()=>document.body.innerText.length);
console.log('body text length:', txt);
await browser.close();
