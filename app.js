'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const canvas = $('#drawingCanvas');
const ctx = canvas.getContext('2d');
const windows = $$('.window');
const appNames = { dev: 'Dev', art: 'Art', music: 'Music', rahul: 'Rahul', savedDrawings: 'Sketchbook' };
let zIndex = 100;
let focusedWindow = null;
let toastTimer;
// Touch controls activate on release; ignore the follow-up compatibility click.
function bindWindowControl(button, activate) {
    let lastTouch = -Infinity;
    button.addEventListener('pointerup', event => {
        if (event.pointerType !== 'touch' || !event.isPrimary) return;
        const rect = button.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
        lastTouch = performance.now();
        event.stopPropagation();
        activate();
    });
    button.addEventListener('click', event => {
        if (event.detail !== 0 && performance.now() - lastTouch < 700) return;
        activate();
    });
}
function notify(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}
function desktopBounds() {
    const top = $('.menu-bar').getBoundingClientRect().bottom + (innerWidth < 700 ? 32 : 56);
    const bottom = $('.drawing-controls').getBoundingClientRect().top - 14;
    return { top, bottom, width: innerWidth };
}
function clampWindow(panel) {
    if (panel.classList.contains('maximized')) return;
    const { top, bottom, width } = desktopBounds();
    panel.style.maxHeight = Math.max(100, bottom - top) + 'px';
    const rect = panel.getBoundingClientRect();
    panel.style.left = Math.max(12, Math.min(rect.left, width - rect.width - 12)) + 'px';
    panel.style.top = Math.max(top, Math.min(rect.top, bottom - Math.min(rect.height, bottom - top))) + 'px';
}
function focusWindow(panel) {
    windows.forEach(w => w.classList.toggle('active-window', w === panel));
    panel.style.zIndex = ++zIndex;
    focusedWindow = panel;
    renderTasks();
}
function showWindow(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.dataset.open = 'true';
    panel.style.display = 'flex';
    clampWindow(panel);
    focusWindow(panel);
    $('#startMenu').hidden = true;
    $('#startButton').setAttribute('aria-expanded', 'false');
}
function hideWindow(id, close = false) {
    const panel = document.getElementById(id);
    panel.style.display = 'none';
    if (close) panel.dataset.open = 'false';
    if (focusedWindow === panel) {
        focusedWindow = null;
        const next = windows.filter(w => w.style.display !== 'none').sort((a, b) => +b.style.zIndex - +a.style.zIndex)[0];
        if (next) focusWindow(next);
    }
    panel.classList.remove('active-window');
    renderTasks();
}
function maximizeWindow(id) {
    const panel = document.getElementById(id);
    if (!panel.classList.contains('maximized')) {
        panel.dataset.restoreLeft = panel.style.left;
        panel.dataset.restoreTop = panel.style.top;
        panel.classList.add('maximized');
    } else {
        panel.classList.remove('maximized');
        panel.style.left = panel.dataset.restoreLeft;
        panel.style.top = panel.dataset.restoreTop;
        clampWindow(panel);
    }
    const button = $('[data-action="maximize"]', panel);
    button.textContent = panel.classList.contains('maximized') ? '❐' : '□';
    button.setAttribute('aria-label', panel.classList.contains('maximized') ? 'Restore window' : 'Maximize window');
    focusWindow(panel);
}
function renderTasks() {
    const list = $('#taskList');
    list.replaceChildren();
    windows.filter(w => w.dataset.open === 'true').forEach(panel => {
        const button = document.createElement('button');
        button.className = 'task' + (panel === focusedWindow && panel.style.display !== 'none' ? ' active' : '');
        button.textContent = appNames[panel.id];
        button.setAttribute('aria-label', `Switch to ${appNames[panel.id]}`);
        button.setAttribute('aria-pressed', String(panel === focusedWindow && panel.style.display !== 'none'));
        button.onclick = () => panel === focusedWindow && panel.style.display !== 'none' ? hideWindow(panel.id) : showWindow(panel.id);
        list.append(button);
    });
    $$('.menu-icon').forEach(button => {
        const active = focusedWindow?.id === button.dataset.app && focusedWindow.style.display !== 'none';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}
windows.forEach((panel, index) => {
    panel.style.left = (innerWidth < 700 ? 12 : 42 + index * 65) + 'px';
    panel.style.top = (innerWidth < 700 ? 155 : 136 + index * 28) + 'px';
    panel.style.display = 'none';
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `${appNames[panel.id]} window`);
    const title = $('.window-title', panel);
    const oldClose = $('.close-btn', title);
    oldClose.remove();
    const controls = document.createElement('div');
    controls.className = 'window-controls';
    for (const [action, symbol, label] of [['minimize', '−', 'Minimize window'], ['maximize', '□', 'Maximize window'], ['close', '×', 'Close window']]) {
        const button = document.createElement('button');
        button.className = 'window-control' + (action === 'close' ? ' close-btn' : '');
        button.textContent = symbol;
        button.dataset.action = action;
        button.setAttribute('aria-label', label);
        bindWindowControl(button, () => action === 'maximize' ? maximizeWindow(panel.id) : hideWindow(panel.id, action === 'close'));
        controls.append(button);
    }
    title.append(controls);
    const footer = document.createElement('div');
    footer.className = 'window-footer';
    const status = document.createElement('span');
    status.textContent = panel.id === 'dev' ? `${$$('.project', panel).length} projects · always building` : panel.id === 'rahul' ? 'Tech × creativity × commerce' : 'Rahul OS / ' + appNames[panel.id];
    const hint = document.createElement('span');
    hint.textContent = '↗ explore';
    footer.append(status);
    if (panel.id !== 'art') footer.append(hint);
    panel.append(footer);
    panel.addEventListener('pointerdown', event => {
        if (!event.target.closest('button, a, input, select, video')) focusWindow(panel);
    });
    title.addEventListener('dblclick', event => { if (!event.target.closest('button')) maximizeWindow(panel.id); });
    let drag;
    title.addEventListener('pointerdown', event => {
        if (event.target.closest('button') || panel.classList.contains('maximized') || event.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        title.setPointerCapture(event.pointerId);
        title.style.cursor = 'grabbing';
        event.preventDefault();
    });
    title.addEventListener('pointermove', event => {
        if (!drag) return;
        const bounds = desktopBounds();
        panel.style.left = Math.max(12, Math.min(event.clientX - drag.x, innerWidth - panel.offsetWidth - 12)) + 'px';
        panel.style.top = Math.max(bounds.top, Math.min(event.clientY - drag.y, bounds.bottom - 40)) + 'px';
    });
    const stopDrag = () => { drag = null; title.style.cursor = ''; };
    title.addEventListener('pointerup', stopDrag);
    title.addEventListener('pointercancel', stopDrag);
    title.addEventListener('lostpointercapture', stopDrag);
});
$('#startButton').onclick = () => {
    $('#startMenu').hidden = !$('#startMenu').hidden;
    $('#startButton').setAttribute('aria-expanded', String(!$('#startMenu').hidden));
};
document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#startMenu, #startButton')) {
        $('#startMenu').hidden = true;
        $('#startButton').setAttribute('aria-expanded', 'false');
    }
});
function setDesktopName(visible) {
    $('#desktopName').hidden = !visible;
    $('#startMenu').hidden = true;
    $('#startButton').setAttribute('aria-expanded', 'false');
    if (visible) keepDesktopNameInBounds();
}
const desktopName = $('#desktopName');
let nameDrag = null;
function moveDesktopName(left, top) {
    const rect = desktopName.getBoundingClientRect();
    const minTop = $('.menu-bar').getBoundingClientRect().bottom + 12;
    const maxBottom = $('.drawing-controls').getBoundingClientRect().top - 14;
    desktopName.style.right = 'auto';
    desktopName.style.left = Math.max(12, Math.min(left, innerWidth - rect.width - 12)) + 'px';
    desktopName.style.top = Math.max(minTop, Math.min(top, maxBottom - rect.height)) + 'px';
}
function keepDesktopNameInBounds() {
    if (desktopName.hidden) return;
    const rect = desktopName.getBoundingClientRect();
    moveDesktopName(rect.left, rect.top);
}
desktopName.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0) return;
    const rect = desktopName.getBoundingClientRect();
    nameDrag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    desktopName.setPointerCapture(event.pointerId);
    desktopName.style.cursor = 'grabbing';
    event.preventDefault();
});
desktopName.addEventListener('pointermove', event => {
    if (nameDrag) moveDesktopName(event.clientX - nameDrag.x, event.clientY - nameDrag.y);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => desktopName.addEventListener(type, () => {
    nameDrag = null;
    desktopName.style.cursor = '';
}));
$('h1', desktopName).addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const rect = desktopName.getBoundingClientRect();
    const step = event.shiftKey ? 30 : 10;
    moveDesktopName(rect.left + direction[0] * step, rect.top + direction[1] * step);
});
window.addEventListener('resize', keepDesktopNameInBounds);
function resetDesktop() {
    windows.forEach((panel, index) => {
        panel.classList.remove('maximized');
        $('[data-action="maximize"]', panel).textContent = '□';
        $('[data-action="maximize"]', panel).setAttribute('aria-label', 'Maximize window');
        panel.style.left = (innerWidth < 700 ? 12 : 42 + index * 65) + 'px';
        panel.style.top = (innerWidth < 700 ? 155 : 136 + index * 28) + 'px';
        hideWindow(panel.id, true);
    });
    $('#searchInput').value = '';
    performSearch('');
    showWindow('dev');
    notify('Desktop tidied up.');
}

// Search replaces each text node once, even when it contains multiple matches.
let allMatches = [];
let currentMatchIndex = 0;
function clearHighlights() {
    $$('.search-highlight').forEach(mark => {
        const parent = mark.parentNode;
        mark.replaceWith(document.createTextNode(mark.textContent));
        parent.normalize();
    });
}
function performSearch(value) {
    clearHighlights();
    allMatches = [];
    currentMatchIndex = 0;
    const query = value.trim().toLowerCase();
    if (!query) { updateMatchCount(); return; }
    windows.forEach(panel => {
        const content = $('.window-content', panel);
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
            acceptNode: node => node.parentElement.closest('script,style,button,select') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const text = node.textContent;
            const lower = text.toLowerCase();
            if (!lower.includes(query)) return;
            const fragment = document.createDocumentFragment();
            let cursor = 0, index;
            while ((index = lower.indexOf(query, cursor)) !== -1) {
                fragment.append(document.createTextNode(text.slice(cursor, index)));
                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = text.slice(index, index + query.length);
                fragment.append(mark);
                allMatches.push(mark);
                cursor = index + query.length;
            }
            fragment.append(document.createTextNode(text.slice(cursor)));
            node.replaceWith(fragment);
        });
    });
    if (allMatches.length) scrollToMatch(0);
    updateMatchCount();
}
function scrollToMatch(index) {
    if (!allMatches.length) return;
    allMatches.forEach(mark => mark.classList.remove('current'));
    const match = allMatches[index];
    if (match.closest('#art')) selectArtTab(match.closest('#yourWork') ? 'work' : 'gallery');
    showWindow(match.closest('.window').id);
    match.classList.add('current');
    match.scrollIntoView({ block: 'center', behavior: 'auto' });
    currentMatchIndex = index;
}
function updateMatchCount() {
    $('#matchCount').textContent = $('#searchInput').value.trim() ? (allMatches.length ? `${currentMatchIndex + 1}/${allMatches.length}` : '0 hits') : '';
}
function nextMatch(direction = 1) {
    if (!allMatches.length) return;
    scrollToMatch((currentMatchIndex + direction + allMatches.length) % allMatches.length);
    updateMatchCount();
}
$('#searchInput').addEventListener('input', event => performSearch(event.target.value));
$('#searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); nextMatch(event.shiftKey ? -1 : 1); }
    if (event.key === 'Escape') { event.target.value = ''; performSearch(''); event.target.blur(); }
});
document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); $('#searchInput').focus(); $('#searchInput').select();
    }
    if (event.key === 'Escape') { $('#startMenu').hidden = true; setDrawingTool(null); }
    if (event.target.closest('input,textarea,select') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === 'b') toggleBrush();
    if (event.key.toLowerCase() === 'e') toggleEraser();
    if (event.key.toLowerCase() === 'z') undoDrawing();
});

// Transparent, high-resolution canvas; resize preserves the artwork.
let isBrushMode = false, isDrawing = false, brushColor = '#ff4c92', brushSize = 5;
let drawingTool = null;
let previousPoint;
let undoStack = [];
let hasDrawing = false;
function resizeCanvas() {
    if (isDrawing) { isDrawing = false; previousPoint = null; }
    const snapshot = document.createElement('canvas');
    snapshot.width = canvas.width; snapshot.height = canvas.height;
    if (canvas.width && canvas.height) snapshot.getContext('2d').drawImage(canvas, 0, 0);
    const top = $('.menu-bar').offsetHeight;
    const width = innerWidth;
    const height = Math.max(1, innerHeight - top - $('.taskbar').offsetHeight);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const oldRatio = +canvas.dataset.ratio || ratio;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (snapshot.width) ctx.drawImage(snapshot, 0, 0, snapshot.width / oldRatio, snapshot.height / oldRatio);
    canvas.dataset.ratio = ratio;
    undoStack = [];
    updateUndo();
    windows.filter(panel => panel.style.display !== 'none').forEach(clampWindow);
}
function checkpoint() {
    undoStack.push({ pixels: ctx.getImageData(0, 0, canvas.width, canvas.height), hasDrawing });
    if (undoStack.length > 8) undoStack.shift();
    updateUndo();
}
function updateUndo() { $('#undoButton').disabled = undoStack.length === 0; }
function undoDrawing() {
    if (!undoStack.length) return;
    const last = undoStack.pop();
    ctx.putImageData(last.pixels, 0, 0); hasDrawing = last.hasDrawing;
    updateUndo();
}
function setDrawingTool(tool) {
    drawingTool = tool;
    isBrushMode = tool !== null;
    document.body.classList.toggle('brush-mode', isBrushMode);
    document.body.classList.toggle('eraser-mode', tool === 'eraser');
    for (const [id, name] of [['brushToggle', 'brush'], ['eraserToggle', 'eraser']]) {
        $('#' + id).classList.toggle('active', tool === name);
        $('#' + id).setAttribute('aria-pressed', String(tool === name));
    }
    isDrawing = false; previousPoint = null;
}
function toggleBrush() { setDrawingTool(drawingTool === 'brush' ? null : 'brush'); }
function toggleEraser() { setDrawingTool(drawingTool === 'eraser' ? null : 'eraser'); }
function selectColor(button) {
    brushColor = button.dataset.color;
    $$('.color-swatch').forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch === button)));
    setDrawingTool('brush');
}
function pointFrom(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
canvas.addEventListener('pointerdown', event => {
    if (!isBrushMode || event.button !== 0 || isDrawing) return;
    checkpoint(); isDrawing = true;
    if (drawingTool === 'brush') hasDrawing = true;
    previousPoint = pointFrom(event);
    canvas.setPointerCapture(event.pointerId);
    ctx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = brushColor; ctx.beginPath();
    ctx.arc(previousPoint.x, previousPoint.y, brushSize / 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
});
canvas.addEventListener('pointermove', event => {
    if (!isDrawing || !isBrushMode) return;
    const next = pointFrom(event);
    ctx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath(); ctx.moveTo(previousPoint.x, previousPoint.y); ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    previousPoint = next;
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => { isDrawing = false; previousPoint = null; }));
function clearCanvas() {
    if (!hasDrawing) return;
    checkpoint(); ctx.clearRect(0, 0, canvas.width, canvas.height); hasDrawing = false;
    notify('Canvas cleared. Undo brings it back.');
}
$('#brushSize').addEventListener('change', event => { brushSize = +event.target.value; });
let savedDrawings = [];
let sessionDrawingIds = new Set();
try {
    const ids = JSON.parse(sessionStorage.getItem('rahul-session-sketches') || '[]');
    if (Array.isArray(ids)) sessionDrawingIds = new Set(ids.filter(id => typeof id === 'number'));
} catch (_) {}
try {
    const stored = JSON.parse(localStorage.getItem('rahul-sketchbook') || '[]');
    if (Array.isArray(stored)) savedDrawings = stored.filter(item => typeof item?.data === 'string' && item.data.startsWith('data:image/png;') && typeof item.id === 'number' && typeof item.timestamp === 'string').slice(0, 8);
} catch (_) { /* The sketchbook still works when local storage is unavailable. */ }
function persistDrawings() {
    try { localStorage.setItem('rahul-sketchbook', JSON.stringify(savedDrawings)); return true; }
    catch (_) { notify('Browser storage is full or unavailable. Download your sketch to keep it.'); return false; }
}
function downloadDrawing(drawing) {
    const link = document.createElement('a'); link.href = drawing.data; link.download = `rahul-sketch-${drawing.id}.png`; link.click();
}
function saveDrawing() {
    if (!hasDrawing) { notify('Make your mark first. Press B to start drawing.'); return; }
    if (savedDrawings.length >= 8) { notify('Sketchbook full. Download and delete an older sketch to make room.'); showWindow('savedDrawings'); return; }
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width; exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.fillStyle = '#f3f1e8'; exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height); exportCtx.drawImage(canvas, 0, 0);
    const drawing = { id: Date.now(), data: exportCanvas.toDataURL('image/png'), timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    savedDrawings.unshift(drawing);
    sessionDrawingIds.add(drawing.id);
    try { sessionStorage.setItem('rahul-session-sketches', JSON.stringify([...sessionDrawingIds])); } catch (_) {}
    const persisted = persistDrawings();
    updateSavedDrawingsGallery(); selectArtTab('work'); showWindow('art'); downloadDrawing(drawing);
    if (persisted) notify('Saved to your sketchbook + downloaded as PNG.');
}
function updateSavedDrawingsGallery() {
    renderDrawingGallery($('#savedDrawingsGallery'), savedDrawings);
    renderDrawingGallery($('#yourWorkGallery'), savedDrawings.filter(drawing => sessionDrawingIds.has(drawing.id)));
}
function selectArtTab(tab) {
    const work = tab === 'work';
    $('#artGallery').hidden = work;
    $('#yourWork').hidden = !work;
    for (const [id, selected] of [['galleryTab', !work], ['yourWorkTab', work]]) {
        $('#' + id).setAttribute('aria-selected', String(selected));
        $('#' + id).tabIndex = selected ? 0 : -1;
    }
}
$$('.art-tab').forEach(button => button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const work = event.key === 'End' || (event.key !== 'Home' && button.id === 'galleryTab');
    selectArtTab(work ? 'work' : 'gallery');
    $(work ? '#yourWorkTab' : '#galleryTab').focus();
}));
function renderDrawingGallery(gallery, drawings) {
    gallery.replaceChildren();
    if (!drawings.length) {
        const empty = document.createElement('div'); empty.className = 'empty-state';
        empty.innerHTML = '<div class="empty-icon">✎</div><h2>Your little masterpieces.</h2><p>Draw on the desktop, hit Save, and keep something you made here.</p>';
        gallery.append(empty); return;
    }
    drawings.forEach(drawing => {
        const item = document.createElement('div'); item.className = 'saved-drawing-item';
        const image = document.createElement('img'); image.className = 'saved-drawing-image'; image.src = drawing.data; image.alt = 'Desktop sketch from ' + drawing.timestamp;
        const meta = document.createElement('div'); meta.className = 'saved-drawing-meta';
        const label = document.createElement('span'); label.textContent = drawing.timestamp;
        const download = document.createElement('button'); download.className = 'control-btn'; download.textContent = '↓ PNG'; download.setAttribute('aria-label', 'Download sketch'); download.onclick = () => downloadDrawing(drawing);
        const remove = document.createElement('button'); remove.className = 'saved-drawing-delete'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Delete sketch'); remove.onclick = () => deleteSavedDrawing(drawing.id);
        meta.append(label, download, remove); item.append(image, meta); gallery.append(item);
    });
}
function deleteSavedDrawing(id) { savedDrawings = savedDrawings.filter(drawing => drawing.id !== id); persistDrawings(); updateSavedDrawingsGallery(); }
function addArtItem(imageSrc, title, description) {
    const gallery = $('#artGallery'); $('.empty-state', gallery)?.remove();
    const item = document.createElement('div'); item.className = 'art-item';
    const image = document.createElement('img'); image.src = imageSrc; image.alt = title; image.className = 'art-item-image'; image.loading = 'lazy';
    const info = document.createElement('div'); info.className = 'art-item-info';
    const heading = document.createElement('div'); heading.className = 'art-item-title'; heading.textContent = title;
    const copy = document.createElement('div'); copy.className = 'art-item-desc'; copy.textContent = description;
    info.append(heading, copy); item.append(image, info); gallery.append(item);
}
$$('a[target="_blank"]').forEach(link => { link.rel = 'noopener noreferrer'; });
$$('#dev .project').forEach((project, index) => {
    const number = document.createElement('span'); number.className = 'project-number'; number.textContent = String(index + 1).padStart(2, '0'); $('.project-title', project).append(number);
});
function updateClock() { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function playAnimation() {
    $('#animationDialog').showModal();
    $('#animationPlayer').play().catch(() => notify('Press play to start the animation.'));
}
$('#animationDialog').addEventListener('close', () => $('#animationPlayer').pause());
$('#animationDialog').addEventListener('click', event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
});
updateClock(); setInterval(updateClock, 1000);
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); updateSavedDrawingsGallery(); showWindow('dev');
