import puppeteer from 'puppeteer-core'
const B='http://localhost:4188'
const br=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']})
let bad=0, total=0
for (const path of ['/', '/labs', ...Array.from({length:18},(_,i)=>`/lectures/${String(i+1).padStart(2,'0')}`)]) {
  const p=await br.newPage(); const failed=[]
  p.on('requestfailed', r => { if (/\.(png|jpg|jpeg|svg|webp|gif)/i.test(r.url())) failed.push(r.url().split('/').pop()) })
  p.on('response', r => { if (/\.(png|jpg|jpeg|svg|webp|gif)/i.test(r.url()) && r.status()>=400) failed.push(r.status()+' '+r.url().split('/').pop()) })
  await p.setViewport({width:1400,height:1000})
  await p.goto(B+path,{waitUntil:'networkidle0',timeout:60000})
  // домотати до низу, щоб спрацював lazy-loading
  await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=800){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60)) } })
  await new Promise(r=>setTimeout(r,1500))
  const r=await p.evaluate(()=>{const im=[...document.images];return{n:im.length,broken:im.filter(i=>i.naturalWidth===0).map(i=>i.getAttribute('src')?.split('/').pop())}})
  total+=r.n; bad+=r.broken.length
  if (r.broken.length||failed.length) console.log(`${path}: битих=${r.broken.length} ${r.broken.join(',')} | мережа: ${failed.join(',')}`)
  await p.close()
}
console.log(`\nзображень усього: ${total}, битих: ${bad}`)
await br.close()
