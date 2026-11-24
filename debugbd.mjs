import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message().slice(0,140)); await d.accept(); });
page.on('response', async r => { if (r.url().includes('/api/')) console.log('API', r.url(), r.status(), JSON.stringify((await r.json().catch(()=>null))).slice(0,200)); });
await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded'});
// seed minimal profile to skip onboarding
await page.evaluate(()=>{
  localStorage.setItem('profile', JSON.stringify({id:'p1', name:'Test', adhdType:'time_blindness', coachingStyle:'gentle', createdAt:new Date().toISOString()}));
  localStorage.setItem('tasks', JSON.stringify([]));
});
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
console.log('onboarding skipped?', !(await page.evaluate(()=>document.body.innerText.includes('Start Cognitive Assessment'))));
await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.trim()==='PLANNER'); if(b) b.click(); });
await sleep(1000);
await page.type('input[placeholder^="Task description"]', 'Call accountant about Q4 taxes');
await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.includes('Add Task')); if(b) b.click(); });
await sleep(1200);
const clicked = await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Call accountant'));
  let card=h; for(let i=0;i<5 && card;i++){ if([...card.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('AI Break Down'))) break; card=card.parentElement; }
  const btn=card && [...card.querySelectorAll('button')].find(b=>b.innerText.includes('AI Break Down'));
  if(btn){ btn.click(); return 'clicked '+btn.innerText.trim(); } return 'no-btn';
});
console.log('breakdown:', clicked);
for (let i=0;i<15;i++){
  await sleep(1000);
  const st = await page.evaluate(()=>{ const t=JSON.parse(localStorage.getItem('tasks')||'[]'); return t.map(x=>({title:x.title, subs:x.subtasks?.length})); });
  if (st[0] && st[0].subs>0){ console.log('SUBTASKS SAVED after', i+1, 's:', JSON.stringify(st)); break; }
  if (i===14) console.log('NO SUBTASKS after 15s:', JSON.stringify(st));
}
const head = await page.evaluate(()=>{ const m=document.body.innerText.match(/Micro-Steps[^\n]*/); return m?m[0]:'none'; });
console.log('header:', head);
await browser.close();
