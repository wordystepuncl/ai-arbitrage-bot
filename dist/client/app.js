import { ASSETS, EXCHANGES, fetchQuotes, calculateRoutes, MAX_AGE_MS } from './market.js';
const $ = s => document.querySelector(s);
const strings = {
 download:'Download project',research:'Research environment',workspace:'WORKSPACE',overview:'Overview',routes:'Route explorer',history:'Session history',xray:'X-ray mode',guide:'How it works',publicdata:'Public market data',readOnly:'Read-only. No wallet connection.',workspaceTitle:'Workspace',eyebrow:'CROSS-EXCHANGE INTELLIGENCE',subtitle:'Three exchanges. One clear view. Find the spread, reveal the friction, and see what’s really left.',liveQuotes:'Live spot quotes',noKeys:'No API keys',transparent:'Transparent math',scanner:'Price scanner',auto:'Auto-refresh',compare:'Compare prices',ready:'Ready to scan',microscope:'Market microscope',dispersion:'Mid-price dispersion across available exchanges',waiting:'Waiting for live data',median:'Relative to the median mid-price',signal:'Signal lens',scanFirst:'A little perspective goes a long way.',signalIntro:'Scan the market to reveal the strongest cross-exchange route.',buyAt:'BUY AT ASK',sellAt:'SELL AT BID',gross:'Gross spread',net:'Est. net result',size:'Position size',method:'Explainable rules, not model predictions. Quotes are snapshots; execution and liquidity can change.',friction:'The friction simulator',adjust:'Move the numbers. Challenge the signal.',capital:'Research capital',buyFee:'Buy fee',sellFee:'Sell fee',slippage:'Slippage buffer',transfer:'Transfer cost',feeNote:'Fees are editable assumptions, not your account’s actual fee tier. Transfer delay is not modeled.',localSession:'THIS SESSION',export:'Export JSON',time:'Time',asset:'Asset',bestRoute:'Strongest route',sources:'Sources',historyEmpty:'Your first scan starts the story.',footer:'Observe the market. Understand the gap.',researchOnly:'Research only · No trade execution',guideTitle:'A price is just one perspective.',guideText:'We request public spot bid and ask prices from Binance, OKX and Gate in parallel. Every pair uses USDT. The scanner evaluates all six directed routes using the ask to buy and the bid to sell.',guideNote:'X-ray reveals response times and quote age. A green result is a mathematical estimate, not an executable promise. This tool does not use a trained AI model, submit orders or connect wallets.',shortcut:'Open the asset switcher',choose:'Choose your perspective',scanning:'Scanning exchanges…',live:'LIVE',offline:'OFFLINE',stale:'STALE',mid:'MID-PRICE / USDT',bid:'SELL / BID',ask:'BUY / ASK',unavailable:'Unavailable',feeds:'sources responding',age:'updated',seconds:'s ago',failed:'No live quotes. Retry or check exchange access in your region.',partial:'Partial data',expired:'Quotes expired. Run a fresh scan.',noRoute:'At least two fresh sources are needed.',noEdge:'The gap closes after costs.',edge:'A theoretical edge appeared.',noEdgeDesc:'The strongest route is still negative after your cost assumptions.',edgeDesc:'Positive under your assumptions. Check quote timing, depth and transfer constraints.',depth:'Your position exceeds displayed top-of-book size. Full-size execution is not modeled.',unknownDepth:'Liquidity depth is unavailable for one or more sources.',invalid:'Check the highlighted inputs.',xrayIntro:'Under the surface: response time is network latency, not execution speed. Binance and Gate expose no quote timestamp here; their age is measured from receipt.',received:'received',quoteAge:'quote age',latency:'response',bookSize:'top size',sixRoutes:'Directed routes · estimated net USDT',snapshot:'Snapshot',fresh:'fresh',timeout:'No response',scanAgain:'Compare prices',none:'—',updated:'Last scan',paused:'Auto-refresh paused in background',recorded:'recorded',inputRange:'Capital 1–1B; fees and slippage 0–10%; transfer 0–1B.',sourceUnavailable:'Public API unavailable; no fallback prices used.',staleDesc:'Routes are hidden when quotes are older than 30 seconds.',feeCost:'Estimated friction',downloadReady:'Snapshot exported'
};
let asset='ETH', snapshot=null, history=[], busy=false, generation=0, xray=false, autoNext=0;
const t = key => strings[key] || key;
const num = (n, digits=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const signed = (n, digits=3) => (n>0?'+':'') + num(n,digits);
const time = ms => new Date(ms).toLocaleTimeString('en-GB',{hour12:false});
const age = q => Math.max(0,Math.floor((Date.now()-q.receivedAt)/1000));
const freshQuotes = () => (snapshot?.quotes || []).filter(q=>q.status==='ok' && Date.now()-q.receivedAt<=MAX_AGE_MS);
function initializeUI() {
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 if(busy) $('#compare-label').textContent=t('scanning');
 render();renderHistory();
}
function options() {
 const fields=['capital','buy-fee','sell-fee','slippage','transfer'];
 const valid=fields.map(id=>{
   const el=$('#'+id); const isValid=el.value.trim()!==''&&el.checkValidity();
   el.setAttribute('aria-invalid',String(!isValid));return isValid;
 }).every(Boolean);
 $('#input-error').textContent=valid?'':t('inputRange');
 return valid?{capital:Number($('#capital').value),buyFee:Number($('#buy-fee').value),sellFee:Number($('#sell-fee').value),slippage:Number($('#slippage').value),transfer:Number($('#transfer').value)}:null;
}
function routes() { const o=options(); return o&&snapshot?calculateRoutes(snapshot.quotes,o):[]; }
function renderQuotes() {
 $('#quotes').innerHTML=EXCHANGES.map(ex=>{
  const q=snapshot?.quotes.find(q=>q.id===ex.id); const ok=q?.status==='ok'; const stale=ok&&Date.now()-q.receivedAt>MAX_AGE_MS;
  return `<article class="quote-card ${q&&!ok?'unavailable':''}"><div class="quote-head"><span class="exchange-icon ${ex.id}">${{binance:'✦',okx:'▦',gate:'◉'}[ex.id]}</span>${ex.name}<span class="quote-state" style="${stale?'color:#b5a16f':''}">${ok?'<span class="dot"></span>':''}${q?(ok?(stale?t('stale'):t('live')):t('offline')):'—'}</span></div><div class="quote-label">${t('mid')}</div><div class="quote-price">${ok?num(q.mid):'—'}<small>USDT</small></div><div class="quote-book"><div>${t('bid')}<b>${ok?num(q.bid):'—'}</b></div><div>${t('ask')}<b>${ok?num(q.ask):'—'}</b></div></div></article>`;
 }).join('');
}
function renderMicroscope() {
 const qs=freshQuotes();
 if(qs.length<2){$('#dispersion').textContent='—';$('#micro-chart').innerHTML=`<p class="empty-note">${t('waiting')}</p>`;return;}
 const sorted=qs.map(q=>q.mid).sort((a,b)=>a-b), median=sorted.length%2?sorted[Math.floor(sorted.length/2)]:(sorted[0]+sorted[1])/2;
 const deltas=qs.map(q=>({q,bps:(q.mid/median-1)*10000})); const max=Math.max(...deltas.map(d=>Math.abs(d.bps)),0.01);
 $('#dispersion').textContent=num((Math.max(...sorted)/Math.min(...sorted)-1)*10000,2);
 $('#micro-chart').innerHTML=deltas.map(({q,bps})=>`<div class="micro-row"><span>${q.name}</span><div class="micro-track"><span class="micro-bar" style="left:${bps<0?50-Math.abs(bps)/max*48:50}%;width:${Math.max(Math.abs(bps)/max*48,.5)}%"></span></div><span class="micro-value">${signed(bps,2)}</span></div>`).join('');
}
function renderSignal() {
 const rs=routes(), best=rs[0];
 $('#route-buy').textContent=best?.buy.name||'—';$('#route-sell').textContent=best?.sell.name||'—';
 $('#gross').textContent=best?signed(best.grossPct)+'%':'—';
 $('#net').textContent=best?signed(best.net,2)+' USDT':'—';$('#net').className=best?(best.net>0?'positive':'negative'):'';
 $('#quantity').textContent=best?num(best.quantity,5)+' '+asset:'—';
 $('#signal-status').classList.toggle('positive',!!best&&best.net>0);
 $('#signal-title').textContent=best?t(best.net>0?'edge':'noEdge'):t(snapshot?'noRoute':'scanFirst');
 let description=best?t(best.net>0?'edgeDesc':'noEdgeDesc'):t(snapshot?'staleDesc':'signalIntro');
 if(best?.depthExceeded) description+=' '+t('depth'); else if(best&&!best.depthKnown) description+=' '+t('unknownDepth');
 $('#signal-description').textContent=description;
 $('#xray-details').hidden=!xray;
 $('#xray').setAttribute('aria-pressed',String(xray));$('#xray span').textContent=xray?'ON':'OFF';
 document.body.classList.toggle('xray-mode',xray);
 if(xray){
  let html=`<p>${t('xrayIntro')}</p>`;
  for(const q of snapshot?.quotes||[]) html+=q.status==='ok'?`<div class="xray-row"><b>${q.name}</b><span>${t('latency')} ${q.latencyMs} ms · ${t(q.exchangeTime?'quoteAge':'received')} ${Math.max(0,Math.floor((Date.now()-(q.exchangeTime||q.receivedAt))/1000))}s · ${t('bookSize')} ${q.bidSize==null?'?':num(q.bidSize,4)} / ${q.askSize==null?'?':num(q.askSize,4)} ${asset}</span></div>`:`<div class="xray-row"><b>${q.name}</b><span>${t('sourceUnavailable')}</span></div>`;
  if(rs.length)html+=`<p style="margin-top:18px">${t('sixRoutes')}</p>`+rs.map(r=>`<div class="xray-row"><span>${r.buy.name} → ${r.sell.name}${r.depthExceeded?' *':''}</span><span>${signed(r.net,4)} USDT</span></div>`).join('')+`<p class="xray-note">* ${t('depth')}</p>`;
  $('#xray-details').innerHTML=html;
 }
}
function renderStatus() {
 const fresh=freshQuotes().length, all=snapshot?.quotes.filter(q=>q.status==='ok').length||0;
 $('#compare-label').textContent=t(busy?'scanning':'compare');
 if(busy){$('#feed-status').textContent=t('scanning');}
 else if(!snapshot){$('#feed-status').textContent=t('ready');}
 else if(!all){$('#feed-status').textContent=t('failed');}
 else if(!fresh){$('#feed-status').textContent=t('expired');}
 else{$('#feed-status').textContent=`${fresh} / 3 ${t('feeds')}${fresh<3?' · '+t('partial'):''}`;}
 $('#feed-dot').style.background=fresh===3?'var(--green)':fresh?'#d6ba7c':'#60616e';
 $('#last-updated').textContent=snapshot?`${t('updated')} ${time(snapshot.fetchedAt)} · ${Math.max(0,Math.floor((Date.now()-snapshot.fetchedAt)/1000))}${t('seconds')}`:'—';
}
function render() { renderQuotes();renderMicroscope();renderSignal();renderStatus(); }
function renderHistory() {
 $('#history-count').textContent=history.length;
 if(!history.length){$('#history-body').innerHTML=`<tr><td colspan="6" class="empty-note">${t('historyEmpty')}</td></tr>`;return;}
 $('#history-body').innerHTML=history.slice(0,20).map(h=>`<tr><td>${time(h.fetchedAt)}</td><td><span class="history-asset"><span class="dot"></span>${h.asset}</span></td><td>${h.best?h.best.buy+' → '+h.best.sell:'—'}</td><td>${h.best?signed(h.best.grossPct)+'%':'—'}</td><td class="${h.best?.net>0?'positive':'negative'}">${h.best?signed(h.best.net,2)+' USDT':'—'}</td><td>${h.quotes.filter(q=>q.status==='ok').length} / 3</td></tr>`).join('');
}
function selectAsset(next) {
 if(!ASSETS.includes(next)||next===asset)return;
 generation++;asset=next;snapshot=null;busy=false;
 $('#compare').disabled=false;document.body.classList.remove('loading');
 document.querySelectorAll('[data-asset]').forEach(b=>{b.classList.toggle('selected',b.dataset.asset===asset);b.setAttribute('aria-pressed',String(b.dataset.asset===asset));});
 $('#pair-label').textContent=asset+' / USDT';render();
 if($('#auto').checked)scan();
}
async function scan() {
 if(busy)return;
 const id=++generation, selected=asset;busy=true;
 $('#compare').disabled=true;document.body.classList.add('loading');renderStatus();
 let data;
 try {
  data=await fetchQuotes(selected);
  if(data.asset!==selected||!Array.isArray(data.quotes))throw Error('Invalid quote batch');
 }catch{data={asset:selected,quoteCurrency:'USDT',fetchedAt:Date.now(),quotes:EXCHANGES.map(q=>({id:q.id,name:q.name,status:'error',error:'unavailable'}))};}
 if(id!==generation)return;
 snapshot=data;busy=false;autoNext=Date.now()+15000;document.body.classList.remove('loading');$('#compare').disabled=false;
 const o=options(),best=o?calculateRoutes(data.quotes,o)[0]:null;
 history.unshift({...structuredClone(data),assumptions:o,best:best?{buy:best.buy.name,sell:best.sell.name,grossPct:best.grossPct,net:best.net}:null});
 if(history.length>100)history.pop();$('#export').disabled=false;render();renderHistory();
}
$('#compare').addEventListener('click',scan);
for(const b of document.querySelectorAll('[data-asset]')) b.addEventListener('click',()=>selectAsset(b.dataset.asset));
for(const id of ['capital','buy-fee','sell-fee','slippage','transfer'])$('#'+id).addEventListener('input',renderSignal);
const toggleXray=()=>{xray=!xray;renderSignal();};
$('#xray').addEventListener('click',toggleXray);$('#xray-nav').addEventListener('click',()=>{toggleXray();$('#scanner-title').scrollIntoView({block:'start'});});
$('#auto').addEventListener('change',()=>{autoNext=Date.now()+15000;if($('#auto').checked)scan();});
$('#guide-open').addEventListener('click',()=>$('#guide').showModal());$('#guide-close').addEventListener('click',()=>$('#guide').close());
for(const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
for(const b of document.querySelectorAll('[data-command]')) b.addEventListener('click',()=>{selectAsset(b.dataset.command);$('#command').close();});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#command').open)$('#command').showModal();else $('#command').close();}
 if($('#command').open&&['1','2','3'].includes(e.key)){selectAsset(ASSETS[Number(e.key)-1]);$('#command').close();}
});
$('#export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({project:'PARALLAX',exportedAt:new Date().toISOString(),note:'Research snapshots. Prices in USDT. Historical estimates use assumptions recorded at scan time.',scans:history},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='parallax-session-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
setInterval(()=>{
 if(snapshot){renderStatus();renderQuotes();renderMicroscope();renderSignal();}
 if($('#auto').checked&&!document.hidden&&!busy&&Date.now()>=autoNext)scan();
},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();if($('#auto').checked&&Date.now()>=autoNext)scan();}});
initializeUI();scan();
