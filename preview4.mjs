import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,3000));
const inner = page.frames().find(f=>f.url().includes('instinctusercontent'));
const before = await inner.evaluate(()=>!!document.querySelector('[class*="viewer"], dialog[open]'));
const res = await inner.evaluate(()=>{
  const imgs=[...document.querySelectorAll('img')].filter(i=>i.offsetParent && i.naturalWidth>200);
  if(!imgs.length) return 'no-img';
  const el=imgs[0].closest('button')||imgs[0]; el.click(); return 'clicked '+imgs[0].alt.slice(0,40);
});
await new Promise(r=>setTimeout(r,1500));
const after = await inner.evaluate(()=>{
  const dlg=document.querySelector('dialog[open]');
  const overlay=[...document.querySelectorAll('div')].some(d=>{const s=getComputedStyle(d);return s.position==='fixed'&&parseInt(s.zIndex)>10&&d.offsetParent;});
  return {dialogOpen: !!dlg, overlay};
});
await page.screenshot({path:'/downloads/pv_viewer.png'});
console.log('before:', before, '| click:', res, '| after:', JSON.stringify(after));
await browser.close();
