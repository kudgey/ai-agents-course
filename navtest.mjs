import puppeteer from 'puppeteer-core'
const base = process.argv[2]
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--hide-scrollbars']})
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push('JS: '+e.message))
p.on('requestfailed', r => errs.push('404: '+r.url().split('/').slice(-1)[0]))
await p.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 2 })
await p.goto(base + '/lectures/02', { waitUntil:'networkidle0', timeout:60000 })
await new Promise(r=>setTimeout(r,2500))
const font = await p.evaluate(() => getComputedStyle(document.body).fontFamily)
const widget = await p.evaluate(() => document.querySelectorAll('.tl__tok').length)
const imgs = await p.evaluate(() => [...document.images].filter(i=>!i.complete||i.naturalWidth===0).length)
const link = await p.$('a[href$="/lectures/03"]')
if (link) { await link.click(); await new Promise(r=>setTimeout(r,2000)) }
const h1 = await p.evaluate(() => document.querySelector('h1')?.textContent?.slice(0,40))
console.log('шрифт:', font.split(',')[0], '| токенів у віджеті:', widget, '| битих картинок:', imgs)
console.log('перехід →', p.url().split('/').slice(-1)[0], '|', h1)
console.log('помилки:', errs.slice(0,4).join(' | ') || 'немає')
await p.screenshot({ path: process.argv[3] }); await b.close()
