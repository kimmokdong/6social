/* 실행: node fake-traveler/tests/verify-runner.js [story|liar|edges|replay|legacy|details|endings|fix1] [너비 높이]
 * 기존 Playwright 검사 함수들을 같은 Chrome 환경에서 실행하고 결과를 남긴다. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('../output/.npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'check-verify');
const mode = process.argv[2] || 'story', width = Number(process.argv[3] || 1366), height = Number(process.argv[4] || 768);
const files = {story:'tests/verify-ui.js', liar:'tests/verify-ui.js', edges:'tests/verify-edges.js', replay:'tests/verify-replay-ui.js', legacy:'js/replay-ui-check.js',details:'tests/verify-details.js',endings:'tests/verify-endings.js',fix1:'tests/verify-fix1.js'};
assert(files[mode] && width > 0 && height > 0, '검사 모드와 해상도를 확인하세요');
fs.mkdirSync(out, {recursive:true});
const log = path.join(out, `latest-${mode}-${width}x${height}.json`);
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  let result;
  const diagnostics = [];
  browser.on('context', context => context.on('page', page => {
    page.on('console', msg => { if(msg.type()==='error') diagnostics.push({message:msg.text(),location:msg.location()}); });
    page.on('pageerror', error => diagnostics.push({message:error.message}));
    page.on('requestfailed', req => diagnostics.push({url:req.url(),failure:req.failure()}));
  }));
  try {
    const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    let source = fs.readFileSync(path.join(root, files[mode]), 'utf8');
    // 구형 검사의 임시 스크린샷도 지시된 게임 검수 폴더에만 저장한다.
    if (mode === 'legacy') source = source.replace('C:/Users/hyunseung/AppData/Local/Temp/sahoe-games-replay-check/', root.replaceAll('\\','/') + '/check-verify/legacy-');
    const run = new Function('return (' + source + '\n)')();
    result = await run(page, mode);
    assert.equal(result.errors.length, 0, '콘솔·페이지 오류');
    assert.equal(diagnostics.filter(x => x.message).length, 0, '첫 로딩과 별도 창을 포함한 콘솔·페이지 오류');
    for(const layout of result.layouts || [])for(const key of ['smallButtons','smallText','smallButtonText','clipped','clippedModalHeading'])assert.equal((layout[key] || []).length,0,`${layout.label}: ${key}`);
    fs.writeFileSync(log, JSON.stringify({status:'pass', ...result,diagnostics}, null, 2));
    console.log(JSON.stringify({mode,width,height,status:'pass',checks: Array.isArray(result.checks) ? result.checks.length : result.checks,captures:result.captures.length,log}));
  } catch (error) {
    fs.writeFileSync(log, JSON.stringify({status:'fail',...result,diagnostics,error:error.stack}, null, 2));
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
