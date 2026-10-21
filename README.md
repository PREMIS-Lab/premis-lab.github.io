# premis-lab.github.io

Website of the PREMIS lab (PREcision Medicine with Intelligent Systems), Martinos Center, MGH.
Published with GitHub Pages at https://premis-lab.github.io

Plain static HTML with no build step: GitHub Pages serves the files as they are (`.nojekyll` turns off Jekyll).

## Layout

```
index.html                 home page: hero, about, publications, news, team, software, contact
news/index.html            all news
news/<slug>/index.html     one page per news item
404.html                   error page
assets/css/main.css        styles (compiled Tailwind)
assets/js/site.js          light/dark theme, mobile menu and publications carousel
assets/img/                logos and backgrounds
assets/uploads/            team photos and news figures
tools/wp_to_static.py      script that generated the site from the WordPress test install
```

## Editing content

- **Publications** load automatically from PubMed in the browser, so there is nothing to edit.
- **Team and software** are cards in `index.html`, under the `#team` and `#software` sections.
- **News**: copy a folder under `news/<slug>/`, change the text and figure, then add its card to
  `news/index.html` and to the `#news` section of `index.html` (the home page shows the 3 most recent).

`main.css` only contains the Tailwind classes the site already uses. A new class that appears nowhere
else on the site needs a CSS rebuild or an inline style.

## Local preview

```bash
python3 -m http.server 8000   # http://localhost:8000
```

Paths are root-relative (`/assets/...`), so opening the files directly from disk does not work.
Use a local server instead.

## Origin

Converted from the WordPress install at `/autofs/space/crater_001/projects/premis-wp`.
To regenerate it, start that WordPress, download the rendered pages and run
`python3 tools/wp_to_static.py <html_folder> <this_repo> <wordpress_folder>`.
