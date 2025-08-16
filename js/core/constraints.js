// js/core/constraints.js — Click→Click (без въпроси), с визуални хендъли за ръб/ъгъл/център
import { createConstraint, deleteConstraint, getConstraintsForElement, applyConstraintsFor } from './constraints-engine.js';

const state = {
  mode: 'none',            // 'none' | 'alignV' | 'alignH'
  firstPick: null,         // { el, anchor }
  cursorLine: null,
};

const AXES = {
  alignV: { axis: 'x', anchors: ['left','centerX','right'] },
  alignH: { axis: 'y', anchors: ['top','centerY','bottom'] },
};

const ALL_ANCHORS = ['left','right','top','bottom','centerX','centerY','cornerTL','cornerTR','cornerBL','cornerBR'];

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

// ---- Handles (хендъли) върху widgetите ----
function injectHandleStyles(){
  if (document.getElementById('constraint-handle-style')) return;
  const s = document.createElement('style');
  s.id = 'constraint-handle-style';
  s.textContent = `
    .c-handle{position:absolute; z-index:999; background:#49c0ff; opacity:.85; border-radius:3px; box-shadow:0 0 0 1px rgba(0,0,0,.25);}
    .c-handle.edge{width:6px;height:6px}
    .c-handle.center{width:8px;height:8px}
    .c-handle.corner{width:8px;height:8px}
    .c-handle.hover{opacity:1}
    .c-handle.pick{background:#ffd257;}
  `;
  document.head.appendChild(s);
}

function relevantAnchorsForMode(mode){
  if (mode==='alignV') return ['left','centerX','right'];
  if (mode==='alignH') return ['top','centerY','bottom'];
  return ALL_ANCHORS;
}

function addHandlesTo(el){
  removeHandlesFrom(el);
  const rect = getRect(el);
  const anchors = relevantAnchorsForMode(state.mode);

  const defs = {
    left:     { x: rect.left,  y: rect.centerY, cls:'edge' },
    right:    { x: rect.right, y: rect.centerY, cls:'edge' },
    top:      { x: rect.centerX, y: rect.top,    cls:'edge' },
    bottom:   { x: rect.centerX, y: rect.bottom, cls:'edge' },
    centerX:  { x: rect.centerX, y: rect.centerY, cls:'center' },
    centerY:  { x: rect.centerX, y: rect.centerY, cls:'center' },
    cornerTL: { x: rect.left,  y: rect.top,    cls:'corner' },
    cornerTR: { x: rect.right, y: rect.top,    cls:'corner' },
    cornerBL: { x: rect.left,  y: rect.bottom, cls:'corner' },
    cornerBR: { x: rect.right, y: rect.bottom, cls:'corner' },
  };

  for (const name of anchors){
    const d = defs[name]; if (!d) continue;
    const h = document.createElement('div');
    h.className = `c-handle ${d.cls}`;
    h.dataset.anchor = name;
    // позиционираме спрямо вътрешната координата на елемента
    h.style.left = (d.x - rect.left - (h.offsetWidth||4)/2) + 'px';
    h.style.top  = (d.y - rect.top  - (h.offsetHeight||4)/2) + 'px';
    h.title = name;

    h.addEventListener('mouseenter', ()=> h.classList.add('hover'));
    h.addEventListener('mouseleave', ()=> h.classList.remove('hover'));
    h.addEventListener('click', (e)=>{ e.stopPropagation(); pickAnchor(el, name, h); });

    el.appendChild(h);
  }
}

function removeHandlesFrom(el){
  el.querySelectorAll('.c-handle').forEach(n=>n.remove());
}

function refreshAllHandles(){
  document.querySelectorAll('.widget').forEach(el=>{
    if (state.mode==='none') removeHandlesFrom(el); else addHandlesTo(el);
  });
}

// ---- Pick anchors with click→click ----
function pickAnchor(el, anchor, handleEl){
  // визуална индикация
  document.querySelectorAll('.c-handle.pick').forEach(n=>n.classList.remove('pick'));
  handleEl?.classList.add('pick');

  if (!state.firstPick){
    state.firstPick = { el, anchor };
    return; // чакаме втория клик
  }
  // вторият клик→създаваме констрайнт
  const a = state.firstPick, b = { el, anchor };
  // Нормализирай спрямо режим: ако е alignV, позволяваме само x anchors; alignH→y anchors
  const okX = ['left','centerX','right'];
  const okY = ['top','centerY','bottom'];
  if (state.mode==='alignV' && !(okX.includes(a.anchor) && okX.includes(b.anchor))) { resetPick(); return; }
  if (state.mode==='alignH' && !(okY.includes(a.anchor) && okY.includes(b.anchor))) { resetPick(); return; }

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
    del.addEventListener('click', ()=>{ deleteConstraint(c.id); renderIndicators(); });
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
  // clean old
  hideCursorLine();
  document.removeEventListener('mousemove', updateCursorLine);
  resetPick();
  state.mode = mode;

  if (mode !== 'none'){
    injectHandleStyles();
    document.addEventListener('mousemove', updateCursorLine);
  }
  refreshAllHandles();
  window.dispatchEvent(new CustomEvent('constraints:mode', { detail: { mode } }));
}
function getMode(){ return state.mode; }

// Клик по платното: ако не кликнем върху хендъл, не правим нищо (оставяме drag/selection да действат)
function onCanvasClick(e){ /* no-op; click се хваща от .c-handle */ }

export function initConstraints(){
  document.addEventListener('click', onCanvasClick);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') { setMode('none'); } });
  observeSelectionChanges();
  renderIndicators();
}

// Expose глобално за рибона
window.Constraints = { init: initConstraints, setMode, getMode, getConstraintsForElement };
