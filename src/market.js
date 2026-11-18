/** Shared by the browser, Worker and tests. Public spot data only. */
export const ASSETS = ['ETH', 'BTC', 'BNB'];
export const MAX_AGE_MS = 30_000;
export const EXCHANGES = [
  { id: 'binance', name: 'Binance', url: a => `https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=${a}USDT`, parse: d => ({ bid: d.bidPrice, ask: d.askPrice, bidSize: d.bidQty, askSize: d.askQty }) },
  { id: 'okx', name: 'OKX', url: a => `https://www.okx.com/api/v5/market/ticker?instId=${a}-USDT`, parse: d => {
    if (d.code !== '0' || !d.data?.[0]) throw new Error('Invalid OKX response');
    const q = d.data[0];
    return { bid: q.bidPx, ask: q.askPx, bidSize: q.bidSz, askSize: q.askSz, last: q.last, exchangeTime: Number(q.ts) };
  } },
  { id: 'gate', name: 'Gate', url: a => `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${a}_USDT`, parse: d => {
    if (!Array.isArray(d) || !d[0]) throw new Error('Invalid Gate response');
    return { bid: d[0].highest_bid, ask: d[0].lowest_ask, bidSize: d[0].highest_size, askSize: d[0].lowest_size, last: d[0].last };
  } }
];
export function normalizeQuote(exchange, raw, receivedAt, latencyMs) {
  const bid = Number(raw.bid), ask = Number(raw.ask);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0 || bid > ask) throw new Error('Invalid bid / ask');
  if (raw.exchangeTime && (!Number.isFinite(raw.exchangeTime) || receivedAt - raw.exchangeTime > MAX_AGE_MS || raw.exchangeTime > receivedAt + 5000)) throw new Error('Stale exchange quote');
  const size = v => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
  return { id: exchange.id, name: exchange.name, status: 'ok', bid, ask, mid: (bid + ask) / 2,
    last: size(raw.last), bidSize: size(raw.bidSize), askSize: size(raw.askSize),
    receivedAt, exchangeTime: raw.exchangeTime || null, latencyMs: Math.round(latencyMs) };
}
export async function fetchQuotes(asset, fetcher = fetch) {
  if (!ASSETS.includes(asset)) throw new Error('Unsupported asset');
  const results = await Promise.allSettled(EXCHANGES.map(async exchange => {
    const start = Date.now();
    const response = await fetcher(exchange.url(asset), { signal: AbortSignal.timeout(9000), cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = exchange.parse(await response.json());
    return normalizeQuote(exchange, raw, Date.now(), Date.now() - start);
  }));
  return { asset, quoteCurrency: 'USDT', fetchedAt: Date.now(), quotes: results.map((r, i) => r.status === 'fulfilled' ? r.value : {
    id: EXCHANGES[i].id, name: EXCHANGES[i].name, status: 'error', error: r.reason?.name === 'TimeoutError' ? 'timeout' : 'unavailable'
  }) };
}
/** Buys at ask, sells at bid. Estimates two trading fees plus slippage and a fixed transfer cost. */
export function calculateRoutes(quotes, { capital = 1000, buyFee = 0.1, sellFee = 0.1, slippage = 0.05, transfer = 0 } = {}, now = Date.now()) {
  if (![capital, buyFee, sellFee, slippage, transfer].every(Number.isFinite) || capital <= 0 || capital > 1e9 || [buyFee, sellFee, slippage].some(n => n < 0 || n > 10) || transfer < 0) return [];
  const fresh = quotes.filter(q => q.status === 'ok' && now - q.receivedAt <= MAX_AGE_MS && q.receivedAt <= now + 5000);
  const routes = [];
  for (const buy of fresh) for (const sell of fresh) {
    if (buy.id === sell.id) continue;
    const quantity = capital / ((1 + buyFee / 100) * buy.ask);
    const proceeds = quantity * sell.bid * (1 - sellFee / 100) * (1 - slippage / 100) - transfer;
    const net = proceeds - capital;
    routes.push({ buy, sell, quantity, grossPct: (sell.bid / buy.ask - 1) * 100, net, netPct: net / capital * 100,
      costs: capital * buyFee / (100 + buyFee) + quantity * sell.bid - proceeds,
      depthKnown: buy.askSize != null && sell.bidSize != null,
      depthExceeded: (buy.askSize != null && quantity > buy.askSize) || (sell.bidSize != null && quantity > sell.bidSize) });
  }
  return routes.sort((a, b) => b.net - a.net);
}
