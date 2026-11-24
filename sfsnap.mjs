import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--disable-gpu'], defaultViewport: {width:390,height:844} });
const page = await browser.newPage();
await page.goto(url, {waitUntil:'networkidle0', timeout:45000});
await new Promise(r=>setTimeout(r,2500));
const y = await page.evaluate(()=>{
  const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.includes('تنفيذان مختلفان محتاجين حسم'));
  if(!els.length) return -1;
  return els[0].getBoundingClientRect().top + window.scrollY - 60;
});
console.log('sectionY:', y);
if (y>=0){ await page.evaluate((y)=>window.scrollTo({top:y,behavior:'instant'}), y); await new Promise(r=>setTimeout(r,900)); await page.screenshot({path:'/downloads/sf_section_v4.png'}); }
await browser.close();
