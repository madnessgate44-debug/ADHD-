import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('dialog', async d => { await d.accept(); });
await page.goto('http://localhost:4173/', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('profile', JSON.stringify({id:'p1', name:'Test', adhdType:'time_blindness', coachingStyle:'gentle', createdAt:new Date().toISOString()}));
  localStorage.setItem('tasks', JSON.stringify([]));
});
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.trim()==='PLANNER'); if(b) b.click(); });
await sleep(1000);
await page.type('input[placeholder^="Task description"]', 'Call accountant about Q4 taxes');
await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.includes('Add Task')); if(b) b.click(); });
await sleep(1200);
await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Call accountant'));
  let card=h; for(let i=0;i<5 && card;i++){ if([...card.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('AI Break Down'))) break; card=card.parentElement; }
  [...card.querySelectorAll('button')].find(b=>b.innerText.includes('AI Break Down')).click();
});
await sleep(5000);
const heads = await page.evaluate(()=>[...document.querySelectorAll('span')].map(s=>s.textContent).filter(t=>t&&t.includes('Micro-Steps')));
console.log('headers:', JSON.stringify(heads));
const banner = await page.evaluate(()=>{ const p=[...document.querySelectorAll('p')].find(x=>x.textContent.includes('standard starter steps')); if(p){ p.scrollIntoView({block:'center'}); return p.textContent.trim(); } return null; });
console.log('banner:', banner);
await sleep(800);
await page.screenshot({path:'/downloads/adhd_static_banner.png'});
await browser.close();
