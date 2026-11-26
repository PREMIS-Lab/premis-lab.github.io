# premis-lab.github.io

Website of the PREMIS lab (PREcision Medicine with Intelligent Systems), Martinos Center, MGH.
Published with GitHub Pages at https://premis-lab.github.io

Built with Jekyll, which GitHub Pages runs on every push to `main`: the design lives in a few
templates and the content in plain text files, so most edits never touch HTML.

## Editing content

Three ways, all ending in a commit to `main` that republishes the site in a minute or two:

1. **Forms in the browser (Pages CMS).** Sign in with GitHub at https://app.pagescms.org, open this
   repository and pick Home page, Team, News, Publications (PubMed), Software or "Menu, footer and
   other pages". The forms come from `.pages.yml`. Images go to `assets/uploads/`. Each commit made
   there carries the name and email of the person who saved it.
2. **GitHub's web editor.** Open one of the files below, click the pencil, edit and commit.
3. **Locally**, with any text editor.

| What | File |
| --- | --- |
| Banner, About, and the titles of Publications and News | `_data/home.yml` |
| Team: the three groups, their titles and their people | `_data/team.yml` |
| Software: section texts and projects | `_data/software.yml` |
| Publications: lab authors searched in PubMed and the rules for which papers show | `_data/publications.yml` |
| Default theme (light, dark or the visitor's device), menu, footer, News page and error page | `_data/site.yml` |
| News stories | `_posts/YYYY-MM-DD-slug.md`, one per story |

- **Publications** load live from PubMed in the browser. `_data/publications.yml` sets who is searched
  (as PubMed writes the name, e.g. `Kim AE`, plus other spellings), how many lab authors a paper needs,
  how many papers show, the order (newest, or most lab authors first), a starting year, whether
  preprints count, and PMIDs to hide. The "All on PubMed" button runs the same search.
- **Highlighted words**: in the banner title and the About text, words in `*italics*` show in color
  (purple in the title; purple, pink, orange in turn in About). `**Bold**` stays bold. The "Research"
  links land on the second paragraph of About.
- **People and software** show in the order they appear in their file. A person without `photo`
  gets a circle with their initials. A group intro left empty is not shown.
- **News**: a story is published at `/news/<slug>/`, taken from its file name. The home page shows
  the 3 most recent. The front matter holds the card and page fields (`title`, `date`, `category`,
  `color`: purple, pink or orange, `summary`, `image`, `image_caption`, `image_credit`, `abstract`,
  `paper`); any Markdown below the front matter shows as text under the figure.

## Layout

```
_config.yml                site settings and the /news/<slug>/ address of stories
_layouts/default.html      page shell: head, header, footer
_layouts/post.html         a news story
_includes/                 header, footer, news card, team and software sections
_data/                     page texts, people and software
_posts/                    news stories
index.html                 home page: hero, about, publications, news, team, software, contact
news/index.html            all news
404.html                   error page
espwa/                     AR demo for the ESPWA poster (static, not processed by Jekyll)
assets/css/main.css        styles (compiled Tailwind)
assets/css/theme.css       hero, accent colors and news text styles
assets/js/site.js          light/dark theme, mobile menu, publications carousel and PubMed refresh
assets/uploads/            team photos and news figures
.pages.yml                 Pages CMS forms
```

`main.css` only contains the Tailwind classes the site already uses. A new class that appears nowhere
else on the site needs a CSS rebuild or a rule in `theme.css`.

## Local preview

With Ruby installed:

```bash
gem install github-pages webrick
jekyll serve        # http://localhost:4000
```

## Origin

First converted from a WordPress test install with `tools/wp_to_static.py`, then moved to Jekyll.
The script writes the old static layout, so it is kept only for reference.
