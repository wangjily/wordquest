import fs from 'node:fs'
const BASE='http://127.0.0.1:9222'
const SITE='http://127.0.0.1:4173/'
const OUT='C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const now=Date.now()
const store={state:{profile:{name:'T',xp:1480,gems:42,streak:6,longestStreak:9,lastStudyDay:new Date().toISOString().slice(0,10),petXp:3020,seasonPoints:1480,totalReviews:88,correctReviews:74},settings:{uiLocale:'zh',nativeLocale:'zh',theme:'dark',dailyGoal:12,sound:true,targetLang:'en',activeDecks:['en-cet4'],onboarded:true},cards:{},logs:[],runs:[],achievements:[]},version:2}
const list=await(await fetch(`${BASE}/json`)).json()
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl)
let seq=0;const pending=new Map()
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id)}}
await new Promise(r=>ws.onopen=r)
const send=(m,p={})=>new Promise(res=>{const i=++seq;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.value
await send('Page.enable');await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:SITE});await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate',{url:`${SITE}?r=${Date.now()}#/`});await sleep(2600)
await ev(`window.scrollTo(0, document.body.scrollHeight)`)
await sleep(800)
const s=await send('Page.captureScreenshot',{format:'png'})
fs.writeFileSync(`${OUT}/home-bottom.png`, Buffer.from(s.data,'base64'))
console.log('ok')
ws.close()
