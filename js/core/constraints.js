// js/core/constraints.js
// Визуален слой + мод за създаване/изтриване на констрайнти. Ползва constraints-engine.
import { createConstraint, deleteConstraint, getConstraintsForElement, applyConstraintsFor } from './constraints-engine.js';

const state = {
  mode: 'none', // 'none' | 'alignV' | 'alignH'
  pending: null, // { el, anchor }
  cursorEl: null,
  anchorPicker: null,
};

const AXES = {
  alignV: { axis: 'x', anchors: ['left','centerX','right'] },
  alignH: { axis: 'y', anchors: ['top','centerY','bottom'] },
};

function setPos(el, x, y){ el.style.transform = `translate(${x}px, ${y}px)`; el.setAttribute('data-x', x); el.setAttribute('data-y', y); }
function getRect(el){ const x=parseFloat(el.getAttribute('data-x'))||0; const y=parseFloat(el.getAttribute('data-y'))||0; const w=el.getBoundingClientRect().width; const h=el.getBoundingClientRect().height; return {left:x,right:x+w,top:y,bottom:y+h,centerX:x+w/2,centerY:y+h/2}; }

// ---- Cursor helper line ----
function ensureCursor(){
  if (state.cursorEl) return state.cursorEl;
  const d = document.createElement('div');
  d.id = 'constraints-cursor-line';
  d.style.position = 'fixed';
  d.style.pointerEvents = 'none';
  d.style.zIndex = 10001;
  d.style.opacity = 0.9;
  document.body.appendChild(d);
  state.cursorEl = d; return d;
}
function updateCursor(e){
  if (state.mode === 'alignV'){
    const el = ensureCursor();
    el.style.width = '1px'; el.style.height = '100vh'; el.style.background = '#49c0ff';
    el.style.left = e.clientX + 'px'; el.style.top = 0;
  } else if (state.mode === 'alignH'){
    const el = ensureCursor();
    el.style.height = '1px'; el.style.width = '100vw'; el.style.background = '#49c0ff';
    el.style.top = e.clientY + 'px'; el.style.left = 0;
  }
}
function hideCursor(){ if (state.cursorEl){ state.cursorEl.remove(); state.cursorEl=null; } }

// ---- Anchor picker ----
function showAnchorPicker(x, y, anchors, onPick){
  hideAnchorPicker();
  const box = document.createElement('div');
  box.className = 'anchor-picker';
  box.style.position = 'fixed'; box.style.left = x+'px'; box.style.top = y+'px';
  box.style.background = '#1f2536'; box.style.border = '1px solid #2e3650'; box.style.borderRadius = '8px';
  box.style.padding = '6px'; box.style.display = 'flex'; box.style.gap='6px'; box.style.zIndex=10002;
  anchors.forEach(a => {
    const b = document.createElement('button');
    b.textContent = a; b.style.cursor='pointer'; b.style.background='#2a3147'; b.style.color='#cfe8ff';
    b.style.border='1px solid #3a456a'; b.style.borderRadius='6px'; b.style.padding='6px 8px';
    b.addEventListener('click', ()=>{ onPick(a); hideAnchorPicker(); });
    box.appendChild(b);
  });
  document.body.appendChild(box); state.anchorPicker = box;
}
function hideAnchorPicker(){ if (state.anchorPicker){ state.anchorPicker.remove(); state.anchorPicker=null; } }

// ---- Indicators over selected element ----
function renderIndicators(){
  // чистим всички стари
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
  obs.observe(canvas, { subtree:true, attributes:true, attributeFilter:['class'] });
}

// ---- Mode handling ----
function setMode(mode){
  if (state.mode === mode) return; // идемпотентно
  state.mode = mode;
  if (mode === 'none'){ hideCursor(); hideAnchorPicker(); state.pending=null; document.body.style.cursor=''; }
  else { document.addEventListener('mousemove', updateCursor); document.body.style.cursor='none'; }
}
function getMode(){ return state.mode; }

function onCanvasClick(e){
  if (state.mode==='none') return;
  const axis = AXES[state.mode]; if (!axis) return;

  const widget = e.target.closest('.widget');
  if (!widget) { hideAnchorPicker(); return; }
  const px = e.clientX, py = e.clientY;
  showAnchorPicker(px+8, py+8, axis.anchors, (anchor) => {
    if (!state.pending){
      state.pending = { el: widget, anchor };
    } else {
      // създаваме констрайнт: pending → widget
      const a = state.pending, b = { el: widget, anchor };
      createConstraint(a.el, a.anchor, b.el, b.anchor);
      applyConstraintsFor(a.el.id);
      state.pending = null;
      setMode('none');
    }
  });
}

export function initConstraints(){
  document.addEventListener('click', onCanvasClick);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') setMode('none'); });
  observeSelectionChanges();
  // първи рендер ако вече има селекция
  renderIndicators();
}

// Expose глобално за рибона
window.Constraints = {
  init: initConstraints,
  setMode, getMode,
  getConstraintsForElement,
};
