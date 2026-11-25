import time
import json, subprocess, base64, urllib.request, websocket, sys
CHROME="/usr/bin/google-chrome"; PORT=9444
class Sim:
    def __init__(s):
        s.p=subprocess.Popen([CHROME,"--headless=new",f"--remote-debugging-port={PORT}","--no-sandbox","--disable-gpu","--window-size=390,844","--hide-scrollbars","--user-data-dir=/tmp/sim-profile-%d"%time.time(),"about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                t=json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); pg=[x for x in t if x["type"]=="page"][0]; break
            except Exception: time.sleep(.2)
        s.ws=websocket.create_connection(pg["webSocketDebuggerUrl"],timeout=60); s.i=0; s.script=None
        s.cmd("Page.enable"); s.cmd("Runtime.enable")
        s.cmd("Emulation.setDeviceMetricsOverride",width=390,height=844,deviceScaleFactor=2,mobile=True)
    def cmd(s,m,**k):
        s.i+=1; s.ws.send(json.dumps({"id":s.i,"method":m,"params":k}))
        while True:
            r=json.loads(s.ws.recv())
            if r.get("id")==s.i:
                if "error" in r: raise RuntimeError(r["error"])
                return r.get("result",{})
    def js(s,e): return s.cmd("Runtime.evaluate",expression=e,returnByValue=True,awaitPromise=True).get("result",{}).get("value")
    def setday(s,off):
        if s.script: s.cmd("Page.removeScriptToEvaluateOnNewDocument",identifier=s.script)
        src="(()=>{const O=Date;const off=%d*86400000;class D extends O{constructor(...a){if(a.length===0){super(O.now()+off)}else{super(...a)}} static now(){return O.now()+off}};window.Date=D;window.__alerts=[];window.alert=m=>window.__alerts.push(String(m));window.confirm=m=>{window.__alerts.push('CONFIRM:'+m);return true};})();"%off
        s.script=s.cmd("Page.addScriptToEvaluateOnNewDocument",source=src)["identifier"]
    def go(s,url,w=2.5): s.cmd("Page.navigate",url=url); time.sleep(w)
    def reload(s,w=2.5): s.cmd("Page.reload"); time.sleep(w)
    def shot(s,path): open(path,"wb").write(base64.b64decode(s.cmd("Page.captureScreenshot",format="png",captureBeyondViewport=False)["data"]))
    def click(s,txt,exact=False,sel="button"):
        t=json.dumps(txt)
        return s.js("(()=>{const b=[...document.querySelectorAll(%s)].filter(x=>x.offsetParent!==null&&(%s?x.innerText.trim()===%s:x.innerText.includes(%s)));if(!b.length)return 'NO:'+%s;b[b.length-1].click();return 'ok'})()"%(json.dumps(sel),'true' if exact else 'false',t,t,t))
    def type(s,ph,val):
        return s.js("(()=>{const e=[...document.querySelectorAll('input,textarea')].find(x=>x.offsetParent!==null&&(x.placeholder||'').includes(%s));if(!e)return 'NOINPUT';const pr=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(pr,'value').set.call(e,%s);e.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()"%(json.dumps(ph),json.dumps(val)))
    def text(s,n=400): return s.js("document.body.innerText.slice(0,%d)"%n)
    def buttons(s): return s.js("[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null).map(x=>x.innerText.trim().replace(/\\n/g,' ').slice(0,40)).filter(Boolean).join(' | ')")
    def close(s): s.p.terminate()

def onboard(s):
    s.click('Start the 5-Question Quiz'); time.sleep(.8)
    for o in ['Task freeze','Chest tightness','Underestimating','I freeze instantly','A heavy source','Absolute Minimalism','Skipping meals','Starting the workday']: s.click(o)
    s.click('Generate Cognitive'); time.sleep(2)
Sim.onboard=onboard
def tab(s,n): return s.click(n,exact=True)
Sim.tab=tab
def inputs(s): return s.js("[...document.querySelectorAll('input,textarea')].filter(x=>x.offsetParent!==null).map(x=>x.type+':'+(x.placeholder||'')).join(' | ')")
Sim.inputs=inputs
import time
