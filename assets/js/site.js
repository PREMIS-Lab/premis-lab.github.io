// Initialize Lucide icons
        lucide.createIcons();

        // --- Dark Mode Logic ---
        const toggleBtnDesktop = document.getElementById('theme-toggle');
        const toggleBtnMobile = document.getElementById('theme-toggle-mobile');
        const iconDesktop = document.getElementById('theme-toggle-icon');
        const iconMobile = document.getElementById('theme-toggle-icon-mobile');

        function updateIcons(isDark) {
            const iconName = isDark ? 'sun' : 'moon';
            if (iconDesktop) iconDesktop.setAttribute('data-lucide', iconName);
            if (iconMobile) iconMobile.setAttribute('data-lucide', iconName);
            lucide.createIcons();
        }

        function toggleTheme() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.theme = 'light';
                updateIcons(false);
            } else {
                html.classList.add('dark');
                localStorage.theme = 'dark';
                updateIcons(true);
            }
        }

        // Initialize icons based on current state
        if (document.documentElement.classList.contains('dark')) {
            updateIcons(true);
        } else {
            updateIcons(false);
        }

        // Event Listeners
        if (toggleBtnDesktop) toggleBtnDesktop.addEventListener('click', toggleTheme);
        if (toggleBtnMobile) toggleBtnMobile.addEventListener('click', toggleTheme);


        // Mobile menu logic
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const icon = document.getElementById('menu-icon');
        const links = document.querySelectorAll('.mobile-link');
        let isOpen = false;

        btn.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                menu.classList.remove('hidden');
            } else {
                menu.classList.add('hidden');
            }
        });

        links.forEach(link => {
            link.addEventListener('click', () => {
                isOpen = false;
                menu.classList.add('hidden');
            });
        });

        // --- Publications carousel (arrows + snap scrolling) ---
        const pubCarousel = (function () {
            const list = document.getElementById('publication-list');
            const prev = document.getElementById('pub-prev');
            const next = document.getElementById('pub-next');
            if (!list || !prev || !next) return { sync: function () { } };

            function step() {
                const card = list.querySelector('article');
                return card ? card.offsetWidth + 20 : list.clientWidth;
            }

            function sync() {
                const max = list.scrollWidth - list.clientWidth - 4;
                prev.disabled = list.scrollLeft <= 4;
                next.disabled = list.scrollLeft >= max;
            }

            prev.addEventListener('click', () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
            next.addEventListener('click', () => list.scrollBy({ left: step(), behavior: 'smooth' }));
            list.addEventListener('scroll', sync, { passive: true });
            window.addEventListener('resize', sync);
            sync();
            return { sync: sync };
        })();

        // --- Featured publications: auto-refresh from PubMed ---
        // The HTML list is the hand-checked baseline. If PubMed answers, it is
        // replaced by the live result (papers with two or more lab members).
        (function () {
            const list = document.getElementById('publication-list');
            const status = document.getElementById('publication-status');
            if (!list || !window.fetch) return;

            const LAB = [
                { surnames: ['Kim'], initial: 'A', label: 'A. Kim' },
                { surnames: ['Bridge'], initial: 'C', label: 'C. Bridge' },
                { surnames: ['Cleveland'], initial: 'M', label: 'M. Cleveland' },
                { surnames: ['Pulido-Arias', 'Pulido'], initial: 'D', label: 'D. Pulido-Arias' },
                { surnames: ['Mindroc-Filimon', 'Mindroc'], initial: 'D', label: 'D. Mindroc' }
            ];
            const TERMS = ['Kim AE', 'Bridge CP', 'Cleveland MC', 'Pulido-Arias D', 'Mindroc-Filimon D'];
            const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
            const TOOL = '&tool=premis-lab-website';
            const PREPRINTS = ['biorxiv', 'medrxiv', 'arxiv', 'research square'];
            const MAX_ITEMS = 6;
            const CACHE_KEY = 'premis-publications-v2';
            const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

            // (A[au] AND B[au]) OR ... for every pair of members
            function pairQuery() {
                const pairs = [];
                for (let i = 0; i < TERMS.length; i++) {
                    for (let j = i + 1; j < TERMS.length; j++) {
                        pairs.push('(' + TERMS[i] + '[au] AND ' + TERMS[j] + '[au])');
                    }
                }
                return pairs.join(' OR ');
            }

            // Positions of the lab members within the author list
            function memberIndex(authors) {
                const idx = [];
                LAB.forEach(m => {
                    for (let i = 0; i < authors.length; i++) {
                        const parts = authors[i].split(' ');
                        if (parts.length < 2) continue;
                        const initials = parts.pop();
                        if (m.surnames.indexOf(parts.join(' ')) !== -1 && initials.charAt(0) === m.initial) {
                            idx.push(i); break;
                        }
                    }
                });
                return idx.sort((a, b) => a - b);
            }

            const isPreprint = s => PREPRINTS.some(p => String(s || '').toLowerCase().indexOf(p) === 0);
            const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
            const authorLine = a => a.length <= 3 ? a.join(', ') : a.slice(0, 2).join(', ') + ', … ' + a[a.length - 1];

            const getJSON = url => fetch(url).then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });

            // Cita en formato PubMed: "Radiology. 2026 Aug;320(2):e254034."
            function citation(p) {
                let c = p.source + '. ' + (p.pubdate || p.year);
                if (p.volume) c += ';' + p.volume + (p.issue ? '(' + p.issue + ')' : '');
                if (p.pages) c += ':' + p.pages;
                return c.replace(/\.$/, '') + '.';
            }

            const clip = (s, n) => s.length <= n ? s : s.slice(0, s.slice(0, n).lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…';

            // Real abstract from efetch; on failure the cover falls back to filler lines
            function withAbstracts(items) {
                if (!items.length) return Promise.resolve(items);
                return fetch(EUTILS + 'efetch.fcgi?db=pubmed&retmode=xml' + TOOL + '&id=' + items.map(i => i.pmid).join(','))
                    .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
                    .then(xml => {
                        const doc = new DOMParser().parseFromString(xml, 'text/xml');
                        const byId = {};
                        Array.prototype.forEach.call(doc.getElementsByTagName('PubmedArticle'), art => {
                            const pmid = art.getElementsByTagName('PMID')[0];
                            const parts = Array.prototype.map.call(art.getElementsByTagName('AbstractText'), n => {
                                const label = n.getAttribute('Label');
                                const t = (n.textContent || '').trim();
                                return t ? (label ? label + ': ' + t : t) : '';
                            }).filter(Boolean);
                            if (pmid && parts.length) byId[pmid.textContent] = parts.join(' ').replace(/\s+/g, ' ');
                        });
                        items.forEach(i => { i.abstract = clip(byId[i.pmid] || '', 900); });
                        return items;
                    })
                    .catch(() => items);
            }

            const PLACEHOLDER = ['w-full', 'w-full', 'w-[94%]', 'w-full', 'w-[88%]', 'w-full', 'w-[62%]']
                .map(w => '<span class="block h-[2px] ' + w + ' rounded-sm bg-slate-200"></span>').join('');

            // Authors: the first three plus the lab members, highlighted
            function authorsHtml(authors, idx) {
                const mark = (name, on) => on ? '<span class="font-semibold text-purple-700">' + esc(name) + '</span>' : esc(name);
                const head = [];
                for (let i = 0; i < Math.min(3, authors.length); i++) head.push(i);
                const extra = idx.filter(i => head.indexOf(i) === -1);
                const parts = head.map(i => mark(authors[i], idx.indexOf(i) !== -1));
                if (extra.length) {
                    parts.push('…');
                    extra.forEach(i => parts.push(mark(authors[i], true)));
                } else if (authors.length > 3) {
                    parts.push('et al.');
                }
                return parts.join(', ');
            }

            // Simulated cover built from the PubMed metadata (same markup as the baseline HTML)
            // Accent bar on each cover cycles purple, pink, orange
            const BARS = ['bg-purple-700/80', 'bg-accent-pink', 'bg-accent-orange'];

            function card(p, i) {
                // link to PubMed: the DOI resolves to the publisher, which often puts up a bot wall
                const href = 'https://pubmed.ncbi.nlm.nih.gov/' + p.pmid + '/';
                const ident = p.doi ? 'doi:' + p.doi : 'PubMed';
                const badge = isPreprint(p.source)
                    ? '<span class="rounded-sm badge-preprint px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.16em]">Preprint · not peer reviewed</span>'
                    : '<span></span>';
                const abstract = p.abstract
                    ? '<p class="paper-serif mt-1.5 text-[10px] leading-[1.6] text-slate-600">' + esc(p.abstract) + '</p>'
                    : '<div class="mt-2 space-y-[6px]" aria-hidden="true">' + PLACEHOLDER + '</div>';
                return '<article class="snap-start flex-none w-[320px] sm:w-[370px]">' +
                    '<a href="' + esc(href) + '" target="_blank" rel="noreferrer"' +
                    ' class="group flex h-[520px] flex-col overflow-hidden rounded-md bg-white ring-1 ring-slate-200 dark:ring-slate-700 shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-purple-300">' +
                    '<div class="relative flex-1 overflow-hidden px-6 pt-6">' +
                    '<div class="flex items-start justify-between gap-3">' + badge +
                    '<span class="mt-1 h-2.5 w-5 flex-none rounded-sm ' + BARS[i % BARS.length] + '"></span></div>' +
                    '<div class="mt-3 h-px w-full bg-slate-300"></div>' +
                    '<p class="paper-serif mt-3 text-[11px] italic leading-snug text-slate-500">' + esc(citation(p)) + '</p>' +
                    '<h4 class="paper-serif mt-3 text-[17px] font-bold leading-[1.28] text-slate-900 line-clamp-4">' + esc(p.title) + '</h4>' +
                    '<p class="paper-serif mt-2.5 text-[10.5px] leading-relaxed text-slate-600">' + authorsHtml(p.authors, p.members) + '</p>' +
                    '<p class="mt-4 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400">Abstract</p>' + abstract +
                    '<div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"></div>' +
                    '</div>' +
                    '<div class="flex items-center justify-between border-t border-slate-100 px-6 py-2 font-mono text-[8.5px] text-slate-400">' +
                    '<span class="truncate">' + esc(ident) + '</span>' +
                    '<span class="flex-none pl-2">PMID ' + esc(p.pmid) + '</span></div>' +
                    '<div class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">' +
                    '<span class="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 group-hover:text-purple-700 transition-colors">Read paper</span>' +
                    '<i data-lucide="arrow-up-right" class="w-4 h-4 flex-none text-slate-400 group-hover:text-purple-600 transition-colors"></i>' +
                    '</div></a></article>';
            }

            function render(items, when) {
                list.innerHTML = items.map(card).join('');
                list.scrollLeft = 0;
                if (window.lucide) lucide.createIcons();
                pubCarousel.sync();
                if (status) {
                    status.textContent = 'Auto-updated from PubMed · ' + items.length +
                        ' papers with two or more lab authors · ' +
                        new Date(when).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                }
            }

            // Deduplicate by normalised title (prefer the published version over the
            // preprint) and sort by date, newest first
            function rank(items) {
                const seen = {};
                items.forEach(it => {
                    const k = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);
                    if (!seen[k] || (isPreprint(seen[k].source) && !isPreprint(it.source))) seen[k] = it;
                });
                return Object.keys(seen).map(k => seen[k])
                    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                    .slice(0, MAX_ITEMS);
            }

            function fromPubMed() {
                return getJSON(EUTILS + 'esearch.fcgi?db=pubmed&retmode=json&retmax=60&sort=date' + TOOL +
                    '&term=' + encodeURIComponent(pairQuery()))
                    .then(d => {
                        const ids = (d.esearchresult && d.esearchresult.idlist) || [];
                        if (!ids.length) throw new Error('sin resultados');
                        return getJSON(EUTILS + 'esummary.fcgi?db=pubmed&retmode=json' + TOOL + '&id=' + ids.join(','))
                            .then(s => ({ ids: ids, result: s.result || {} }));
                    })
                    .then(data => {
                        const items = [];
                        data.ids.forEach(id => {
                            const d = data.result[id];
                            if (!d || d.error) return;
                            const authors = (d.authors || []).filter(a => a.authtype === 'Author').map(a => a.name);
                            const members = memberIndex(authors);
                            if (members.length < 2) return; // rule: at least two lab members
                            const doi = (d.articleids || []).filter(x => x.idtype === 'doi').map(x => x.value)[0] || '';
                            items.push({
                                pmid: id, title: (d.title || '').replace(/\.$/, ''), source: d.source || '',
                                year: (d.pubdate || '').slice(0, 4), date: d.sortpubdate || d.pubdate || '',
                                pubdate: d.pubdate || '', volume: d.volume || '', issue: d.issue || '',
                                pages: d.pages || (d.elocationid || '').replace('doi: ', ''),
                                doi: doi, authors: authors, members: members
                            });
                        });
                        return withAbstracts(items);
                    })
                    .then(rank);
            }

            function readCache() {
                try {
                    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
                    if (c && c.items && c.items.length && Date.now() - c.t < CACHE_TTL) return c;
                } catch (e) { /* corrupt cache: ignored */ }
                return null;
            }

            const cached = readCache();
            if (cached) {
                render(cached.items, cached.t);
                return;
            }

            fromPubMed().then(items => {
                if (!items.length) return; // keep the static list
                const now = Date.now();
                render(items, now);
                try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: now, items: items })); } catch (e) { /* out of storage */ }
            }).catch(() => { /* PubMed down or offline: keep the static list */ });
        })();

        // --- Hero Game of Life ---
        const canvas = document.getElementById('hero-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const heroSection = document.getElementById('hero');
            let width, height;
            let cols, rows;
            let grid = [];
            let nextGrid = [];

            // Configuration
            const cellSize = 20;
            const evolutionSpeed = 5; // Update speed
            let frameCount = 0;

            // Mouse
            let isMouseOver = false;

            function resize() {
                width = canvas.width = heroSection.offsetWidth;
                height = canvas.height = heroSection.offsetHeight;
                cols = Math.ceil(width / cellSize);
                rows = Math.ceil(height / cellSize);
                initGrid();
            }

            function initGrid() {
                grid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
                nextGrid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));

                // Initialize with some random dead points (0)
                // Optional: Randomly seed at start
                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        grid[i][j] = Math.random() > 0.95 ? 1 : 0; // 5% initial life
                    }
                }
            }

            function draw() {
                ctx.clearRect(0, 0, width, height);

                // Draw live cells: mostly purple, some pink and orange, fixed per position so cells don't flicker
                const dark = document.documentElement.classList.contains('dark');
                const palette = dark
                    ? ['rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.35)', 'rgba(249, 115, 22, 0.35)']
                    : ['rgba(126, 34, 206, 0.16)', 'rgba(236, 72, 153, 0.18)', 'rgba(249, 115, 22, 0.18)'];

                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        if (grid[i][j] === 1) {
                            const h = (i * 7 + j * 13) % 10;
                            ctx.fillStyle = palette[h < 7 ? 0 : h < 9 ? 1 : 2];
                            ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
                        }
                    }
                }
            }

            function countNeighbors(grid, x, y) {
                let sum = 0;
                for (let i = -1; i < 2; i++) {
                    for (let j = -1; j < 2; j++) {
                        let col = (x + i + cols) % cols;
                        let row = (y + j + rows) % rows;
                        sum += grid[col][row];
                    }
                }
                sum -= grid[x][y];
                return sum;
            }

            function update() {
                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        let state = grid[i][j];
                        let neighbors = countNeighbors(grid, i, j);

                        if (state == 0 && neighbors == 3) {
                            nextGrid[i][j] = 1;
                        } else if (state == 1 && (neighbors < 2 || neighbors > 3)) {
                            nextGrid[i][j] = 0;
                        } else {
                            nextGrid[i][j] = state;
                        }
                    }
                }

                // Swap
                let temp = grid;
                grid = nextGrid;
                nextGrid = temp;
            }

            function animate() {
                // Always draw for visual smoothness if effects are added
                draw();

                // Update game logic every X frames
                if (frameCount % evolutionSpeed === 0) {
                    update();
                }
                frameCount++;

                requestAnimationFrame(animate);
            }

            // Event Listeners
            window.addEventListener('resize', resize);

            heroSection.addEventListener('mousemove', (e) => {
                const rect = heroSection.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const col = Math.floor(x / cellSize);
                const row = Math.floor(y / cellSize);

                // Life brush (3x3)
                if (col >= 0 && col < cols && row >= 0 && row < rows) {
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            let c = (col + i + cols) % cols;
                            let r = (row + j + rows) % rows;
                            // Painting probability for organic feel
                            if (Math.random() > 0.3) grid[c][r] = 1;
                        }
                    }
                }
            });

            resize();
            animate();
        }
