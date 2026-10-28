/* =====================================================================
   Cockpit – Ink-Engine
   Zeichenschicht für Whiteboard und Dateien. Vektorbasiert: Striche und
   Textfelder liegen in logischen Koordinaten (w × h) und werden bei jeder
   Größe scharf neu gezeichnet. Werkzeuge: Stift (druckempfindlich),
   Marker, Radierer (löscht ganze Striche), Text. Rückgängig/Wiederholen.
   ===================================================================== */
(function () {
  'use strict';
  const FONT = 'Poppins, system-ui, -apple-system, "Segoe UI", sans-serif';
  const BASE = { 1: 2.2, 2: 4.5, 3: 9 };

  function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function segDist2(px, py, ax, ay, bx, by) {
    const l2 = dist2(ax, ay, bx, by); if (!l2) return dist2(px, py, ax, ay);
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2; t = Math.max(0, Math.min(1, t));
    return dist2(px, py, ax + t * (bx - ax), ay + t * (by - ay));
  }

  function drawStroke(ctx, s, k) {
    const p = s.p; if (!p.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = s.c;
    if (s.t === 'marker') {
      ctx.globalAlpha = .38; ctx.lineWidth = s.w * k;
      ctx.beginPath(); ctx.moveTo(p[0][0] * k, p[0][1] * k);
      for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; ctx.quadraticCurveTo(p[i][0] * k, p[i][1] * k, mx * k, my * k); }
      const l = p[p.length - 1]; ctx.lineTo(l[0] * k, l[1] * k); ctx.stroke();
    } else {
      if (p.length === 1) { ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(p[0][0] * k, p[0][1] * k, s.w * k * (0.4 + p[0][2] * 0.9) / 2, 0, Math.PI * 2); ctx.fill(); }
      let px = p[0][0], py = p[0][1];
      for (let i = 1; i < p.length; i++) {
        const mx = i < p.length - 1 ? (p[i][0] + p[i + 1][0]) / 2 : p[i][0];
        const my = i < p.length - 1 ? (p[i][1] + p[i + 1][1]) / 2 : p[i][1];
        ctx.lineWidth = Math.max(.6, s.w * k * (0.4 + ((p[i][2] + p[i - 1][2]) / 2) * 0.9));
        ctx.beginPath(); ctx.moveTo(px * k, py * k); ctx.quadraticCurveTo(p[i][0] * k, p[i][1] * k, mx * k, my * k); ctx.stroke();
        px = mx; py = my;
      }
    }
    ctx.restore();
  }
  function textLines(t) { return String(t.t || '').split('\n'); }
  function textBox(ctx, t) {
    ctx.font = `500 ${t.s}px ${FONT}`;
    const lines = textLines(t); let w = 0; lines.forEach(l => { w = Math.max(w, ctx.measureText(l).width); });
    return { x: t.x, y: t.y, w: Math.max(w, t.s * .6), h: lines.length * t.s * 1.25 };
  }
  function drawText(ctx, t, k) {
    ctx.save(); ctx.fillStyle = t.c; ctx.textBaseline = 'top'; ctx.font = `500 ${t.s * k}px ${FONT}`;
    textLines(t).forEach((l, i) => ctx.fillText(l, t.x * k, (t.y + i * t.s * 1.25) * k));
    ctx.restore();
  }

  class InkLayer {
    /* opts: { w, h, data:{strokes,texts}, onChange(data), host (Element für Textfelder) } */
    constructor(canvas, opts) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.w = opts.w; this.h = opts.h; this.host = opts.host || canvas.parentElement;
      this.data = opts.data || { strokes: [], texts: [] };
      this.data.strokes = this.data.strokes || []; this.data.texts = this.data.texts || [];
      this.onChange = opts.onChange || (() => {});
      this.tool = 'pen'; this.color = '#111111'; this.size = 2; this.textSize = 28;
      this.undoStack = []; this.redoStack = []; this.cur = null; this.lastPen = 0; this.k = 1;
      this._bind(); this.resize();
    }
    _bind() {
      const cv = this.cv;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', e => this._down(e));
      cv.addEventListener('pointermove', e => this._move(e));
      cv.addEventListener('pointerup', e => this._up(e));
      cv.addEventListener('pointercancel', e => this._up(e));
      cv.addEventListener('pointerleave', e => { if (this.cur && e.pointerType === 'mouse') this._up(e); });
    }
    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      if (!r.width) return;
      this.k = r.width / this.w; this.dpr = dpr;
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
      this.render();
    }
    _pt(e) {
      const r = this.cv.getBoundingClientRect();
      const pr = e.pointerType === 'mouse' ? .5 : (e.pressure || .5);
      return [(e.clientX - r.left) / this.k, (e.clientY - r.top) / this.k, Math.max(.05, Math.min(1, pr))];
    }
    _skip(e) {
      if (e.pointerType === 'pen') this.lastPen = Date.now();
      return e.pointerType === 'touch' && Date.now() - this.lastPen < 1500; // Handballen ignorieren, solange der Stift aktiv ist
    }
    _down(e) {
      if (this.tool === 'none' || this._skip(e) || (e.button && e.button !== 0)) return;
      e.preventDefault(); this.cv.setPointerCapture(e.pointerId);
      const pt = this._pt(e);
      if (this.tool === 'text') { this._textAt(pt[0], pt[1]); return; }
      if (this.tool === 'eraser') { this.cur = { erase: true, removed: [] }; this._erase(pt); return; }
      const w = BASE[this.size] * (this.tool === 'marker' ? 4 : 1);
      this.cur = { t: this.tool, c: this.color, w, p: [pt] };
      this._drawLive();
    }
    _move(e) {
      if (!this.cur || this._skip(e)) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (this.cur.erase) { evs.forEach(ev => this._erase(this._pt(ev))); return; }
      evs.forEach(ev => { const p = this._pt(ev), l = this.cur.p[this.cur.p.length - 1]; if (dist2(p[0], p[1], l[0], l[1]) > .25) this.cur.p.push(p); });
      this._drawLive();
    }
    _up() {
      const c = this.cur; this.cur = null; if (!c) return;
      if (c.erase) { if (c.removed.length) { this.undoStack.push({ op: 'remove', items: c.removed }); this.redoStack = []; this._changed(); } return; }
      c.p = c.p.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 100) / 100]);
      this.data.strokes.push(c); this.undoStack.push({ op: 'add', kind: 'strokes', item: c }); this.redoStack = [];
      this.render(); this._changed();
    }
    _drawLive() {
      this.render();
      const ctx = this.ctx; ctx.save(); ctx.scale(this.dpr, this.dpr); drawStroke(ctx, this.cur, this.k); ctx.restore();
    }
    _erase(pt) {
      const r = (BASE[this.size] * 2.2 + 6), r2 = r * r; let hit = false;
      this.data.strokes.slice().forEach(s => {
        const p = s.p; let near = false;
        for (let i = 0; i < p.length && !near; i++) {
          if (i === 0 ? dist2(pt[0], pt[1], p[0][0], p[0][1]) < r2 + (s.w * s.w) / 4 : segDist2(pt[0], pt[1], p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) < r2 + (s.w * s.w) / 4) near = true;
        }
        if (near) { const idx = this.data.strokes.indexOf(s); this.data.strokes.splice(idx, 1); this.cur.removed.push({ kind: 'strokes', item: s, idx }); hit = true; }
      });
      this.data.texts.slice().forEach(t => {
        const b = textBox(this.ctx, t);
        if (pt[0] >= b.x - r && pt[0] <= b.x + b.w + r && pt[1] >= b.y - r && pt[1] <= b.y + b.h + r) { const idx = this.data.texts.indexOf(t); this.data.texts.splice(idx, 1); this.cur.removed.push({ kind: 'texts', item: t, idx }); hit = true; }
      });
      if (hit) this.render();
    }
    _textAt(x, y, existing) {
      if (!existing) {
        existing = this.data.texts.find(t => { const b = textBox(this.ctx, t); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; });
      }
      const t = existing || { x, y, s: this.textSize, c: this.color, t: '' };
      if (existing) { this.data.texts.splice(this.data.texts.indexOf(existing), 1); this.render(); }
      const ta = document.createElement('textarea');
      ta.className = 'textin'; ta.value = t.t; ta.rows = 1; ta.spellcheck = true;
      const hostR = this.host.getBoundingClientRect(), cvR = this.cv.getBoundingClientRect();
      Object.assign(ta.style, { left: (cvR.left - hostR.left + t.x * this.k) + 'px', top: (cvR.top - hostR.top + t.y * this.k) + 'px', fontSize: (t.s * this.k) + 'px', color: t.c });
      const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.width = Math.max(120, ta.scrollWidth + 12) + 'px'; };
      ta.addEventListener('input', fit);
      let done = false;
      const commit = () => {
        if (done) return; done = true; ta.remove();
        const v = ta.value.replace(/\s+$/, '');
        if (v) { const nt = Object.assign({}, t, { t: v }); this.data.texts.push(nt); this.undoStack.push(existing ? { op: 'edit', old: existing, item: nt } : { op: 'add', kind: 'texts', item: nt }); this.redoStack = []; }
        else if (existing) { this.undoStack.push({ op: 'remove', items: [{ kind: 'texts', item: existing, idx: this.data.texts.length }] }); }
        this.render(); this._changed();
      };
      ta.addEventListener('blur', commit);
      ta.addEventListener('keydown', e => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); ta.blur(); } e.stopPropagation(); });
      this.host.appendChild(ta); fit(); setTimeout(() => ta.focus(), 0);
    }
    undo() {
      const a = this.undoStack.pop(); if (!a) return;
      if (a.op === 'add') { const arr = this.data[a.kind], i = arr.indexOf(a.item); if (i >= 0) arr.splice(i, 1); }
      if (a.op === 'remove') a.items.slice().reverse().forEach(r => this.data[r.kind].splice(Math.min(r.idx, this.data[r.kind].length), 0, r.item));
      if (a.op === 'edit') { const i = this.data.texts.indexOf(a.item); if (i >= 0) this.data.texts.splice(i, 1, a.old); }
      if (a.op === 'clear') { this.data.strokes = a.strokes; this.data.texts = a.texts; }
      this.redoStack.push(a); this.render(); this._changed();
    }
    redo() {
      const a = this.redoStack.pop(); if (!a) return;
      if (a.op === 'add') this.data[a.kind].push(a.item);
      if (a.op === 'remove') a.items.forEach(r => { const arr = this.data[r.kind], i = arr.indexOf(r.item); if (i >= 0) arr.splice(i, 1); });
      if (a.op === 'edit') { const i = this.data.texts.indexOf(a.old); if (i >= 0) this.data.texts.splice(i, 1, a.item); }
      if (a.op === 'clear') { this.data.strokes = []; this.data.texts = []; }
      this.undoStack.push(a); this.render(); this._changed();
    }
    clear() {
      if (!this.data.strokes.length && !this.data.texts.length) return;
      this.undoStack.push({ op: 'clear', strokes: this.data.strokes, texts: this.data.texts }); this.redoStack = [];
      this.data.strokes = []; this.data.texts = []; this.render(); this._changed();
    }
    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    _changed() { this.onChange(this.data); }
    render() {
      const ctx = this.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      ctx.save(); ctx.scale(this.dpr || 1, this.dpr || 1);
      this.data.strokes.forEach(s => drawStroke(ctx, s, this.k));
      this.data.texts.forEach(t => drawText(ctx, t, this.k));
      ctx.restore();
    }
    /* Zeichnet die Inhalte in einen fremden Kontext (Export) mit Maßstab k */
    static paint(ctx, data, k) {
      (data.strokes || []).forEach(s => drawStroke(ctx, s, k));
      (data.texts || []).forEach(t => drawText(ctx, t, k));
    }
  }

  /* Hintergründe fürs Whiteboard */
  function paintBg(ctx, kind, W, H, k) {
    const bg = kind === 'dark' ? '#14161c' : kind === 'green' ? '#1f3a2e' : '#ffffff';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W * k, H * k);
    if (kind === 'grid' || kind === 'lines') {
      ctx.strokeStyle = 'rgba(80,110,160,.22)'; ctx.lineWidth = Math.max(1, k);
      const step = 40 * k; ctx.beginPath();
      for (let y = step; y < H * k; y += step) { ctx.moveTo(0, y); ctx.lineTo(W * k, y); }
      if (kind === 'grid') for (let x = step; x < W * k; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H * k); }
      ctx.stroke();
    }
  }

  window.Ink = { InkLayer, paintBg, BASE };
})();
