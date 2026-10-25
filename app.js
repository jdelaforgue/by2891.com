/* by2891 — tiny hash router + persistent audio player + blog loader. No dependencies. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SITE = 'by2891';

  /* ---------- Blog data ---------- */
  let postsPromise;
  const getPosts = () =>
    (postsPromise ||= fetch('posts/index.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(list => list.filter(p => !p.draft).sort((a, b) => b.date.localeCompare(a.date)))
      .catch(() => { postsPromise = null; return null; }));

  const fmtDate = iso =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const renderList = (ul, posts, limit) => {
    if (!posts) { ul.innerHTML = '<li class="empty">Posts couldn\'t load. Refresh the page to try again.</li>'; return; }
    if (!posts.length) { ul.innerHTML = '<li class="empty">No posts yet. The first one is on its way.</li>'; return; }
    ul.innerHTML = posts.slice(0, limit).map(p => `
      <li><a href="#blog/${encodeURIComponent(p.slug)}">
        <time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>
        <h3>${esc(p.title)}</h3>
        ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
      </a></li>`).join('');
  };

  const loadPost = async slug => {
    const titleEl = $('[data-post-title]'), metaEl = $('[data-post-meta]'), bodyEl = $('[data-post-body]');
    titleEl.textContent = 'Loading…'; metaEl.textContent = ''; bodyEl.innerHTML = '';
    const posts = await getPosts();
    const post = posts && posts.find(p => p.slug === slug);
    if (!post) {
      titleEl.textContent = 'Post not found';
      bodyEl.innerHTML = '<p>That link doesn\'t match any post. <a href="#blog">See all posts</a>.</p>';
      document.title = `Post not found — ${SITE}`;
      return;
    }
    titleEl.textContent = post.title;
    metaEl.textContent = fmtDate(post.date) + (post.readingTime ? `, ${post.readingTime} min read` : '');
    document.title = `${post.title} — ${SITE}`;
    try {
      const r = await fetch(`posts/${encodeURIComponent(slug)}.html`);
      if (!r.ok) throw new Error(r.status);
      bodyEl.innerHTML = await r.text();
      $$('img', bodyEl).forEach(img => { img.loading = 'lazy'; img.decoding = 'async'; });
    } catch {
      bodyEl.innerHTML = '<p>This post couldn\'t load. Refresh the page to try again.</p>';
    }
  };

  /* ---------- Router ---------- */
  const titles = { home: `${SITE} — Jordan DeLaforgue`, work: `Work — ${SITE}`, music: `Music — ${SITE}`, blog: `Blog — ${SITE}`, resume: `Résumé — ${SITE}` };
  let first = true;

  const route = () => {
    const hash = decodeURIComponent(location.hash.slice(1));
    let [view, slug] = hash.split('/');
    if (view === 'blog' && slug) view = 'post';
    if (!$(`[data-view="${view}"]`)) view = 'home';

    $$('[data-view]').forEach(s => (s.hidden = s.dataset.view !== view));
    const navKey = view === 'post' ? 'blog' : view;
    $$('.nav a').forEach(a => { if (a.getAttribute('href') === `#${navKey}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });

    if (view === 'post') loadPost(slug);
    else document.title = titles[view];
    if (view === 'blog') getPosts().then(p => renderList($('[data-all]'), p));

    if (!first) {
      window.scrollTo(0, 0);
      const h = $(`[data-view="${view}"] h1`);
      h && h.focus({ preventScroll: true });
    }
    first = false;
  };

  window.addEventListener('hashchange', route);
  route();
  getPosts().then(p => renderList($('[data-latest]'), p, 3));
  $('[data-year]').textContent = new Date().getFullYear();

  /* ---------- Player ---------- */
  const audio = $('[data-audio]');
  const player = $('[data-player]');
  const btns = $$('.track');
  const ICON_PLAY = '<path d="M7 4v16l13-8z"/>';
  const ICON_PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  const tracks = btns.map(b => ({ src: b.dataset.src, title: b.dataset.title, artist: b.dataset.artist }));
  let idx = -1, seeking = false;

  btns.forEach((b, i) => {
    b.innerHTML = `<span><span class="t-title">${esc(b.dataset.title)}</span><span class="t-artist">${esc(b.dataset.artist)}</span></span>
      <span class="t-state" aria-hidden="true"><svg viewBox="0 0 24 24">${ICON_PLAY}</svg></span>`;
    b.setAttribute('aria-label', `Play ${b.dataset.title} by ${b.dataset.artist}`);
    b.addEventListener('click', () => (i === idx ? toggle() : play(i)));
  });

  const fmt = t => (isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

  const syncUI = () => {
    const playing = !audio.paused;
    $('[data-icon]').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    $('[data-toggle]').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    btns.forEach((b, i) => {
      const on = i === idx;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      $('svg', b).innerHTML = on && playing ? ICON_PAUSE : ICON_PLAY;
      b.setAttribute('aria-label', `${on && playing ? 'Pause' : 'Play'} ${tracks[i].title} by ${tracks[i].artist}`);
    });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  };

  const play = i => {
    idx = (i + tracks.length) % tracks.length;
    const t = tracks[idx];
    audio.src = t.src;
    audio.play().catch(() => {});
    $('[data-p-title]').textContent = t.title;
    $('[data-p-artist]').textContent = t.artist;
    if (player.hidden) {
      player.hidden = false;
      requestAnimationFrame(() => document.documentElement.style.setProperty('--player-h', player.offsetHeight + 'px'));
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'by2891' });
    }
    syncUI();
  };
  const toggle = () => (idx < 0 ? play(0) : audio.paused ? audio.play() : audio.pause());

  $('[data-toggle]').addEventListener('click', toggle);
  $('[data-prev]').addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : play(idx - 1)));
  $('[data-next]').addEventListener('click', () => play(idx + 1));

  const seek = $('[data-seek]');
  seek.addEventListener('input', () => { seeking = true; $('[data-cur]').textContent = fmt((seek.value / 1000) * audio.duration); });
  seek.addEventListener('change', () => { if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });

  audio.addEventListener('timeupdate', () => {
    if (seeking) return;
    $('[data-cur]').textContent = fmt(audio.currentTime);
    if (audio.duration) seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
  });
  audio.addEventListener('loadedmetadata', () => ($('[data-dur]').textContent = fmt(audio.duration)));
  audio.addEventListener('play', syncUI);
  audio.addEventListener('pause', syncUI);
  audio.addEventListener('ended', () => play(idx + 1));

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => audio.play());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('previoustrack', () => play(idx - 1));
    ms.setActionHandler('nexttrack', () => play(idx + 1));
  }
  window.addEventListener('resize', () => {
    if (!player.hidden) document.documentElement.style.setProperty('--player-h', player.offsetHeight + 'px');
  });
})();
