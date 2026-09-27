# MARLO RIZKY VALENTINO — THE DIGITAL UNIVERSE

A cinematic, holographic sci-fi portfolio built with plain HTML, CSS and JavaScript.

The site opens with a single continuous 3D sequence:

> black screen → space → spaceship → giant sun → weapon charge → energy beam → core instability → explosion → particles form **MRV** → name → **SOFTWARE DEVELOPER** → portfolio

It has **no dependencies**. There are no npm packages and no CDNs. The 3D rendering uses a small custom WebGL2 engine in `js/engine/` instead of Three.js. All geometry, textures and sound are generated in code, so the site works offline.

## Run

- **Double-click `index.html`.** It works from `file://` because the scripts are classic `<script>` tags, not ES modules.
- **Or serve the folder:** `npx serve .` or `python3 -m http.server`, then open the printed URL.
- **Deploy:** upload the folder as-is to any static host (GitHub Pages, Netlify, Vercel).

## Customize: `config.js`

All editable content is in one file.

| Key | What it controls |
| --- | --- |
| `owner` | Name, initials, loader name, role, tagline, the "WHO IS MARLO?" text, interests |
| `colors` | Brand colors. They are also exposed as CSS variables `--c-*` |
| `contact` | Email and GitHub URL |
| `socials` | Links shown in the contact section |
| `skills` | Cards in "TECHNICAL ARSENAL" |
| `projects` | Cards in "MISSION LOG": title, description, tech, `github`, `demo` |
| `intro.enabled` / `intro.timeScale` | Turn the cinematic intro off, or change its speed |

The email, social, GitHub and Live Demo URLs are **placeholders**. Replace them with real ones.

## Features

- **Loader** with a holographic progress bar, then `SYSTEM ONLINE`.
- **HUD overlays** during the intro:
  - `ENERGY CORE: 12% / 47% / 83% / 100%`
  - FIRE
  - `CORE INSTABILITY` warning
- **Skip intro:** the button, or `Esc` / `Enter` / `Space`. **Replay** is in the footer.
- **Sound:** a `SOUND: OFF` toggle that is off by default and never autoplays. Sounds are synthesized with Web Audio, so no audio files are needed.
- **Mouse and scroll motion:**
  - Mouse parallax on the stars, grid, holographic core, cards and UI.
  - Cinematic scroll reveals (fade, blur, scale, 3D tilt).
  - Custom cursor: a dot plus a trailing ring.
- **Performance:**
  - Four quality tiers (desktop, laptop, tablet, mobile) with a capped devicePixelRatio.
  - Adaptive resolution. If the frame rate stays very low, the intro skips itself.
  - Rendering pauses when the tab is hidden.
- **Accessibility and fallbacks:**
  - `prefers-reduced-motion` turns down camera shake and motion, cuts particle counts, and turns off tilt, parallax and animated reveals.
  - If WebGL2 is unavailable or the context is lost, a **Canvas 2D fallback** runs instead, and the portfolio always stays usable.

## Debug URL parameters

| Param | Effect |
| --- | --- |
| `?skip` | Go straight to the portfolio |
| `?t=24.5` | Start the intro at a given second (the explosion is around 24.5 s, the portfolio at 36 s) |
| `?freeze` | Freeze time (combine with `?t=` to inspect a frame) |
| `?q=mobile` | Force a quality tier: `desktop`, `laptop`, `tablet` or `mobile` |
| `?fallback` | Force the Canvas 2D fallback |

## Structure

```
marlo-portfolio/
├── index.html          markup: loader, HUD, nav, sections
├── style.css           all styling + responsive + reduced motion
├── config.js           <- edit me
├── script.js           boot, quality tiers, main loop, intro <-> portfolio flow
├── js/
│   ├── engine/         math, WebGL2 wrapper, procedural geometry, GLSL shaders
│   ├── scene/          space, sun, ship, explosion, hologram text, holo core, particles, post-FX, renderer
│   ├── cinematic/      director.js (intro timeline), portfolio-scene.js (background after intro)
│   ├── ui/             hud, loader, cursor, nav, sound, portfolio rendering
│   └── fallback.js     Canvas 2D fallback
└── assets/             models/ textures/ sounds/ images/ (optional, currently unused)
```

To retime the cinematic, edit the timing table `T` at the top of `js/cinematic/director.js`.
