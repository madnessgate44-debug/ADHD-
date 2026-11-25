"""Repeatable E2E checks (headless Chrome via CDP). Needs: google-chrome, python3 websocket-client, `npm run build` done.
Run: python3 tests/e2e/run.py   (starts the server itself on :3111, keyless; synthetic data only)"""
import sys,os,time,json,subprocess
sys.path.insert(0,os.path.dirname(__file__))
from sim import Sim
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
env=dict(os.environ,NODE_ENV='production',PORT='3111',GEMINI_API_KEY='')
srv=subprocess.Popen(['npx','tsx','server.ts'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(6)
try:
  s=Sim(); U="http://localhost:3111/"
  res=[]
  def chk(name,ok,info=''): res.append(ok); print(('PASS' if ok else 'FAIL'),name,info)
  s.go(U); s.onboard()
  def T(id,title,status,co=0): return dict(id=id,title=title,notes='',status=status,dueDate=None,source='manual',createdAt='2026-01-01T00:00:00Z',updatedAt='2026-01-01T00:00:00Z',subtasks=[],carryOverCount=co)
  def seed(status):
      tasks=[T('t1','carried active','active',1),T('t2','done today','done'),T('t3','archived','archived'),T('t4','backlog active (not in plan)','active'),T('t5','moved later','active')]
      day=dict(date='2000-01-01',startedAt=None,closedAt=None,status=status,todayTaskIds=['t1','t2','t3'],nowTaskId='t1',completedTodayTaskIds=['t2'],deferredTaskIds=['t5'],carryOverTaskIds=[],droppedTaskIds=['t3'],hasCarryOver=False,bigGoal='')
      s.js("localStorage.setItem('tasks',%s);localStorage.setItem('dayState',%s)"%(json.dumps(json.dumps(tasks)),json.dumps(json.dumps(day))))
  def day(): return json.loads(s.js("localStorage.dayState"))
  def tasks(): return json.loads(s.js("localStorage.tasks"))
  for status in ['closed','active']:
      seed(status); s.reload(2.5); d=day()
      chk(f'rollover prev={status}: only unfinished planned task carries',d['todayTaskIds']==['t1'] and d['carryOverTaskIds']==['t1'],str(d['todayTaskIds']))
      chk(f'rollover prev={status}: done/archived/backlog/moved-later excluded',not set(d['todayTaskIds'])&{'t2','t3','t4','t5'})
      chk(f'rollover prev={status}: new day starts fresh (completed/dropped/deferred empty)',d['completedTodayTaskIds']==[] and d['droppedTaskIds']==[] and d['deferredTaskIds']==[])
      snap=json.dumps(d); ts=json.dumps(tasks())
      for i in range(3): s.reload(2)
      chk(f'repeat reload x3 prev={status}: no duplicates, state unchanged',json.dumps(day())==snap and json.dumps(tasks())==ts and len(set(day()['todayTaskIds']))==len(day()['todayTaskIds']))
      chk(f'carryOverCount not incremented by rollover',[x for x in tasks() if x['id']=='t1'][0]['carryOverCount']==1)
  # real UI close path: carry/backlog/archive then next day
  s.setday(0); seed('active'); 
  s.js("(()=>{const d=JSON.parse(localStorage.dayState);d.date=new Date().toISOString().slice(0,10);d.todayTaskIds=['t1','t2','t3'];d.droppedTaskIds=[];d.deferredTaskIds=[];d.completedTodayTaskIds=['t2'];localStorage.dayState=JSON.stringify(d);const t=JSON.parse(localStorage.tasks);t.find(x=>x.id=='t3').status='active';localStorage.tasks=JSON.stringify(t)})()")
  s.reload(2.5)
  print(' UI close: carry/backlog/archive'); 
  s.click('Close Day'); time.sleep(1)
  def cf(txt,i=0): return s.js("(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null&&x.innerText.includes(%s));if(b.length<=%d)return 'NO';b[%d].click();return 'ok'})()"%(json.dumps(txt),i,i))
  print(s.js("[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null&&/Carry Over|Backlog|Discard/.test(x.innerText)).length")); print(cf('Carry Over',0),cf('Discard',1)); time.sleep(.5); print(s.click('Lock & Close')); time.sleep(1)
  d=day(); print(' after close',d['status'],d['todayTaskIds'],d['deferredTaskIds'],d['droppedTaskIds'])
  s.setday(1); s.reload(3); d=day()
  chk('UI close then next day: only carried task in plan',d['todayTaskIds']==['t1'],str(d['todayTaskIds']))
  t={x['id']:x['status'] for x in tasks()}; chk('archived task not carried, stays archived',t['t3']=='archived' and 't3' not in d['todayTaskIds'])



  # --- rescue undo, medication form, pause ---
  def cfx(txt,i=0): return s.js("(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null&&x.innerText.trim()===%s);if(b.length<=%d)return 'NO';b[%d].click();return 'ok'})()"%(json.dumps(txt),i,i))
  s.setday(0); s.go(U); 
  ids=['a','b','c','d','e']
  tk=[T(i,'Task '+i.upper(),'active') for i in ids]
  dd=json.loads(s.js("localStorage.dayState")); dd.update(todayTaskIds=ids,nowTaskId='a',status='active',date=s.js("new Date().toISOString().slice(0,10)"))
  s.js("localStorage.setItem('tasks',%s);localStorage.setItem('dayState',%s)"%(json.dumps(json.dumps(tk)),json.dumps(json.dumps(dd)))); s.reload(2.5)
  before=day(); s.click('Rescue Day'); time.sleep(.6); cfx('Drop',0); time.sleep(.3); s.click('Apply Support Shield Filters'); time.sleep(.8)
  d=day(); chk('rescue apply changes plan',d['todayTaskIds']!=ids and any(x['status']=='archived' for x in tasks()))
  s.reload(2.5); chk('Undo rescue button persists across reload','Undo rescue' in s.js("document.body.innerText"))
  s.click('Undo rescue'); time.sleep(.6); d=day()
  chk('undo restores plan, deferred, dropped',d['todayTaskIds']==ids and d['deferredTaskIds']==before['deferredTaskIds'] and d['droppedTaskIds']==before['droppedTaskIds'])
  chk('undo un-archives tasks',all(x['status']=='active' for x in tasks()))
  chk('undo button gone after use','Undo rescue' not in s.js("document.body.innerText"))
  s.tab('ROUTINES'); time.sleep(.4); s.click('+ Add Medication'); time.sleep(.3); s.type('Medication name','Test med'); s.type('Dosage','5 mg'); s.click('Save medication'); time.sleep(.4)
  meds=json.loads(s.js("localStorage.medications")); chk('medication added via inline form',any(m['title']=='Test med' and m['dosage']=='5 mg' for m in meds))
  s.reload(2.5); s.tab('ROUTINES'); time.sleep(.4); chk('medication persists after reload','Test med' in s.js("document.body.innerText"))
  s.tab('FOCUS'); s.click('10 Min'); time.sleep(2.2); s.click('Pause'); a=s.js("document.body.innerText.match(/\\d\\d:\\d\\d/)[0]"); time.sleep(2.5); b=s.js("document.body.innerText.match(/\\d\\d:\\d\\d/)[0]")
  chk('pause actually stops the countdown',a==b,a+' '+b); s.click('Resume'); time.sleep(2.3); c=s.js("document.body.innerText.match(/\\d\\d:\\d\\d/)[0]"); chk('resume continues countdown',c!=b,b+' '+c)
  print('E2E',sum(res),'/',len(res)); s.close(); rc=0 if all(res) else 1
finally:
  srv.terminate()
sys.exit(rc)
