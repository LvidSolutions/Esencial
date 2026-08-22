# Lighthouse evidence summary

Pinned Lighthouse 12.8.2 with Chrome 151 and simulated throttling. Values are medians; raw JSON is retained in `baseline/lighthouse/` and `final-stable/lighthouse/`.

| Case | Score | LCP ms | CLS | Transfer MiB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| about-desktop | 90 → 98 | 2085 → 1045 | 0.000 → 0.000 | 2.00 → 0.86 | 12 → 13 |
| about-mobile | 69 → 81 | 12005 → 4096 | 0.000 → 0.000 | 2.00 → 0.51 | 12 → 13 |
| home-desktop | 75 → 98 | 8609 → 1030 | 0.000 → 0.000 | 16.22 → 3.27 | 65 → 27 |
| home-mobile | 66 → 70 | 25440 → 5571 | 0.000 → 0.000 | 16.22 → 3.00 | 65 → 23 |
| project-desktop | 100 → 100 | 527 → 528 | 0.000 → 0.000 | 0.35 → 0.35 | 7 → 7 |
| project-mobile | 96 → 96 | 2556 → 2557 | 0.000 → 0.000 | 0.35 → 0.35 | 8 → 7 |

INP is not reported because navigation-only Lighthouse lab runs do not provide valid field INP. Synthetic interaction latency is recorded separately in `runtime-evidence.json`.
