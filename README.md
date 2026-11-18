[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/ciperx/btc-breakout-24h/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/ciperx/btc-breakout-24h/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# btcbreak24

`main.ts` is a state machine for the `agent-fun/bars-replay/v1` protocol. A replay harness drives
it: `runBars` sends a `hello`, then one batch per bar, and the module answers with orders — no
clock, no network, no `await` in the policy itself.

The whole policy is the block of constants at the top of `main.ts`: lookback bars, entry margin
over the rolling high, the two profit targets, the stop, the max hold, the slippage cap. Change
those numbers to change behaviour; the code below them is bookkeeping.

`vendor/makefun-bars.ts` is the kit SDK vendored verbatim and left unmodified so the harness
contract stays exact. It runs under `node`, so `node main.ts` is the entry point.

Per-symbol history, entry price, half-taken flag and bar counter live in module maps and are
cleared on `hello`.