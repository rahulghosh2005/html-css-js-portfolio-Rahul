# Rahul OS

A retro desktop portfolio built with plain HTML, CSS, and JavaScript.

## Local preview

```sh
python3 dev_server.py
```

Open http://localhost:8000. The preview refreshes when `index.html`, `styles.css`, or `app.js` changes. No build step or package install is required.

- `index.html`: portfolio content and desktop structure.
- `styles.css`: colors, window styling, and responsive layouts.
- `app.js`: windows, search, drawing, and the sketchbook.

## Desktop controls

Open apps from the top bar or Start menu. Drag a title bar to move a window; double-click to maximize or restore it. Minimized windows stay in the taskbar.

- **B**: toggle the brush.
- **E**: toggle the eraser; the size selector controls either tool, starting at 1px.
- **Z**: undo a stroke or clear operation.
- **Ctrl/Cmd + K**: search the portfolio.
- **Enter / Shift + Enter**: next / previous search match.
- **Escape**: exit drawing, dismiss Start, or clear a focused search.

Saved drawings appear in **Digital Art → Your work** during the current tab session (including refreshes), download as PNGs, and persist in this browser's sketchbook, up to eight sketches. The current canvas survives resizing; undo history resets on resize. Add gallery items with `addArtItem(imageSrc, title, description)` in `app.js`.
