import puppeteer from 'puppeteer-core'
const B = 'http://localhost:4188'
const br = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--hide-scrollbars'] })
const pages = ['/', '/labs', ...Array.from({length:18},(_,i)=>`/lectures/${String(i+1).padStart(2,'0')}`)]
const SHOT = { '/lectures/02':'w02.png', '/lectures/08':'w08.png', '/lectures/17':'w17.png' }
let totalWidgets = 0; const problems = []
for (const path of pages) {
  const p = await br.newPage(); const errs = []
  p.on('pageerror', e => errs.push('JS: ' + e.message.slice(0,90)))
  p.on('requestfailed', r => errs.push('REQ: ' + r.url().split('/').pop()))
  await p.setViewport({ width:1500, height:1050, deviceScaleFactor:2 })
  await p.goto(B + path, { waitUntil:'networkidle0', timeout:60000 })
  await new Promise(r=>setTimeout(r,1200))
  const r = await p.evaluate(() => ({
    widgets: document.querySelectorAll('.lab').length,
    controls: document.querySelectorAll('.lab input, .lab button, .lab select').length,
    brokenImg: [...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,
    mjx: document.querySelectorAll('mjx-container').length,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0,58) || '—',
    emptyH2: [...document.querySelectorAll('.vp-doc h2')].filter(h=>{
      let n=h.nextElementSibling, txt=''
      while(n && !/^H[12]$/.test(n.tagName)){ txt += n.textContent||''; n=n.nextElementSibling }
      return txt.trim().length < 10 }).map(h=>h.textContent.trim()).slice(0,3),
  }))
  totalWidgets += r.widgets
  if (errs.length || r.brokenImg) problems.push(`${path}: ${errs.slice(0,3).join(' | ')}${r.brokenImg?` битих img=${r.brokenImg}`:''}`)
  if (r.emptyH2.length) problems.push(`${path}: порожній розділ → ${r.emptyH2.join(' / ')}`)
  console.log(`${path.padEnd(15)} віджет=${String(r.widgets).padStart(2)} контр=${String(r.controls).padStart(3)} формул=${String(r.mjx).padStart(3)} битих=${r.brokenImg}  ${r.h1}`)
  if (SHOT[path]) {
    await p.evaluate(() => document.querySelector('.lab')?.scrollIntoView({block:'center'}))
    await new Promise(r=>setTimeout(r,500))
    await p.screenshot({ path: SHOT[path] })
  }
  await p.close()
}
console.log(`\nвіджетів усього: ${totalWidgets}`)
console.log(problems.length ? 'ПРОБЛЕМИ:\n  ' + problems.join('\n  ') : 'проблем не знайдено ✓')
await br.close()
