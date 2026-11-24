import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu','--window-size=390,844'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0', timeout:30000});
await new Promise(r=>setTimeout(r,4000)); // splash
let prev='';
for (let i=1;i<=12;i++){
  const info = await page.evaluate(()=>{
    const btns=[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.trim().replace(/\s+/g,' ').slice(0,60));
    const text=document.body.innerText.replace(/\s+/g,' ').slice(0,300);
    return {btns, text};
  });
  await page.screenshot({path:`/downloads/adhd_flow_${String(i).padStart(2,'0')}.png`});
  console.log(`STEP ${i} | buttons: ${JSON.stringify(info.btns)}`);
  console.log(`  text: ${info.text.slice(0,180)}`);
  const sig=info.text.slice(0,120);
  if(sig===prev){console.log('STATE STABLE - stop');break;}
  prev=sig;
  const clicked = await page.evaluate(()=>{
    const btns=[...document.querySelectorAll('button')].filter(b=>b.offsetParent);
    const pick = btns.find(b=>/next|continue|start|begin|got it|let'?s|done|skip|show|unlock|join|save/i.test(b.innerText)) || btns[btns.length-1];
    if(pick){pick.click(); return pick.innerText.trim().slice(0,60);}
    return null;
  });
  console.log('  clicked:', clicked);
  await new Promise(r=>setTimeout(r,2500));
}
await browser.close();
