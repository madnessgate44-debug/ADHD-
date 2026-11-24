import puppeteer from 'puppeteer-core';
const PORT = process.argv[2], TAG = process.argv[3];
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,300)));
page.on('dialog', async d => { console.log('DIALOG:', d.message().slice(0,100)); await d.accept(); });
const clickByText = async (txt, exact=false) => page.evaluate((t,ex)=>{
  const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && (ex ? x.innerText.trim()===t : x.innerText.includes(t)));
  if(b){ b.click(); return true } return false;
}, txt, exact);
const bodyHas = async f => page.evaluate(f=>document.body.innerText.includes(f), f);
const R = [];
await page.goto(`http://localhost:${PORT}/`, {waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('profile', JSON.stringify({id:'p1', name:'Test', adhdType:'time_blindness', coachingStyle:'gentle', preferences:{focusDuration:10}, createdAt:new Date().toISOString()}));
  localStorage.setItem('tasks', JSON.stringify([])); localStorage.setItem('inbox', JSON.stringify([]));
});
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
// NAV: all 7 tabs reachable
const navCount = await page.evaluate(()=>document.querySelectorAll('nav button').length);
R.push(['nav has 7 tabs', navCount===7]);
await page.evaluate(()=>{ const b=[...document.querySelectorAll('nav button')].pop(); b.scrollIntoView(); b.click(); });
await sleep(1200);
R.push(['CONFIG reachable via nav', await bodyHas('Simulate 2 Months')]);
await page.screenshot({path:`/downloads/v_${TAG}_nav.png`, clip:{x:0,y:844-180,width:390,height:180}});
// PLANNER breakdown fallback banner
const plOk = await clickByText('PLANNER', true); await sleep(1000);
console.log('planner click:', plOk, 'on planner?', await bodyHas('Intake New Task'));
if (!(await bodyHas('Intake New Task'))) { console.log('ABORT: not on planner'); console.log('RESULTS['+TAG+']:'); R.forEach(([n,ok])=>console.log((ok?'PASS ':'FAIL ')+n)); await browser.close(); process.exit(1); }
await page.type('input[placeholder^="Task description"]', 'Call accountant about Q4 taxes');
await clickByText('Add Task'); await sleep(1200);
await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Call accountant'));
  let card=h; for(let i=0;i<5 && card;i++){ if([...card.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('AI Break Down'))) break; card=card.parentElement; }
  [...card.querySelectorAll('button')].find(b=>b.innerText.includes('AI Break Down')).click();
});
await sleep(5000);
R.push(['breakdown banner shown', await bodyHas('standard starter steps, not tailored ones')]);
R.push(['steps rendered (0/4)', await page.evaluate(()=>/micro-steps \(0\/4\)/i.test(document.body.innerText))]);
// CAPTURE sort to task, labeled fallback
await clickByText('CAPTURE', true); await sleep(1000);
await page.type('input[placeholder="What is on your mind?"]', 'Wash laundry');
await page.evaluate(()=>{ const inp=[...document.querySelectorAll('input')].find(i=>i.placeholder==='What is on your mind?'); const b=[...inp.parentElement.querySelectorAll('button')].find(x=>x.offsetParent); if(b) b.click(); });
await sleep(1200);
await clickByText('AI to Task');
await sleep(4000);
R.push(['sorted task appears in planner', await bodyHas('Wash laundry')]);
R.push(['sorted task labeled offline-fallback', (await page.evaluate(()=>document.body.innerText.match(/standard starter steps/g)||[])).length >= 1]);
await page.screenshot({path:`/downloads/v_${TAG}_sorted.png`});
// INSIGHTS generic note
await clickByText('INSIGHTS', true); await sleep(1500);
const genBtn = await page.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.includes('Generate Coach Insights'));
  if(b){ b.click(); return b.innerText.trim().slice(0,50); } return null;
});
console.log('insights button:', genBtn);
await sleep(5000);
R.push(['insights generic-tip note shown', await bodyHas('General starter tip, not a personal analysis')]);
await page.screenshot({path:`/downloads/v_${TAG}_insights.png`});
console.log('RESULTS['+TAG+']:'); R.forEach(([n,ok])=>console.log((ok?'PASS ':'FAIL ')+n));
await browser.close();
