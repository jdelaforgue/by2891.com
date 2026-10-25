# by2891.com

Single-page site. No build step, no dependencies.

```
index.html        all pages + styles
app.js            router, music player, blog loader
posts/index.json  list of blog posts
posts/*.html      one file per post
```

## Deploy
Upload these files to the site root, next to the existing `img/`, `image/` and `music/` folders (paths are unchanged from the old site). The old `css/`, `js/`, and loading GIF are no longer used.

## Pages
URLs are hash-based (`/#music`, `/#blog/new-site`) so the page never reloads and audio never stops. Works on any static host without server rewrites.

## Write a blog post
1. Copy `posts/_template.html` to `posts/my-post.html` and write the post in plain HTML.
2. Add an entry to the top of `posts/index.json`:
   ```json
   { "slug": "my-post", "title": "My post", "date": "2026-11-01", "summary": "One line.", "readingTime": 3 }
   ```
   Add `"draft": true` to hide a post while you work on it.

## Add a track
Drop the MP3 in `music/` and add a line to the tracklist in `index.html`:
```html
<li><button class="track" data-src="music/file.mp3" data-title="Song (Feb Mix)" data-artist="Artist"></button></li>
```

## Local preview
`fetch` doesn't work from `file://`, so run a server: `python3 -m http.server` then open http://localhost:8000.
