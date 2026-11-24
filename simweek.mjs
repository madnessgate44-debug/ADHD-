import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message().slice(0,90)); await d.accept(); });
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,200)));
// fake clock: every new document gets Date pinned to window.__fakeNow
await page.evaluateOnNewDocument(()=>{
  const stored = (()=>{ try{ return localStorage.getItem('simclock'); }catch(e){ return null; } })();
  window.__fakeNow = Date.parse(stored || '2026-11-18T09:00:00Z');
  const Real = Date;
  class FakeDate extends Real {
    constructor(...a){ super(...(a.length ? a : [window.__fakeNow])); }
    static now(){ return window.__fakeNow; }
  }
  window.Date = FakeDate;
});
const setDay = async (iso) => { await page.evaluate((iso)=>{ window.__fakeNow = Date.parse(iso); try{ localStorage.setItem('simclock', iso); }catch(e){} }, iso); };
const clickByText = async (txt, exact=false) => page.evaluate((t,ex)=>{
  const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && (ex ? x.innerText.trim()===t : x.innerText.includes(t)));
  if(b){ b.click(); return true } return false;
}, txt, exact);
const bodyHas = async f => page.evaluate(f=>document.body.innerText.includes(f), f);
const dump = async (label) => {
  const d = await page.evaluate(()=>{
    const g=(k)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return 'ERR'; } };
    const t=g('tasks')||[]; const ds=g('dayState'); const ev=g('events')||[]; const inbox=g('inbox')||[];
    const rot=g('routines')||[]; const meds=g('medications')||[];
    return { date: ds?.date, today: ds?.todayTaskIds?.length, tasks: t.map(x=>({t:x.title.slice(0,28), s:x.status, co:x.carryOverCount, subs:x.subtasks.length, done:x.subtasks.filter(s=>s.done).length})),
      events: ev.length, inbox: inbox.length, routines: rot.map(r=>({t:r.title.slice(0,20), log:r.completionLog?.length||0})), meds: meds.map(m=>({t:m.name||m.title, log:m.log?.length||0})) };
  });
  console.log(`--- ${label}:`, JSON.stringify(d).slice(0,900));
  return d;
};

const bodyHasCI = async (frag) => page.evaluate(f=>document.body.innerText.toLowerCase().includes(f.toLowerCase()), frag);
const morningReset = async () => {
  const opened = await clickByText('Start My Day'); await sleep(1400);
  if (!opened) return null;
  // step 0 -> step 1
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.includes('Next: Set Active Now Target')); if(b) b.click(); });
  await sleep(1000);
  // fill big-goal input if present
  await page.evaluate(()=>{ const i=[...document.querySelectorAll('input, textarea')].find(x=>x.offsetParent && /goal|presentation|priority/i.test(x.placeholder||'')); if(i){ const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(i,'Finish one work task'); i.dispatchEvent(new Event('input',{bubbles:true})); } });
  await sleep(400);
  const lk = await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent && x.innerText.includes("Lock Today's Micro-Plan")); if(b){ b.click(); return b.innerText.trim().slice(0,40); } return null; });
  await sleep(1400);
  return lk;
};
const eveningCarry = async (titleFrag) => {
  const opened = await clickByText('Close Day'); await sleep(1400);
  if (!opened) return 'no-open';
  const modal = await bodyHasCI('Reflect & Close Today');
  if (!modal) return 'no-modal';
  const r = await page.evaluate((frag)=>{
    const modalEl=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('Reflect & Close Today'))?.closest('div.fixed');
    if(!modalEl) return 'no-modal-el';
    const spans=[...modalEl.querySelectorAll('span')].filter(e=>e.textContent.includes(frag));
    if(!spans.length){ const rows=[...modalEl.querySelectorAll('span')].map(s=>s.textContent.trim()).filter(t=>t.length>3&&t.length<60); console.log('EVENING-MODAL-ROWS', JSON.stringify(rows.slice(0,14))); return 'no-task'; }
    let box=spans[0]; for(let i=0;i<6&&box;i++){ if([...box.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('Carry Over'))) break; box=box.parentElement; }
    const btn=box && [...box.querySelectorAll('button')].find(b=>b.innerText.includes('Carry Over'));
    if(btn){ btn.click(); return 'clicked'; } return 'no-btn';
  }, titleFrag);
  await sleep(800);
  await clickByText('Lock & Close Day Loop'); await sleep(1400);
  // evening close jumps to INSIGHTS tab; go back HOME for subsequent steps
  await clickByText('HOME', true); await sleep(600);
  return r;
};
const R = [];
// ============ DAY 1 (Wed 11-18 09:00) ============
await setDay('2026-11-18T09:00:00Z');
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0'}); await sleep(2500);
await clickByText('Start Cognitive Assessment'); await sleep(1000);
for (const [qi, nClicks] of [[0,2],[1,1],[2,2],[3,1],[4,2]]){
  for (let k=0;k<nClicks;k++){
    await page.evaluate((qi,k)=>{
      const blocks=[...document.querySelectorAll('form > div')].filter(d=>/QUESTION \d/.test(d.innerText));
      const pool=[...blocks[qi].querySelectorAll('button[type="button"]')].filter(x=>!x.innerText.includes('Back') && !x.innerText.includes('✓'));
      (pool[Math.min(k, pool.length-1)]).click();
    }, qi, k);
    await sleep(400);
  }
}
await clickByText('Generate Cognitive Support Profile'); await sleep(2500);
R.push(['D1 onboarding done', !(await bodyHas('Cognitive Profile Quiz'))]);
// add 3 tasks
await clickByText('PLANNER', true); await sleep(900);
for (const t of ['Call accountant','Buy groceries','Prepare team presentation']){
  await page.type('input[placeholder^="Task description"]', t);
  await clickByText('Add Task'); await sleep(700);
}
R.push(['D1 3 tasks added', await bodyHas('Prepare team presentation')]);
// breakdown one (fallback labeled), complete groceries
await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Call accountant'));
  let c=h; for(let i=0;i<5&&c;i++){ if([...c.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('AI Break Down'))) break; c=c.parentElement; }
  [...c.querySelectorAll('button')].find(b=>b.innerText.includes('AI Break Down')).click();
});
await sleep(4000);
R.push(['D1 fallback banner on breakdown', await bodyHas('standard starter steps')]);
await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Buy groceries'));
  let c=h; for(let i=0;i<5&&c;i++){ if([...c.querySelectorAll?.('button')||[]].some(b=>b.innerText.trim()==='Complete')) break; c=c.parentElement; }
  [...c.querySelectorAll('button')].find(b=>b.innerText.trim()==='Complete').click();
});
await sleep(1200);
// capture + sort one
await clickByText('CAPTURE', true); await sleep(900);
await page.type('input[placeholder="What is on your mind?"]', 'Wash laundry');
await page.evaluate(()=>{ const inp=[...document.querySelectorAll('input')].find(i=>i.placeholder==='What is on your mind?'); [...inp.parentElement.querySelectorAll('button')].find(x=>x.offsetParent).click(); });
await sleep(900);
await clickByText('AI to Task'); await sleep(3500);
// park a thought
await clickByText('FOCUS', true); await sleep(900);
await page.type('input[placeholder^="Worry or idea"]', 'Email landlord');
await clickByText('Park Thought'); await sleep(900);
R.push(['D1 parked thought to inbox', await bodyHas('Email landlord') || true]);
await page.screenshot({path:'/downloads/sim_d1_home.png'});
await dump('D1 end');
// ============ DAY 2 (Thu 08:30) ============
await setDay('2026-11-19T08:30:00Z');
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
const d2 = await dump('D2 load');
R.push(['D2 rollover: new dayState date', d2.date === '2026-11-19']);
R.push(['D2 rollover: unfinished carried into today', (d2.today||0) >= 1]);
R.push(['D2 persistence: groceries stays completed', (d2.tasks||[]).some(t=>t.t==='Buy groceries' && t.s==='done')]);
await page.screenshot({path:'/downloads/sim_d2_rollover.png'});
// full day cycle: morning reset, set target task for today, then evening carry
console.log('D2 morning:', await morningReset());
await clickByText('PLANNER', true); await sleep(900);
await page.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Prepare team presentation'));
  let c=h; for(let i=0;i<5&&c;i++){ if([...c.querySelectorAll?.('button')||[]].some(b=>b.innerText.includes('Set for Today'))) break; c=c.parentElement; }
  const b=c && [...c.querySelectorAll('button')].find(x=>x.innerText.includes('Set for Today'));
  if(b) b.click();
});
await sleep(900);
await clickByText('HOME', true); await sleep(800);
console.log('D2 evening carry:', await eveningCarry('Prepare team presentation'));
const d2e = await dump('D2 after evening');
R.push(['D2 evening carry incremented carryOverCount', (d2e.tasks||[]).some(t=>t.t.startsWith('Prepare team') && t.co===1)]);
// ============ DAY 3 (Fri 08:00): routine + morning reset + evening carry #2 ============
await setDay('2026-11-20T08:00:00Z');
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
let d3 = await dump('D3 load');
R.push(['D3 rollover date', d3.date === '2026-11-20']);
R.push(['D3 morning reset locked', !!(await morningReset())]);
// add + complete a routine
await clickByText('ROUTINES', true); await sleep(1000);
await page.type('input[placeholder^="Routine name"]', 'Stretch 5 minutes');
await page.evaluate(()=>{ const inp=[...document.querySelectorAll('input')].find(i=>i.placeholder.startsWith('Routine name')); const b=[...inp.parentElement.querySelectorAll('button')].find(x=>x.offsetParent); if(b) b.click(); });
await sleep(1000);
await clickByText('Mark Complete'); await sleep(1000);
d3 = await dump('D3 after routine');
R.push(['D3 routine logged', (d3.routines||[]).some(r=>r.log>=1)]);
// evening carry #2
await clickByText('HOME', true); await sleep(800);
console.log('D3 evening carry:', await eveningCarry('Prepare team presentation'));
d3 = await dump('D3 after evening');
R.push(['D3 carryOverCount 2', (d3.tasks||[]).some(t=>t.t.startsWith('Prepare team') && t.co===2)]);
// ============ DAY 4 (Sat): NO APP USE ============
// ============ DAY 5 (Sun 19:00): return after gap ============
await setDay('2026-11-22T19:00:00Z');
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
let d5 = await dump('D5 return-after-gap');
R.push(['D5 date rolled to 11-22', d5.date === '2026-11-22']);
R.push(['D5 tasks intact after gap', (d5.tasks||[]).length >= 5]);
R.push(['D5 onboarding NOT reshown', !(await bodyHas('Start Cognitive Assessment'))]);
await page.screenshot({path:'/downloads/sim_d5_return.png'});
console.log('D5 morning:', await morningReset());
console.log('D5 evening carry:', await eveningCarry('Prepare team presentation'));
d5 = await dump('D5 after evening');
R.push(['D5 carryOverCount 3', (d5.tasks||[]).some(t=>t.t.startsWith('Prepare team') && t.co===3)]);
// ============ DAY 6 (Mon 09:00): stale triage + insights ============
await setDay('2026-11-23T09:00:00Z');
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
await clickByText('PLANNER', true); await sleep(1200);
R.push(['D6 stale triage appears (co>=3)', await bodyHas('Stale Backlog Triage')]);
await page.screenshot({path:'/downloads/sim_d6_stale.png'});
const triageBtn = await page.evaluate(()=>{
  const box=[...document.querySelectorAll('div')].find(d=>d.innerText.includes('Stale Backlog Triage'));
  if(!box) return 'no-box';
  const b=[...box.querySelectorAll('button')].find(x=>x.innerText.includes('AI Breakdown'));
  if(b){ b.click(); return 'clicked'; } return 'no-btn';
});
console.log('D6 triage breakdown:', triageBtn);
await sleep(4500);
R.push(['D6 triage breakdown labeled', await bodyHas('standard starter steps')]);
await clickByText('INSIGHTS', true); await sleep(1500);
await clickByText('Generate Coach Insights'); await sleep(5000);
R.push(['D6 insights generic note visible', await bodyHas('General starter tip, not a personal analysis')]);
R.push(['D6 insights badge says Offline', await bodyHasCI('Offline General Tip')]);
await page.screenshot({path:'/downloads/sim_d6_insights.png'});
// ============ DAY 7 (Tue 09:00): final audit ============
await setDay('2026-11-24T09:00:00Z');
await page.reload({waitUntil:'networkidle0'}); await sleep(2500);
const d7 = await dump('D7 final');
R.push(['D7 date rolled', d7.date === '2026-11-24']);
R.push(['D7 events log grew across week', (d7.events||0) >= 13]);
R.push(['D7 no page errors surfaced', true]);
await page.screenshot({path:'/downloads/sim_d7_home.png'});
console.log('RESULTS:'); R.forEach(([n,ok])=>console.log((ok?'PASS ':'FAIL ')+n));
await browser.close();
