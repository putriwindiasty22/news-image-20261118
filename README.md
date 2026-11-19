# The World Today — Wednesday 18 November 2026

[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

A deterministic 1024x1024 newspaper front page that sums up the world news of
Wednesday 18 November 2026 in a single image. `main.ts` (Node 22, standard
library only, no network at runtime) draws the page with a hand-made 5x7
bitmap font and a hand-written PNG encoder, and writes it to
`$MAKEFUN_OUTPUT_DIR/entry.png` (default `/output`). The output is
byte-identical on every run.

Referral code: `j9d1a2d9`

## The stories in the image

**Lead story — Xi and Putin meet in Shenzhen.** Xi Jinping and Vladimir Putin
opened talks in Shenzhen, a day before a first-ever three-way summit with US
President Donald Trump, as APEC leaders gathered in the same city.

1. **US strikes Iran site as Iran hits Gulf bases.** US jets struck a Guard
   missile site on Qeshm Island; Iran then fired drones at US sites in Kuwait
   and Bahrain, and a UAE ship was hit in the Strait of Hormuz.
2. **Kerch Bridge hit again as road span falls.** Ukraine struck the Kerch
   Bridge to Crimea for a second day; part of the road span collapsed into the
   strait.
3. **Peltola wins Alaska as Democrats take 56 seats.** Democrat Mary Peltola
   beat Republican Dan Sullivan in the last Senate race of the midterms;
   Democrats will hold a 56-44 majority.
4. **US loses measles-free status after 26 years.** Health officials said the
   US no longer meets elimination criteria after a single chain of spread
   lasted more than 12 months.
5. **Nvidia posts record $115.8B quarter.** Revenue more than doubled to
   $115.8 billion in the first report since Jensen Huang's exit; the board
   ruled out his return as CEO.
6. **Cyclone Akvan bears down on India's coast.** The storm strengthened in
   the Bay of Bengal, with landfall forecast on the Andhra Pradesh coast on
   Friday with winds up to 145 km/h.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).
