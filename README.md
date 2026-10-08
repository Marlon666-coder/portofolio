# MARLO RIZKY VALENTINO — THE DIGITAL UNIVERSE

Personal portfolio of Marlo Rizky Valentino, Computer Science student at BINUS University. It is a futuristic, holographic site built with plain HTML, CSS and JavaScript.

Live: https://marlon666-coder.github.io/portofolio/

The site opens with a cinematic 3D intro:

> space → spaceship → giant sun → energy beam → explosion → particles form **MRV** → name → portfolio

It has **no dependencies**. There are no npm packages and no frameworks. The 3D rendering uses a small custom WebGL2 engine in `js/engine/`. If WebGL2 is unavailable, a Canvas 2D fallback runs instead.

## Sections

| Section | What it shows |
| --- | --- |
| HOME | Name, role, university, typed tagline, the holographic profile photo, and a system HUD |
| ABOUT | Personnel file, interests, and the **Technical Arsenal** skills grid |
| EDUCATION | Timeline with glowing nodes. Add more entries in `config.js` |
| PROJECTS | Project cards with tilt, glow, an optional image preview, and VIEW PROJECT / GITHUB buttons |
| CERTIFICATES | Gallery with a lightbox. Shows "Certificates Coming Soon" while the list is empty |
| CV / RESUME | VIEW CV and DOWNLOAD CV. Shows an elegant notice until the PDF is uploaded |
| CONTACT | Instagram and WhatsApp holographic cards, plus GitHub |

## How to update content

All personal content is in **`config.js`**.

### Profile photo
Save your photo as `assets/images/profile/marlo-profile.jpg`:
- Use a square crop with your face in the center.
- Use at least 800×800 px; 1000–1200 px is ideal.

Until the file exists, the site shows a "PROFILE IMAGE PENDING UPLOAD" hologram. To use a different file name or format, change `owner.photo`.

### Certificates
1. Put the image in `assets/certificates/`. A landscape image at least 1600 px wide works best.
2. Add an entry to `certificates` in `config.js`:
   ```js
   { title: 'Certificate Title', issuer: 'Organization', date: 'January 2027',
     credential: 'Credential ID', image: 'assets/certificates/my-cert.jpg', url: '' }
   ```
   `url` is optional and adds a VERIFY CREDENTIAL button.

### CV
Save the PDF as `assets/cv/marlo-rizky-valentino-cv.pdf`. The buttons detect the file automatically, so you don't need to change any code.

### Projects
Edit `projects` in `config.js`:
- Leave `github` or `demo` empty (`''`) and the button shows "SOON" instead of a broken link.
- `image` (optional) adds a screenshot preview, for example `assets/images/projects/snake.jpg`.

### Personal info and contact
- `owner`: name, role, university, major, tagline, about text, interests.
- `education`: timeline entries.
- `contact`: Instagram, WhatsApp, GitHub, plus optional `linkedin` and `email` (shown only when filled in).
- `colors`: brand colors.
- `intro.enabled` / `intro.timeScale`: turn the cinematic intro off, or change its speed.

## Run locally

- Double-click `index.html`. It works from `file://`.
- Or run `python3 -m http.server` in this folder, then open http://localhost:8000.

## Deploy (GitHub Pages)

This repo is already served by GitHub Pages from the `main` branch, root folder.

1. Push or merge your changes into `main`.
2. Wait about 1 minute, then open https://marlon666-coder.github.io/portofolio/ and hard-refresh with Ctrl+Shift+R.

To set it up from scratch: go to **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.

## Debug URL parameters

| Param | Effect |
| --- | --- |
| `?skip` | Go straight to the portfolio |
| `?t=24.5` | Start the intro at a given second |
| `?freeze` | Freeze time (combine with `?t=`) |
| `?q=mobile` | Force a quality tier: `desktop`, `laptop`, `tablet` or `mobile` |
| `?fallback` | Force the Canvas 2D fallback |

## Structure

```
├── index.html          markup: loader, HUD, nav, all sections, modal
├── style.css           styling, responsive layout, reduced motion
├── config.js           <- edit me
├── script.js           boot, quality tiers, main loop, intro <-> portfolio flow
├── js/
│   ├── engine/         WebGL2 wrapper, math, geometry, shaders
│   ├── scene/          space, sun, ship, explosion, hologram, holo core, post-FX
│   ├── cinematic/      intro timeline + portfolio background
│   ├── ui/             hud, loader, cursor, nav, sound, modal, profile (hologram photo), portfolio
│   └── fallback.js     Canvas 2D fallback
└── assets/
    ├── favicon.svg
    ├── images/profile/ marlo-profile.jpg   (add yours)
    ├── certificates/   certificate images  (add yours)
    └── cv/             marlo-rizky-valentino-cv.pdf (add yours)
```

## Accessibility and performance

- `prefers-reduced-motion` turns off tilt, parallax, particles, typing and animated reveals.
- Keyboard focus states are visible, the modal traps focus, and every image has alt text.
- The custom cursor is used only on mouse devices.
- Animations use transform and opacity only, scroll reveals use IntersectionObserver, and canvases pause when off-screen or when the tab is hidden.
