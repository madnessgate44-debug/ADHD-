import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,200)));
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0'}); await sleep(2500);
await page.screenshot({path:'/tmp/ob_welcome.png'});
console.log('has **:', await page.evaluate(()=>document.body.innerText.includes('**')));
console.log('has voice claim:', await page.evaluate(()=>document.body.innerText.includes('voice note')));
console.log('has offline label:', await page.evaluate(()=>document.body.innerText.includes('AI coach is offline in this version')));
console.log('has no-diagnosis:', await page.evaluate(()=>document.body.innerText.includes('not a medical assessment')));
await browser.close();
