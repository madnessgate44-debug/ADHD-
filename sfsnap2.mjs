import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,2500));
const frame = page.frames().find(f=>f!==page.mainFrame());
let y = -1;
if (frame){
  y = await frame.evaluate(()=>{
    const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.includes('تنفيذان مختلفان محتاجين حسم'));
    return els.length ? els[0].getBoundingClientRect().top + (window.scrollY||0) : -1;
  });
}
console.log('frame sectionY:', y);
if (y>=0){ await page.evaluate((y)=>window.scrollTo({top:Math.max(0,y-40),behavior:'instant'}), y); await new Promise(r=>setTimeout(r,900)); await page.screenshot({path:'/downloads/sf_section_v4.png'}); await page.evaluate((y)=>window.scrollTo({top:y+760,behavior:'instant'}), y); await new Promise(r=>setTimeout(r,700)); await page.screenshot({path:'/downloads/sf_section_v4b.png'}); }
await browser.close();
