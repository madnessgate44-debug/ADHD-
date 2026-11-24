import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0', timeout:30000});
await new Promise(r=>setTimeout(r,4000));
for (const tab of ['PLANNER','ROUTINES','FOCUS','CAPTURE','INSIGHTS','CONFIG']){
  await page.evaluate((t)=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.trim()===t); if(b) b.click(); }, tab);
  await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({path:`/downloads/adhd_tab_${tab.toLowerCase()}.png`});
  const txt = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(120,320));
  console.log(`TAB ${tab}: ${txt}`);
}
await browser.close();
