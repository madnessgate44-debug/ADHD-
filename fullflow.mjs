import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message().slice(0,140)); await d.accept(); });
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0,200)));
const clickByText = async (txt, exact=false) => page.evaluate((t,ex)=>{
  const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && (ex ? x.innerText.trim()===t : x.innerText.includes(t)));
  if(b){ b.click(); return true } return false;
}, txt, exact);
const bodyHas = async (frag) => page.evaluate(f=>document.body.innerText.includes(f), frag);
const R = [];
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0', timeout:30000});
await sleep(2500);
R.push(['onboarding shown', await bodyHas('The Wired Leader')]);
await page.screenshot({path:'/downloads/ff_01_welcome.png'});
await clickByText('Start Cognitive Assessment');
await sleep(1200);
R.push(['quiz shown', await bodyHas('Cognitive Profile Quiz')]);
// sequential clicks with re-render waits: Q1,Q3,Q5 checkboxes (2 each), Q2,Q4 radio (1 each)
for (const [qi, nClicks] of [[0,2],[1,1],[2,2],[3,1],[4,2]]){
  for (let k=0;k<nClicks;k++){
    await page.evaluate((qi,k)=>{
      const blocks=[...document.querySelectorAll('form > div')].filter(d=>/QUESTION \d/.test(d.innerText));
      const opts=[...blocks[qi].querySelectorAll('button[type="button"]')].filter(x=>!x.innerText.includes('Back'));
      const fresh=[...blocks[qi].querySelectorAll('button[type="button"]')].filter(x=>!x.innerText.includes('✓'));
      const pool = fresh.length>0? fresh : opts;
      pool[Math.min(k, pool.length-1)].click();
    }, qi, k);
    await sleep(500);
  }
}
const subDisabled = await page.evaluate(()=>{ const b=[...document.querySelectorAll('form button[type="submit"]')][0]; return b ? b.disabled : 'no-form'; });
console.log('submit disabled?', subDisabled);
await page.screenshot({path:'/downloads/ff_02_quiz_answered.png'});
await clickByText('Generate Cognitive Support Profile');
await sleep(3000);
R.push(['onboarding closed after submit', !(await bodyHas('Cognitive Profile Quiz')) && !(await bodyHas('Start Cognitive Assessment'))]);
R.push(['seed task from onboarding', await bodyHas('onboarding reflection')]);
await page.screenshot({path:'/downloads/ff_03_home.png'});
// PLANNER: add task + AI breakdown on its card
await clickByText('PLANNER', true); await sleep(1200);
await page.type('input[placeholder^="Task description"]', 'Call accountant about Q4 taxes');
await clickByText('Add Task'); await sleep(1500);
R.push(['task added', await bodyHas('Call accountant about Q4 taxes')]);
await page.screenshot({path:'/downloads/ff_05_taskadded.png'});
const bd = await page.evaluate(()=>{
  const heads=[...document.querySelectorAll('h3')].find(h=>h.textContent.includes('Call accountant about Q4 taxes'));
  if(!heads) return 'task-not-found';
  let card=heads; for(let i=0;i<5 && card;i++){ if([...card.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('AI Break Down'))) break; card=card.parentElement; }
  const btn=card && [...card.querySelectorAll('button')].find(b=>b.innerText.includes('AI Break Down'));
  if(!btn) return 'no-breakdown-btn';
  btn.click(); return 'clicked';
});
console.log('breakdown click:', bd);
await sleep(6000);
const after = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
const mi = after.indexOf('Micro-Steps (0/4)');
R.push(['fallback steps rendered (0/4)', mi >= 0]);
R.push(['offline fallback banner shown', after.includes('standard starter steps, not tailored ones')]);
console.log('around breakdown:', mi>=0 ? after.slice(mi, mi+260) : '(no Micro-Steps (0/4))');
await page.screenshot({path:'/downloads/ff_06_breakdown.png'});
// CAPTURE
await clickByText('CAPTURE', true); await sleep(1200);
await page.type('input[placeholder="What is on your mind?"]', 'Wash laundry');
await page.evaluate(()=>{
  const inp=[...document.querySelectorAll('input')].find(i=>i.placeholder==='What is on your mind?');
  const b=[...inp.parentElement.querySelectorAll('button')].find(x=>x.offsetParent);
  if(b) b.click();
});
await sleep(1500);
R.push(['capture appears in inbox queue', await bodyHas('Wash laundry')]);
await page.screenshot({path:'/downloads/ff_07_capture.png'});
// FOCUS: park a thought
await clickByText('FOCUS', true); await sleep(1200);
const hasPark = await page.evaluate(()=>!![...document.querySelectorAll('input')].find(i=>i.placeholder.startsWith('Worry or idea')));
console.log('park input present in FOCUS:', hasPark);
if (hasPark){
  await page.type('input[placeholder^="Worry or idea"]', 'Email landlord');
  await clickByText('Park Thought'); await sleep(1200);
  await clickByText('CAPTURE', true); await sleep(1200);
  R.push(['parked thought saved to inbox', await bodyHas('Email landlord')]);
}
await page.screenshot({path:'/downloads/ff_08_focus.png'});
// INSIGHTS / SETTINGS
await clickByText('INSIGHTS', true); await sleep(1500);
await page.screenshot({path:'/downloads/ff_09_insights.png'});
await clickByText('CONFIG', true); await sleep(1200);
R.push(['settings shows simulator', await bodyHas('Simulate 2 Months')]);
await page.screenshot({path:'/downloads/ff_10_settings.png'});
// persistence across reload
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
R.push(['after reload: onboarding NOT reshown', !(await bodyHas('Start Cognitive Assessment'))]);
await clickByText('PLANNER', true); await sleep(1200);
R.push(['after reload: task persisted', await bodyHas('Call accountant about Q4 taxes')]);
R.push(['after reload: micro-steps persisted', await bodyHas('Micro-Steps (0/4)')]);
await page.screenshot({path:'/downloads/ff_11_reloaded.png'});
console.log('RESULTS:'); R.forEach(([n,ok])=>console.log((ok?'PASS ':'FAIL ')+n));
console.log('PAGEERRORS:', errors.length? errors.join(' | ') : 'none');
await browser.close();
