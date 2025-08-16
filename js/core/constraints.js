// js/core/constraints.js — Click→Click (без въпроси), с визуални хендъли за ръб/ъгъл/център
import { createConstraint, deleteConstraint, getConstraintsForElement, applyConstraintsFor } from './constraints-engine.js';

const state = {
  mode: 'none',            // 'none' | 'alignV' | 'alignH'
  firstPick: null,         // { el, anchor }
  cursorLine: null,
  hoverEl: null,
};

const AXES = {
  alignV: { axis: 'x', anchors: ['left','centerX','right'] },
  alignH: { axis: 'y', anchors: ['top','centerY','bottom'] },
};

const OK_X = ['left','centerX','right'];
const OK_Y = ['top','centerY','bottom'];

// ---- Utils ----
function getXY(el){
  return {
    x: parseFloat(el.getAttribute('data-x')) || 0,
    y: parseFloat(el.getAttribute('data-y')) || 0,
  };
}
function getRect(el){
  const {x,y} = getXY(el);
  const w = el.getBoundingClientRect().width;
  const h = el.getBoundingClientRect().height;
  return { left:x, right:x+w, top:y, bottom:y+h, centerX:x+w/2, centerY:y+h/2, w, h };
}

// ---- Cursor helper line (допълнение към системния курсор) ----
function ensureCursorLine(){
  if (state.cursorLine) return state.cursorLine;
  const d = document.createElement('div');
  d.id = 'constraints-cursor-line';
  d.style.position = 'fixed';
  d.style.pointerEvents = 'none';
  d.style.zIndex = 10001;
  d.style.opacity = 0.9;
  document.body.appendChild(d);
  state.cursorLine = d; return d;
}
function updateCursorLine(e){
  if (state.mode === 'alignV'){
    const el = ensureCursorLine();
    el.style.width = '1px'; el.style.height = '100vh'; el.style.background = '#49c0ff';
    el.style.left = e.clientX + 'px'; el.style.top = 0;
  } else if (state.mode === 'alignH'){
    const el = ensureCursorLine();
    el.style.height = '1px'; el.style.width = '100vw'; el.style.background = '#49c0ff';
    el.style.top = e.clientY + 'px'; el.style.left = 0;
  } else { hideCursorLine(); }
}
function hideCursorLine(){ if (state.cursorLine){ state.cursorLine.remove(); state.cursorLine=null; } }

// ---- Handle styles + hit area ----
function injectHandleStyles(){
  if (document.getElementById('constraint-handle-style')) return;
  const s = document.createElement('style');
  s.id = 'constraint-handle-style';
  s.textContent = `
    body.constraints-mode .widget{ cursor: crosshair !important; }
    body.constraints-mode .widget *, body.constraints-mode .widget::before, body.constraints-mode .widget::after{ pointer-events:none; }
    body.constraints-mode .widget .c-handle{ pointer-events:auto !important; }

    .c-handle{position:absolute; z-index:999; background:#49c0ff; opacity:.3; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.25); width:16px; height:16px; transform: translate(-50%, -50%);}
    .c-handle.small-dot{width:4px;height:4px}
    .c-handle.hover{opacity:1; transform: translate(-50%, -50%) scale(1.15);}    
    .c-handle.pick{background:#ffd257; opacity:1;}
  `;
  document.head.appendChild(s);
}

function anchorsForMode(mode){
  if (mode==='alignV') return OK_X;
  if (mode==='alignH') return OK_Y;
  return [...OK_X, ...OK_Y];
}

function addHandlesTo(el){
  removeHandlesFrom(el);
  const r = getRect(el);
  const anchors = anchorsForMode(state.mode);
  const map = {
    left:     { x: r.left,      y: r.centerY },
    right:    { x: r.right,     y: r.centerY },
    top:      { x: r.centerX,   y: r.top },
    bottom:   { x: r.centerX,   y: r.bottom },
    centerX:  { x: r.centerX,   y: r.centerY },
    centerY:  { x: r.centerX,   y: r.centerY },
  };
  anchors.forEach(name=>{
    const d = map[name]; if(!d) return;
    const h = document.createElement('div');
    h.className = 'c-handle';
    h.dataset.anchor = name;
    // вътрешни координати
    h.style.left = (d.x - r.left) + 'px';
    h.style.top  = (d.y - r.top) + 'px';
    h.title = name;
    h.addEventListener('mouseenter', ()=> h.classList.add('hover'));
    h.addEventListener('mouseleave', ()=> h.classList.remove('hover'));
    h.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); e.preventDefault(); pickAnchor(el, name, h); });
    el.appendChild(h);
  });
}

function removeHandlesFrom(el){ el?.querySelectorAll('.c-handle').forEach(n=>n.remove()); }

function setHoverEl(el){
  if (state.hoverEl === el) return;
  // пазим хендълите на firstPick елемент, за да не изчезват
  const keep = state.firstPick?.el;
  document.querySelectorAll('.widget').forEach(w=>{ if (w!==keep) removeHandlesFrom(w); });
  state.hoverEl = el;
  if (el) addHandlesTo(el);
}

// ---- Pick anchors with click→click ----
function pickAnchor(el, anchor, handleEl){
  document.querySelectorAll('.c-handle.pick').forEach(n=>n.classList.remove('pick'));
  handleEl?.classList.add('pick');
  if (!state.firstPick){ state.firstPick = { el, anchor }; return; }

  const a = state.firstPick, b = { el, anchor };
  if (state.mode==='alignV' && !(OK_X.includes(a.anchor) && OK_X.includes(b.anchor))) { resetPick(); return; }
  if (state.mode==='alignH' && !(OK_Y.includes(a.anchor) && OK_Y.includes(b.anchor))) { resetPick(); return; }

  createConstraint(a.el, a.anchor, b.el, b.anchor);
  applyConstraintsFor(a.el.id);
  resetPick();
}

function resetPick(){
  state.firstPick = null;
  document.querySelectorAll('.c-handle.pick').forEach(n=>n.classList.remove('pick'));
}

// ---- Indicators over selected element ----
function renderIndicators(){
  document.querySelectorAll('.constraint-badge').forEach(n=>n.remove());
  const selected = document.querySelector('.widget.selected');
  if (!selected) return;
  const list = getConstraintsForElement(selected.id);
  let i=0;
  for (const c of list){
    const badge = document.createElement('div');
    badge.className = 'constraint-badge';
    badge.style.position='absolute'; badge.style.zIndex=1000;
    badge.style.background='#1e263b'; badge.style.border='1px solid #2f3a5a'; badge.style.color='#cfe8ff';
    badge.style.fontSize='11px'; badge.style.padding='2px 6px'; badge.style.borderRadius='6px';
    badge.style.top = '-22px'; badge.style.left = (4 + i*80) + 'px';
    badge.textContent = `${c.b.anchor} = ${c.a.anchor}`;
    const del = document.createElement('span'); del.textContent=' ✕'; del.style.cursor='pointer'; del.style.marginLeft='6px'; del.style.opacity='.8';
    del.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); e.preventDefault(); deleteConstraint(c.id); renderIndicators(); });
    badge.appendChild(del);
    selected.appendChild(badge); i++;
  }
}

function observeSelectionChanges(){
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const obs = new MutationObserver(() => renderIndicators());
  obs.observe(canvas, { subtree:true, attributes:true, attributeFilter:['class','style'] });
}

// ---- Mode handling ----
function setMode(mode){
  if (state.mode === mode) return;
  hideCursorLine();
  document.removeEventListener('mousemove', updateCursorLine);
  resetPick();
  state.mode = mode;
  document.body.classList.toggle('constraints-mode', mode !== 'none');

  if (mode !== 'none'){
    injectHandleStyles();
    document.addEventListener('mousemove', updateCursorLine);
  }
  // започни да следиш hover за показване на хендъли само върху близкия елемент
  if (mode !== 'none') {
    document.addEventListener('mousemove', handleHoverMove, { passive: true });
  } else {
    document.removeEventListener('mousemove', handleHoverMove);
    setHoverEl(null);
  }
  window.dispatchEvent(new CustomEvent('constraints:mode', { detail: { mode } }));
}
function getMode(){ return state.mode; }

function handleHoverMove(e){
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.widget');
  if (!el) { setHoverEl(null); return; }
  setHoverEl(el);
}

export function initConstraints(){
  // не пречим на нормалните кликове; хендълите сами stopPropagation
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') { setMode('none'); } });
  observeSelectionChanges();
  renderIndicators();
}

// Expose глобално за рибона
window.Constraints = { init: initConstraints, setMode, getMode, getConstraintsForElement };

