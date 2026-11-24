import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('file:///tmp/verify/smartfarm/index.html', {waitUntil:'networkidle0', timeout:30000});
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'/downloads/sf_webdemo_1.png'});
const txt = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,400));
console.log('TEXT:', txt);
console.log('PAGEERRORS:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
