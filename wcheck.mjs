import puppeteer from 'puppeteer-core'
const br=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']})
for (const n of ['01','02','06','08','17','18']) {
  const p=await br.newPage()
  await p.goto(`http://localhost:4188/lectures/${n}`,{waitUntil:'networkidle0',timeout:60000})
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=900){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}})
  await new Promise(r=>setTimeout(r,900))
  const r=await p.evaluate(()=>{
    const roots=[...document.querySelectorAll('.vp-doc div')].filter(d=>/(^|\s)lab(\s|$)/.test(d.className))
    return { labRoots: roots.length,
      titles: roots.map(d=>d.querySelector('.lab__title,.lab__head,h3,strong')?.textContent?.trim().slice(0,34)||'—'),
      inputs: document.querySelectorAll('.lab input,.lab button,.lab select').length,
      canvas: document.querySelectorAll('.lab canvas, .lab svg').length }
  })
  console.log(`лекція ${n}: віджетів=${r.labRoots} контролів=${r.inputs} графіка=${r.canvas}  ${r.titles.join(' · ')}`)
  await p.close()
}
await br.close()
