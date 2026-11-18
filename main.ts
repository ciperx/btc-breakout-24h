// Breakout bot for agent-fun/bars-replay/v1: it buys when a fresh close clears the symbol's own
// 90-bar high, takes half the position at +30 bps and the rest at +40 bps, and leaves on an 80 bps
// stop or after 240 bars. Between trades it sits in cash, so a falling window costs it nothing.
import { BPS, runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const LOOKBACK = 240;
const ENTRY_MARGIN = 25n;            // bps above the 240-bar high
const FIRST_TARGET = 80n;           // bps on the entry price
const FINAL_TARGET = 120n;
const STOP = 250n;
const MAX_HOLD = 600;
const SLIP_BPS = 400;
const BUFFER = 1_000n;              // quote raw units kept back for the fee

const history = new Map<string, bigint[]>();
const entryPrice = new Map<string, bigint>();
const tookHalf = new Set<string>();
const barsHeld = new Map<string, number>();

function onBatch(state: BarsState): OrderInput[] {
  const orders: OrderInput[] = [];
  for (const symbol of state.symbols.keys()) {
    const close = state.close(symbol);
    if (close === null) continue;
    const seen = history.get(symbol) ?? [];
    const held = state.positions.get(symbol);

    if (held !== undefined && held.qty > 0n) {
      const bars = (barsHeld.get(symbol) ?? 0) + 1;
      barsHeld.set(symbol, bars);
      const entry = entryPrice.get(symbol);
      const base = entry !== undefined && entry > 0n ? entry : null;
      if (base !== null) {
        const moveBps = ((close - base) * BPS) / base;
        if (!tookHalf.has(symbol) && moveBps >= FIRST_TARGET) {
          const part = held.qty / 2n;
          if (part > 0n) {
            orders.push({ side: 'sell', symbol, qty: part, max_slippage_bps: SLIP_BPS });
            tookHalf.add(symbol);
            continue;
          }
        }
        if (moveBps >= FINAL_TARGET || moveBps <= -STOP || bars >= MAX_HOLD) {
          orders.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: SLIP_BPS });
          entryPrice.delete(symbol); tookHalf.delete(symbol); barsHeld.delete(symbol);
          continue;
        }
      }
    }

    seen.push(close);
    if (seen.length > LOOKBACK + 1) seen.shift();
    history.set(symbol, seen);

    if (state.warmingUp || state.positions.size > 0 || seen.length <= LOOKBACK) continue;
    const window = seen.slice(0, seen.length - 1);
    let high = 0n;
    for (const value of window) if (value > high) high = value;
    if (high === 0n) continue;
    const trigger = (high * (BPS + ENTRY_MARGIN)) / BPS;
    if (close <= trigger) continue;

    const room = state.weightRoom(symbol);
    let spend = state.cash > BUFFER ? state.cash - BUFFER : 0n;
    if (spend > room) spend = room;
    if (spend <= 0n) continue;
    orders.push({ side: 'buy', symbol, notional_quote_units: spend, max_slippage_bps: SLIP_BPS });
    entryPrice.set(symbol, close);
    tookHalf.delete(symbol);
    barsHeld.set(symbol, 0);
  }
  return orders;
}

runBars({
  onHello: () => { history.clear(); entryPrice.clear(); tookHalf.clear(); barsHeld.clear(); },
  onBatch: (state) => onBatch(state),
});
