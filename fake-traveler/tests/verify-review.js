/* 실행: node fake-traveler/tests/verify-review.js — 검수 사진 비교판 생성 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../output/.npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const out=path.resolve(__dirname,'../check-verify');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1800,height:1200}});
    for(const size of ['1366x768','1280x800','1024x768','768x1024','390x844']){
      const suffixes=['story-title','story-intro-10','story-board-10','story-reveal-10','story-detail','story-badges','liar-lobby','liar-town-role','liar-town-played','liar-town-vote','liar-town-reveal','liar-town-end'];
      const tiles=suffixes.map(s=>{
        const file=path.join(out,`${size}-${s}.png`);assert(fs.existsSync(file),file);
        return `<figure><figcaption>${size} ${s}</figcaption><img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}"></figure>`;
      });
      await page.setContent(`<meta charset="utf-8"><style>body{margin:0;padding:12px;background:#ddd;font:18px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:white;padding:8px}figcaption{margin-bottom:6px}img{width:100%;height:420px;object-fit:contain;object-position:top}</style>${tiles.join('')}`);
      await page.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
      const file=path.join(out,`review-${size}.png`);await page.screenshot({path:file,fullPage:true});assert(fs.statSync(file).size>1000);
      console.log(file);
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
