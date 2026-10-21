"""Convert the rendered PREMIS WordPress pages into a static GitHub Pages site."""
import os, re, shutil, sys

DUMP, OUT, WP = sys.argv[1], sys.argv[2], sys.argv[3]
ORIGIN = 'http://glacier.nmr.mgh.harvard.edu:5980'
SITE = 'https://premis-lab.github.io'
THEME = '/wp-content/themes/premis/assets/'
UPLOADS = '/wp-content/uploads/'
SLUGS = ['body-composition-at-population-scale', 'immunotherapy-for-brain-metastases',
         'making-model-outputs-speak-dicom', 'a-benchmark-built-to-break-models']
NAV = ['home', 'about', 'research', 'news', 'publications', 'team', 'software', 'contact']

pages = {'home.html': 'index.html', 'news.html': 'news/index.html', '404.html': '404.html'}
pages.update({s + '.html': 'news/%s/index.html' % s for s in SLUGS})
used = set()

def drop(pattern, html):
    return re.sub(pattern, '', html, flags=re.S)

for src, dst in pages.items():
    html = open(os.path.join(DUMP, src), encoding='utf-8').read()

    # WordPress head and footer plumbing that has no meaning on a static host
    for sid in ['wp-img-auto-sizes-contain-inline-css', 'wp-emoji-styles-inline-css',
                'classic-theme-styles-inline-css', 'global-styles-inline-css']:
        html = drop(r'<style id="%s">.*?</style>\s*' % sid, html)
    html = drop(r"<meta name='robots'[^>]*>\s*", html)
    html = drop(r"<link rel='dns-prefetch'[^>]*>\s*", html)
    html = drop(r'<link rel="alternate"[^>]*>\s*', html)
    html = drop(r'<link rel="https://api.w.org/"[^>]*>', html)
    html = drop(r'<link rel="EditURI"[^>]*>\s*', html)
    html = drop(r'<meta name="generator"[^>]*>\s*', html)
    html = drop(r"<link rel='shortlink'[^>]*>\s*", html)
    html = drop(r'<script type="speculationrules">.*?</script>\s*', html)
    html = drop(r'<script id="wp-emoji-settings".*?</script>\s*', html)
    html = drop(r'<script type="module">\s*/\*! This file is auto-generated \*/.*?</script>\s*', html)
    html = re.sub(r'\?ver=[\w.]+', '', html)

    # Canonical URL points to the published site
    path = '/' + dst[:-len('index.html')] if dst.endswith('index.html') else None
    html = drop(r'<link rel="canonical"[^>]*>\s*', html)
    if path is not None:
        html = html.replace('</head>', '<link rel="canonical" href="%s%s" />\n</head>' % (SITE, path), 1)

    # Record every uploaded image referenced, srcset included
    for m in re.finditer(re.escape(ORIGIN + UPLOADS) + r'([^"\'\s,]+)', html):
        used.add(m.group(1))

    # Asset and page URLs become root-relative paths
    html = html.replace(ORIGIN + THEME, '/assets/')
    html = html.replace(ORIGIN + UPLOADS, '/assets/uploads/')
    html = html.replace(ORIGIN + '/news/', '/news/')
    for s in SLUGS:
        html = html.replace(ORIGIN + '/%s/' % s, '/news/%s/' % s)
    html = html.replace(ORIGIN + '/', '/')
    if ORIGIN in html or 'glacier' in html:
        sys.exit('leftover WordPress URL in ' + src)

    # Section anchors in the header and footer only exist on the home page
    if dst != 'index.html':
        for a in NAV:
            html = html.replace('href="#%s"' % a, 'href="/#%s"' % a)

    html = re.sub(r'\n\s*\n\s*\n+', '\n\n', html)
    out = os.path.join(OUT, dst)
    os.makedirs(os.path.dirname(out) or OUT, exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    print('wrote', dst)

# Theme assets: compiled CSS, JS and the images the pages use
theme = os.path.join(WP, 'wp-content/themes/premis/assets')
for sub in ['css', 'js', 'img']:
    target = os.path.join(OUT, 'assets', sub)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.copytree(os.path.join(theme, sub), target)

for rel in sorted(used):
    target = os.path.join(OUT, 'assets/uploads', rel)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.copy2(os.path.join(WP, 'wp-content/uploads', rel), target)
print('copied %d uploads' % len(used))
