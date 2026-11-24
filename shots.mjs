import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
const inner = page.frames().find(f=>f.url().includes('instinctusercontent'));
const h = await inner.evaluate(()=>document.body.scrollHeight);
console.log('content height', h);
const spots = [0, Math.round(h*0.16), Math.round(h*0.38), Math.round(h*0.80)];
for (let i=0;i<spots.length;i++){
  await inner.evaluate((y)=>window.scrollTo(0,y), spots[i]);
  await new Promise(r=>setTimeout(r,900));
  await page.screenshot({path:`/downloads/hosted_${i}.png`});
}
console.log('done');
await browser.close();
