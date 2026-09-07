# SNOWCAT — snowcatbsc.com

The single-page site for **SNOWCAT ($SNCAT)** on BNB Smart Chain.

A fixed Three.js canvas sits behind everything: falling snow, a faceted ice
shard that really refracts what's behind it, and a camera that scroll drives
through the shard and out into open space. All the text sits on frosted glass
panels floating over it.

Built with Vite, vanilla JavaScript and plain CSS. No React, no Tailwind, no
build-time magic. It compiles to static files and deploys to Cloudflare Pages.

---

## Running it

You need [Node.js](https://nodejs.org) 18 or newer. Then, in a terminal, from
this folder:

```bash
npm install     # once, the first time
npm run dev     # start a local server — it prints a http://localhost:5173 link
```

Leave `npm run dev` running while you edit. Save a file and the browser updates
by itself.

When you're happy:

```bash
npm run build   # writes the finished site into dist/
npm run preview # serve dist/ locally to check it before deploying
```

### Deploying to Cloudflare Pages

In the Cloudflare dashboard, connect this repository and use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 18 or newer |

Every push to the branch rebuilds and redeploys. Nothing else to configure —
caching and security headers are already set in `public/_headers`.

---

## The three things you'll most likely want to change

### 1. The contract address

The address appears in **three places**, and all three must match.

Open `index.html` and search for `0x18D1632B`. You'll find it in:

1. The **contract panel** — three times in the same block. Replace all three:

   ```html
   <p class="contract__value" id="ca-value"
      data-address="0xYOURNEWADDRESS"      ← the one that gets copied
      title="0xYOURNEWADDRESS">            ← the browser tooltip
     0xYOURNEWADDRESS                      ← what's printed on screen
   </p>
   <button ... data-copy="0xYOURNEWADDRESS">
   ```

   > `data-address` is the one the Copy button actually puts on the clipboard.
   > The visible text is shortened on narrow phones (`0x18D1632B3…3d6F983b6`),
   > but the **full** address is always what gets copied.

2. The **footer**, inside `<p class="footer__ca">`:

   ```html
   <code>0xYOURNEWADDRESS</code>
   ```

Search the file for the old address one last time to be sure you got them all.

### 2. Swapping the images

Both images live in `public/images/`.

**Keep the same filenames** — `hero-cat.jpg` and `lunar-cat.jpg` — and you don't
have to touch any code. Just drop the replacements in, overwriting the old ones.

- `hero-cat.jpg` — the framed photo in the **About** section, *and* the preview
  image that shows up when the site is shared on X or Telegram. Roughly square
  works best. Keep it under ~400 KB so links unfurl quickly.
- `lunar-cat.jpg` — the full-width background behind the **Mission** section.

If you use different filenames, update the references in `index.html`
(search for `images/`) — there are four: two `<img src>` tags and two social
preview tags (`og:image` and `twitter:image`).

Two things worth knowing:

- **The social preview needs the full URL.** The `og:image` and `twitter:image`
  tags say `https://snowcatbsc.com/images/hero-cat.jpg`. If the site ever moves
  to a different domain, change that domain in the `<head>` — there are four
  places (`canonical`, `og:url`, `og:image`, `twitter:image`).
- **How the Mission image is cropped** is set in `src/styles/layout.css`:

  ```css
  .mission__bg { object-position: 56% 34%; }
  ```

  First number is horizontal (0% = show the left edge, 100% = the right),
  second is vertical (0% = the top, 100% = the bottom). Nudge it until the part
  you care about is visible on a phone.

### 3. Colours

Every colour in the site comes from one file: **`src/styles/tokens.css`**.
Change a value there and it updates everywhere — buttons, borders, glow, text.

```css
:root {
  --ink-900: #050B16;   /* page background, and the 3D scene's darkest point */
  --ink-800: #071122;   /* the fill inside glass panels */
  --ink-700: #0A1A2E;   /* nav bar and footer */

  --glacier-600: #10314F;
  --glacier-500: #17557F;

  --ice-500: #2A9FD6;   /* darkest end of the button gradient */
  --ice-400: #4FC8F5;   /* the main accent — links, icons, borders */
  --ice-300: #7FE3FF;   /* the bright one — glow, hover, focus rings */

  --frost-50:  #EAF6FF; /* headings */
  --frost-300: #A9C4DA; /* body text */
  --frost-400: #7D9BB4; /* small print, disclaimers */
}
```

Two gotchas:

- **The `*-rgb` values must match.** Transparent tints (glass fill, glow,
  borders) are built from these:

  ```css
  --ice-400-rgb: 79 200 245;   /* this is #4FC8F5 as plain numbers */
  --ice-300-rgb: 127 227 255;  /* #7FE3FF */
  --ink-800-rgb: 7 17 34;      /* #071122 */
  ```

  If you change `--ice-400`, change `--ice-400-rgb` to the same colour, written
  as three space-separated numbers. (Any "hex to RGB" converter will give you
  them.) Miss this and the glow will still be the old colour.

- **The 3D scene has its own palette.** The canvas is lit by WebGL, not CSS, so
  it doesn't read `tokens.css`. Its colours are the `STOPS` array at the top of
  **`src/scene/index.js`** — three sets that scroll blends between, from deep
  midnight blue at the top of the page to pale cyan at the bottom:

  ```js
  const STOPS = [
    { bg: '#050B16', fog: '#050B16', ambient: '#12304F', … },  // top of page
    { bg: '#071A2C', fog: '#0A2138', ambient: '#1B4A70', … },  // middle
    { bg: '#0A2436', fog: '#123A52', ambient: '#2A6A8C', … },  // bottom
  ];
  ```

  Keep `bg` in the first stop close to `--ink-900` so the canvas and the page
  background agree while the page is loading.

#### Tuning the glass panels

Also in `tokens.css`. Higher alpha in `--glass-bg` = more solid, more readable
over a busy backdrop; lower = more see-through.

```css
--glass-bg: rgb(var(--ink-800-rgb) / 0.62);   /* 0.62 = 62% opaque */
--glass-blur: blur(9px) saturate(118%);       /* phones — kept light on purpose */
```

The blur is deliberately smaller on phones (it's raised to `14px` in the
`min-width: 900px` block lower down) because blurring over a moving canvas is
re-done every frame and is one of the more expensive things on mobile.

---

## Editing the words

All the copy is plain text in `index.html`. Search for the sentence you want to
change and type over it. Sections appear in the file in the order they appear on
the page: nav, hero, contract, about, tokenomics, mission, community, footer.

The tokenomics numbers are in the `<li class="glass card">` blocks. The supply
figure counts up when it scrolls into view; the number it counts *to* is the
`data-count-to` attribute, and the text inside the tag is the fallback shown if
JavaScript is off — keep the two in step:

```html
<span data-count-to="200000000">200,000,000</span>
```

Social links (X and Telegram) appear in the nav, hero, mission, community and
footer. Search for `SnowCatBSC` to find all of them.

---

## How the 3D works, briefly

If you never touch this, it will keep working. If you want to fiddle:

| File | What it does |
| --- | --- |
| `src/scene/index.js` | Renderer, camera, lights, the colour `STOPS`, the per-frame loop and the performance watchdog |
| `src/scene/snow.js` | The snow. Two layers; all the motion happens on the GPU |
| `src/scene/shard.js` | The ice crystal and the smaller crystals in the distance |
| `src/scene/timeline.js` | **The scroll choreography** — where the camera goes and when |
| `src/scene/environment.js` | A small painted gradient the crystal reflects |
| `src/scene/quality.js` | Decides how much to render based on the device |

**The scroll timeline** is the one worth knowing about. `src/scene/timeline.js`
maps the whole page — top to bottom — onto a number from `0` to `1`, and moves
the camera along it:

| Scroll | What happens |
| --- | --- |
| 0.00 – 0.08 | Holds wide and far back. Deep midnight blue |
| 0.08 – 0.30 | Moves in toward the crystal on a curve, so its facets sweep past |
| 0.30 – 0.42 | Passes straight *through* the crystal — it lights up and floods the screen |
| 0.42 – 0.60 | Opens out; fog pulls back and a field of distant crystals appears |
| 0.60 – 0.80 | Drops down through that field. The light turns pale cyan |
| 0.80 – 1.00 | Settles, wide and still |

Numbers like `0.30` are fractions of the page's total scroll. Move a beat
earlier or later by changing them, and change how far the camera travels with
the `camZ` / `camY` / `camX` values on each line.

### Performance

The site is built phone-first and holds 60fps on mid-range Android. Things
already handled, so you don't have to think about them:

- Device pixel ratio is capped at 2, lower on weaker devices.
- Particle counts drop on small screens (and rise on very wide ones, so the
  snow doesn't thin out).
- The refraction pass — the expensive part — renders at reduced resolution on
  phones.
- The render loop stops entirely when the tab isn't visible.
- If frames are consistently slow, the site quietly steps quality down twice
  before giving up anything visible.
- `prefers-reduced-motion` turns the whole thing off: one still frame, no
  smooth scrolling, no animation.

If you add a lot to the scene and it starts to chug, the first dials to turn are
`snowCount` and `transmissionScale` in `src/scene/quality.js`.

---

## Fonts

Two, both from Google Fonts, loaded in `index.html`:

- **Orbitron** — the wordmark and all headings
- **Space Grotesk** — body text

The contract address uses whatever monospace font the device already has, so
there's nothing extra to download.

To change them: swap the `<link>` in `index.html` for a new Google Fonts link,
then update `--font-display` and `--font-body` in `src/styles/tokens.css`.

---

## Project layout

```
index.html              all the page content and the social/SEO tags
public/
  images/               hero-cat.jpg, lunar-cat.jpg
  favicon.svg           the snowflake tab icon
  _headers              Cloudflare caching + security headers
src/
  main.js               wires everything together
  scene/                the Three.js backdrop (see the table above)
  styles/
    tokens.css          ← colours, fonts, spacing. Start here
    base.css            resets and typography
    layout.css          page structure, nav, hero, footer
    components.css      buttons, glass panels, cards, contract bar
  ui/
    nav.js              hamburger menu and smooth in-page links
    contract.js         copy-to-clipboard and address shortening
    reveal.js           fade-ins and the supply count-up
```

---

## A note on the disclaimer

The footer says $SNCAT is a meme token with no intrinsic value and that nothing
on the site is financial advice. Please leave it there.
