import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCHANGES, normalizeQuote, fetchQuotes, calculateRoutes, MAX_AGE_MS } from '../src/market.js';
const now=Date.now();
const quote=(id,bid,ask,extra={})=>({id,name:id,status:'ok',bid,ask,mid:(bid+ask)/2,receivedAt:now,askSize:100,bidSize:100,...extra});
test('buy at ask and sell at bid on distinct exchanges, include both fees, slippage and transfer',()=>{
 const routes=calculateRoutes([quote('a',99,100),quote('b',102,103)],{capital:1000,buyFee:1,sellFee:2,slippage:0.5,transfer:3},now);
 assert.equal(routes.length,2);assert.equal(routes[0].buy.id,'a');assert.equal(routes[0].sell.id,'b');
 const qty=1000/(100*1.01),expected=qty*102*.98*.995-3-1000;
 assert.ok(Math.abs(routes[0].net-expected)<1e-10);
});
test('fees eliminate a small positive gross spread',()=>{
 const [best]=calculateRoutes([quote('a',99.99,100),quote('b',100.1,100.11)],{},now);
 assert.ok(best.grossPct>0);assert.ok(best.net<0);
});
test('stale, failed and single-source quotes cannot yield a route',()=>{
 assert.equal(calculateRoutes([quote('a',99,100),quote('b',102,103,{receivedAt:now-MAX_AGE_MS-1}),{status:'error',id:'c'}],{},now).length,0);
});
test('liquidity limitations are explicit',()=>{
 const [r]=calculateRoutes([quote('a',99,100,{askSize:.01}),quote('b',102,103)],{},now);assert.equal(r.depthExceeded,true);
});
test('bad numeric inputs and crossed books are rejected',()=>{
 for(const input of [{capital:NaN},{capital:-1},{capital:Infinity},{buyFee:-.1},{slippage:11}]) assert.equal(calculateRoutes([],input,now).length,0);
 for(const raw of [{bid:2,ask:1},{bid:0,ask:1},{bid:'bad',ask:1},{bid:1,ask:2,exchangeTime:now-60000}]) assert.throws(()=>normalizeQuote(EXCHANGES[0],raw,now,4));
});
test('one exchange failing preserves other live quotes; no fabricated fallback',async()=>{
 const fake=async url=>{
  if(url.includes('binance'))return new Response(JSON.stringify({bidPrice:'100',askPrice:'101',bidQty:'5',askQty:'6'}));
  if(url.includes('okx'))return new Response('Unavailable',{status:503});
  return new Response(JSON.stringify([{highest_bid:'102',lowest_ask:'103',highest_size:'4',lowest_size:'5',last:'102'}]));
 };
 const result=await fetchQuotes('ETH',fake);assert.deepEqual(result.quotes.map(q=>q.status),['ok','error','ok']);assert.equal(result.quotes[1].bid,undefined);
});
test('unsupported assets are rejected before making an outbound request',async()=>{
 let called=false;await assert.rejects(fetchQuotes('DOGE',()=>{called=true;}));assert.equal(called,false);
});
