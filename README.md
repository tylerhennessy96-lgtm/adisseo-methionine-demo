# Adisseo — Dynamica Methionine Pricing Cockpit (demo)

Illustrative reskin of the Dynamica pricing demo for Adisseo's Methionine business. No new modelling behind the screens — labels and mock data only, so the Adisseo team can picture their future Methionine Pricing Cockpit.

**Story:** Market signals & leading indicators → Market Price Forecast → Price Guidance / Corridor → Explanation → Human decision.

## Run it

```
python3 -m http.server 8643 --directory adisseo
```

then open http://localhost:8643/pricing.html

## Screens

- **Price Cockpit** (`pricing.html`) — Global › Region › Country › Product. Key indicators per product-market: Capacity Utilization, Order Intake % of plan, Demand Momentum, Market Signal, Feedinfo, Boyar, Variable Cost. Price Guidance with a recommended corridor, Increase/Decrease/Hold chips, accept / reject / bulk override / commit.
  - Click a guidance or order-intake value → **Market Price Forecast** modal: 26-week benchmark history + 8-week forecast with expected range, order intake vs plan, key indicators, guidance corridor and the **explanation drivers**.
  - Click a capacity value → Capacity Utilization & Market Price panel (Feedinfo, Boyar, Adisseo price, variable cost).
  - Click a current price → Price History panel.
- **Autopilot** — per-market on/off and auto-accept band.
- **Parameters** — price change limits, guidance corridor & margin floor, benchmark weighting, alert thresholds.

## Data

`data.js` — 3 regions, 11 countries, 2 products (Met Powder DL-Met 99%, Liquid Methionine MHA-FA 88%) = 22 product-markets. EUR/t in Europe, USD/t elsewhere. One seeded "market strength" signal per product-market drives every indicator so benchmarks, demand, capacity, forecast, guidance and alerts always tell the same story. Demo date: 21 Sep 2026.
