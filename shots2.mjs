import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
const H = await page.evaluate(()=>document.body.scrollHeight);
console.log('outer height', H);
const spots = [Math.round(H*0.14), Math.round(H*0.36), Math.round(H*0.55), Math.round(H*0.82)];
for (let i=0;i<spots.length;i++){
  await page.evaluate((y)=>window.scrollTo({top:y,behavior:'instant'}), spots[i]);
  await new Promise(r=>setTimeout(r,900));
  await page.screenshot({path:`/downloads/hostedB_${i}.png`});
}
console.log('done');
await browser.close();
