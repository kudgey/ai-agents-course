import puppeteer from 'puppeteer-core'
const EXP={'01':3,'02':5,'03':2,'04':1,'05':1,'06':1,'07':1,'08':1,'09':1,'10':1,'11':1,'12':1,'13':1,'14':1,'15':1,'16':1,'17':1,'18':1}
const br=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']})
let ok=0, tot=0, errs=[]
for (const [n,exp] of Object.entries(EXP)) {
  const p=await br.newPage(); const je=[]
  p.on('pageerror',e=>je.push(e.message.slice(0,70)))
  await p.goto(`http://localhost:4188/lectures/${n}`,{waitUntil:'networkidle0',timeout:60000})
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=900){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}})
  await new Promise(r=>setTimeout(r,700))
  const got=await p.evaluate(()=>document.querySelectorAll('.vp-doc [class$="__title"]').length)
  const ctl=await p.evaluate(()=>document.querySelectorAll('.vp-doc input,.vp-doc button:not(.VPSwitch):not([class*="VP"]),.vp-doc select').length)
  tot+=got; if(got===exp) ok++; else errs.push(`лекція ${n}: очікувано ${exp}, змонтовано ${got}`)
  if(je.length) errs.push(`лекція ${n} JS: ${je.join(' | ')}`)
  console.log(`  ${n}: очікувано ${exp}, змонтовано ${got}, контролів ${ctl} ${got===exp?'✓':'✗'}`)
  await p.close()
}
console.log(`\nсторінок збіглося: ${ok}/18, віджетів змонтовано: ${tot}/25`)
console.log(errs.length?'ПРОБЛЕМИ:\n  '+errs.join('\n  '):'усі віджети змонтовані ✓')
await br.close()
