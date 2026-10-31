const BASE='http://127.0.0.1:9222'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const list=await (await fetch(`${BASE}/json`)).json()
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl)
let seq=0;const pending=new Map();const errs=[];const fails=[]
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails.text);else if(m.method==='Network.loadingFailed')fails.push(m.params.errorText)}
await new Promise(r=>ws.onopen=r)
const send=(m,p={})=>new Promise(res=>{const i=++seq;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.value
await send('Page.enable');await send('Runtime.enable');await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:process.argv[2]})
await sleep(6000)
console.log('url',await ev('location.href'))
console.log('title',await ev('document.title'))
console.log('text',(await ev('document.body.innerText')||'').slice(0,200).replace(/\n/g,' | '))
console.log('scripts',await ev(`Array.from(document.querySelectorAll('script[src]')).map(s=>s.getAttribute('src'))`))
console.log('errs',errs.slice(0,4),'fails',fails.slice(0,4))
ws.close()
