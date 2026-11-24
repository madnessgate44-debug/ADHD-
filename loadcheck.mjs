import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,400)));
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text().slice(0,200)); });
await page.goto('http://localhost:4173/', {waitUntil:'networkidle0'}); await sleep(3000);
console.log('nav buttons:', await page.evaluate(()=>document.querySelectorAll('nav button').length));
console.log('body head:', await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,150)));
await browser.close();
