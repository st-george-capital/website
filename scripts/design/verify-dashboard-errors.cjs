const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page=await browser.newPage();let fail=true;const errors=[];
  page.on('pageerror',e=>errors.push(page.url()+': '+e.stack));await page.setRequestInterception(true);
  page.on('request',req=>{const u=new URL(req.url());if(!u.pathname.startsWith('/api/'))return req.continue();
   let data=[],status=fail?503:200;
   if(u.pathname==='/api/auth/session'){status=200;data={user:{id:'audit-admin',role:'admin',name:'Audit'},expires:'2099-01-01'};}
   else if(fail)data={error:'Unavailable'};
   else if(u.pathname==='/api/portfolio/snapshots')data={snapshots:[]};
   else if(u.pathname==='/api/trades')data={trades:[],totalPages:1,total:0};
   else if(u.pathname==='/api/settings')data={};
   else if(u.pathname==='/api/tools/cvar-optimizer/latest')data={run:null};
   else if(u.pathname==='/api/portfolio/summary')data={holdings:[],summary:{totalValue:0,totalCostBasis:0,totalPnL:0,totalPnLPercent:0,positionCount:0}};
   req.respond({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  for(const name of ['users','resume-book','weekly','team','postings','articles','strategy','investments','calendar','pitches','contact','holdings','newsletter','learning/courses','learning/curated','settings']){
   fail=true;await page.goto(`http://localhost:3000/dashboard/${name}`,{waitUntil:'networkidle2',timeout:90000});
   await page.waitForSelector('[role="alert"]');
   assert.ok(await page.$eval('[role="alert"]',n=>n.textContent.includes('Unable to load')));
   fail=false;await page.$eval('[role="alert"] button',n=>n.click());
   await page.waitForFunction(()=>!document.querySelector('[role="alert"]'));
   await new Promise(r=>setTimeout(r,250));
   console.log(`PASS ${name}: failed load and retry`);
  }
  assert.deepEqual(errors,[]);
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
