import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const shot = process.argv[2] || 'proof_after.png';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,200)));
await page.evaluateOnNewDocument(()=>{
  const Real = Date;
  window.__fakeNow = Date.parse('2026-11-24T10:00:00Z');
  class FakeDate extends Real { constructor(...a){ super(...(a.length ? a : [window.__fakeNow])); } static now(){ return window.__fakeNow; } }
  window.Date = FakeDate;
  // seed: yesterday CLOSED day with 2 unfinished today tasks (one explicitly carried in the evening)
  const mkTask = (id,title,co)=>({id,title,notes:'',status:'active',dueDate:null,source:'manual',createdAt:'2026-11-23T09:00:00.000Z',updatedAt:'2026-11-23T20:00:00.000Z',subtasks:[],carryOverCount:co});
  const tasks=[mkTask('t1','Prepare team presentation',1),mkTask('t2','Call accountant',0)];
  const dayState={date:'2026-11-23',startedAt:'2026-11-23T09:05:00.000Z',closedAt:'2026-11-23T20:30:00.000Z',status:'closed',todayTaskIds:['t1','t2'],nowTaskId:'t1',completedTodayTaskIds:[],deferredTaskIds:[],carryOverTaskIds:['t1'],droppedTaskIds:[],hasCarryOver:true,bigGoal:'Ship the deck'};
  const seed=()=>{ try{
    localStorage.setItem('profile', JSON.stringify({name:'Test User',createdAt:'2026-11-20T09:00:00.000Z'}));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('dayState', JSON.stringify(dayState));
    localStorage.setItem('events', JSON.stringify([]));
    localStorage.setItem('inbox', JSON.stringify([]));
    localStorage.setItem('routines', JSON.stringify([]));
    localStorage.setItem('medications', JSON.stringify([]));
    localStorage.setItem('dailyReports', JSON.stringify([]));
    localStorage.setItem('dopamineLevel','50');
  }catch(e){} };
  seed();
});
await page.goto('http://localhost:3000/', {waitUntil:'networkidle0'}); await sleep(2500);
const d = await page.evaluate(()=>{ const g=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}; const ds=g('dayState'); return {date:ds?.date, status:ds?.status, today:ds?.todayTaskIds, hasCarryOver:ds?.hasCarryOver}; });
console.log('ROLLOVER RESULT:', JSON.stringify(d));
console.log('BODY HAS TASK:', await page.evaluate(()=>document.body.innerText.includes('Prepare team presentation')));
console.log('BODY HAS Call accountant:', await page.evaluate(()=>document.body.innerText.includes('Call accountant')));
await page.screenshot({path: shot, fullPage:false});
console.log('SHOT:', shot);
await browser.close();
