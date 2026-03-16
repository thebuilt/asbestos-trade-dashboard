# India Asbestos Trade Insight Dashboard

Static dashboard for India's asbestos trade using public WITS country trade pages.

## What it shows

- Import map for India's raw asbestos inflows
- Export map for India's asbestos-related product outflows
- Re-export trail map for a clicked export partner, seeded with UAE onward exports
- Zoom, pan, reset controls on all world maps
- Gradient legends so the darkest country is the largest trade partner
- India HSN to WITS HS6 mapping table

## Files

- `index.html`: page structure
- `styles.css`: dashboard styling
- `app.js`: world-map rendering, zoom/pan, rankings
- `data/trade-data.json`: curated trade dataset and HSN mapping
- `data/reexports-data.json`: onward-export datasets for selected partner countries
- `data/countries-110m.json`: world topology
- `vendor/`: local D3 and TopoJSON runtime files

## WITS pattern used

Public WITS trade pages follow this pattern:

```text
https://wits.worldbank.org/trade/comtrade/en/country/{reporter}/year/{year}/tradeflow/{Imports|Exports}/partner/ALL/product/{hs6}
```

Examples used in this dashboard:

- `IND / 2023 / Imports / 252400`
- `IND / 2023 / Exports / 681290`
- `IND / 2023 / Exports / 681390`

## Why the dashboard rolls up to HS6

The user-supplied India codes are 8-digit HSN entries, but in this implementation the map uses public
WITS HS6 pages because:

- the WITS API intro page is public
- the raw-trade query page is an authenticated interface
- HS6 public partner pages were directly retrievable for the mapped products above

If you later get authenticated raw-trade access, `data/trade-data.json` can be extended to India HS8
without changing the UI structure.

## Re-export layer

The relay map is meant to get closer to likely end-user markets when a first destination may be acting
as a transit or trade hub. It does not prove final consumption, but it gives a more grounded second
step than stopping at the first import partner. The first seeded relay reporter is the United Arab
Emirates.

## Small-country note

The simplified `countries-110m.json` world topology may omit a few small partner economies from the
map geometry itself. Those partners still remain visible in the ranking table and detail panel.
