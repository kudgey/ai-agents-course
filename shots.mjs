import puppeteer from 'puppeteer-core'
const br=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox','--hide-scrollbars']})
for (const [n,file] of [['02','w02.png'],['08','w08.png'],['18','w18.png']]) {
  const p=await br.newPage()
  await p.setViewport({width:1400,height:1000,deviceScaleFactor:2})
  await p.goto(`http://localhost:4188/lectures/${n}`,{waitUntil:'networkidle0',timeout:60000})
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=900){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}})
  const box=await p.evaluate(()=>{const e=document.querySelector('.vp-doc [class$="__title"]')?.closest('div[class]');e?.scrollIntoView({block:'center'});return null})
  await new Promise(r=>setTimeout(r,900))
  await p.screenshot({path:file}); await p.close()
  console.log('знято', file)
}
await br.close()
