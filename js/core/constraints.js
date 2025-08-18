// js/core/constraints.js — v2.3: фикc за изчезващи точки (филтър в MutationObserver)
// пасивни точки при селекция, блок на глобалния contextmenu върху хендъли,
// click→click: ПЪРВИЯТ се мести към ВТОРИЯ (A→B)
import { createConstraint, deleteConstraint, getConstraintsForElement, getUsedAnchors, applyAround } from './constraints-engine.js';

const state = {
  mode: 'none',            // 'none' | 'alignV' | 'alignH'
  firstPick: null,         // { el, anchor }
  cursorLine: null,
  hoverEl: null,
};

const OK_X = ['left','centerX','right'];
const OK_Y = ['top','centerY','bottom'];

// ---- Utils ----
function getXY(el){ return { x: parseFloat(el.getAttribute('data-x'))||0, y: parseFloat(el.getAttribute('data-y'))||0 }; }
function getRect(el){ const {x,y}=getXY(el); const w=el.getBoundingClientRect().width; const h=el.getBoundingClientRect().height; return { left:x,right:x+w,top:y,bottom:y+h,centerX:x+w/2,centerY:y+h/2,w,h }; }

// ---- Cursor helper line ----
function ensureCursorLine(){ if (state.cursorLine) return state.cursorLine; const d=document.createElement('div'); d.id='constraints-cursor-line'; d.style.position='fixed'; d.style.pointerEvents='none'; d.style.zIndex=10001; d.style.opacity=0.9; document.body.appendChild(d); state.cursorLine=d; return d; }
function updateCursorLine(e){ if(state.mode==='alignV'){const el=ensureCursorLine(); el.style.width='1px'; el.style.height='100vh'; el.style.background='#49c0ff'; el.style.left=e.clientX+'px'; el.style.top=0;} else if(state.mode==='alignH'){const el=ensureCursorLine(); el.style.height='1px'; el.style.width='100vw'; el.style.background='#49c0ff'; el.style.top=e.clientY+'px'; el.style.left=0;} else {hideCursorLine();} }
function hideCursorLine(){ if(state.cursorLine){ state.cursorLine.remove(); state.cursorLine=null; } }

// ---- Styles + hit area ----
function injectHandleStyles(){ if(document.getElementById('constraint-handle-style')) return; const s=document.createElement('style'); s.id='constraint-handle-style'; s.textContent=`
  body.constraints-mode .widget{ cursor: crosshair !important; }
  body.constraints-mode .widget *, body.constraints-mode .widget::before, body.constraints-mode .widget::after{ pointer-events:none; }
  body.constraints-mode .widget .c-handle{ pointer-events:auto !important; }
  .c-handle{position:absolute; z-index:999; background:#49c0ff; opacity:.65; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.25); width:16px; height:16px; transform: translate(-50%, -50%);}  
  .c-handle.used{ background:#ffd257; opacity:1; }
  .c-handle.passive{ pointer-events:none; opacity:.85; background:#ffd257; }
  .c-handle.hover{ opacity:1; transform: translate(-50%, -50%) scale(1.15); }
  .c-handle.pick{ outline: 2px solid #ffe08a; }
  .c-handle.context{ outline: 2px solid #7ad3ff; }
  .c-ctx{ position:fixed; z-index:10002; background:#1f2536; border:1px solid #2e3650; color:#cfe8ff; border-radius:8px; overflow:hidden; }
  .c-ctx button{ display:block; width:100%; text-align:left; padding:8px 10px; background:#232a3a; border:none; color:#cfe8ff; }
  .c-ctx button:hover{ background:#2b3450; }
`; document.head.appendChild(s);} 

function anchorsForMode(mode){ if(mode==='alignV') return OK_X; if(mode==='alignH') return OK_Y; return [...OK_X, ...OK_Y]; }
function handlePosMap(r){ return { left:{x:r.left,y:r.centerY}, right:{x:r.right,y:r.centerY}, top:{x:r.centerX,y:r.top}, bottom:{x:r.centerX,y:r.bottom}, centerX:{x:r.centerX,y:r.centerY}, centerY:{x:r.centerX,y:r.centerY} }; }

function addHandlesTo(el){
  if (el.querySelector('.c-handle')) return;
  const r = getRect(el); const anchors = anchorsForMode(state.mode); const used = getUsedAnchors(el.id);
  const map = handlePosMap(r);
  anchors.forEach(name=>{
    const d = map[name]; if(!d) return; const h=document.createElement('div'); h.className='c-handle'; h.dataset.anchor=name;
    h.style.left=(d.x - r.left)+'px'; h.style.top=(d.y - r.top)+'px'; h.title=name;
    if (used.has(name)) h.classList.add('used');
    h.addEventListener('mouseenter', ()=>{ h.classList.add('hover'); if(used.has(name)) highlightCounterpart(el.id, name, true); });
    h.addEventListener('mouseleave', ()=>{ h.classList.remove('hover'); if(used.has(name)) highlightCounterpart(el.id, name, false); });
    h.addEventListener('contextmenu', (e)=>{ e.preventDefault(); e.stopPropagation(); if (state.mode !== 'none') openCtxMenu(e.clientX,e.clientY, el, name, h); });
    h.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); e.preventDefault(); pickAnchor(el, name, h); });
    el.appendChild(h);
  });
}

function removeHandlesFrom(el){ if(!el) return; el.querySelectorAll('.c-handle').forEach(n=>n.remove()); }
function removeAllHandles(){ document.querySelectorAll('.c-handle').forEach(n=>n.remove()); closeCtxMenu(); }

function setHoverEl(el){
  if (state.hoverEl === el) return; const keep = state.firstPick?.el;
  document.querySelectorAll('.widget').forEach(w=>{ if (w!==keep && w!==el) removeHandlesFrom(w); });
  state.hoverEl = el; if (el && el !== keep) addHandlesTo(el);
}

// ---- Passive used-handles (outside of tool mode) ----
function showUsedHandles(el){
  removeHandlesFrom(el);
  const used = getUsedAnchors(el.id);
  if (!used.size) return;
  const r = getRect(el); const map = handlePosMap(r);
  for (const [anchor] of used){
    const d = map[anchor]; if (!d) continue;
    const h = document.createElement('div');
    h.className = 'c-handle used passive';
    h.dataset.anchor = anchor;
    h.style.left = (d.x - r.left) + 'px';
    h.style.top  = (d.y - r.top) + 'px';
    el.appendChild(h);
  }
}

// ---- Counterpart highlight ----
function highlightCounterpart(elId, anchor, on){
  const list = getUsedAnchors(elId).get(anchor) || [];
  for (const item of list){
    const other = document.getElementById(item.otherElId); if (!other) continue;
    if (!other.querySelector('.c-handle')) addHandlesTo(other);
    other.querySelectorAll(`.c-handle[data-anchor="${item.otherAnchor}"]`).forEach(h=>{ h.classList.toggle('context', !!on); });
  }
}

// ---- Click→Click ----
function pickAnchor(el, anchor, handleEl){
  if (state.mode === 'none') return; // извън режим: само визуализация
  document.querySelectorAll('.c-handle.pick').forEach(n=>n.classList.remove('pick'));
  handleEl?.classList.add('pick');
  if (!state.firstPick){ state.firstPick = { el, anchor }; return; }
  const a = state.firstPick; const b = { el, anchor };
  if (state.mode==='alignV' && !(OK_X.includes(a.anchor) && OK_X.includes(b.anchor))) { resetPick(); return; }
  if (state.mode==='alignH' && !(OK_Y.includes(a.anchor) && OK_Y.includes(b.anchor))) { resetPick(); return; }
  // Първият се мести към втория → A към B
  createConstraint(a.el, a.anchor, b.el, b.anchor);
  applyAround(b.el.id);
  resetPick();
}

function resetPick(){ state.firstPick = null; document.querySelectorAll('.c-handle.pick').forEach(n=>n.classList.remove('pick')); closeCtxMenu(); }

// ---- Selection observer: показваме пасивни точки извън режим ----
function observeSelectionChanges(){
  const canvas = document.getElementById('canvas'); if (!canvas) return;
  const obs = new MutationObserver((mutations) => {
    // Реагирай само ако САМИЯТ widget е сменил класовете си (селект/деселект)
    const widgetClassChanged = mutations.some(m =>
      m.type === 'attributes' && m.attributeName === 'class' &&
      m.target instanceof Element && m.target.classList.contains('widget')
    );
    if (!widgetClassChanged) return; // игнорирай hover по .c-handle и други вътрешни промени

    // чистим хендъли от всички widgets
    document.querySelectorAll('.widget').forEach(w => removeHandlesFrom(w));

    if (state.mode !== 'none') return; // в активен режим UI-то за хендъли се управлява другаде
    const sel = document.querySelector('.widget.selected');
    if (sel) { injectHandleStyles(); showUsedHandles(sel); }
  });
  obs.observe(canvas, { subtree:true, attributes:true, attributeFilter:['class'] });
}

// ---- Context menu (Edit/Delete) ----
let ctxEl = null;
function openCtxMenu(x,y, el, anchor, handleEl){ closeCtxMenu(); const box=document.createElement('div'); box.className='c-ctx'; box.style.left=x+'px'; box.style.top=y+'px';
  const usedList = getUsedAnchors(el.id).get(anchor)||[];
  usedList.forEach(item=>{
    const btnE=document.createElement('button'); btnE.textContent=`Edit (${anchor}↔${item.otherAnchor})`; btnE.onclick=()=>{ closeCtxMenu(); deleteConstraint(item.id); state.firstPick = { el, anchor }; handleEl.classList.add('pick'); }; box.appendChild(btnE);
    const btnD=document.createElement('button'); btnD.textContent=`Delete (${anchor}↔${item.otherAnchor})`; btnD.onclick=()=>{ deleteConstraint(item.id); closeCtxMenu(); setHoverEl(state.hoverEl); }; box.appendChild(btnD);
  });
  if (!usedList.length){ const i=document.createElement('button'); i.textContent='No constraint here'; i.disabled=true; box.appendChild(i); }
  document.body.appendChild(box); ctxEl=box;
}
function closeCtxMenu(){ if(ctxEl){ ctxEl.remove(); ctxEl=null; } }

// ---- Mode handling ----
export function setMode(mode){
  if (state.mode === mode) return;
  hideCursorLine(); document.removeEventListener('mousemove', updateCursorLine); document.removeEventListener('mousemove', handleHoverMove);
  state.mode = mode; document.body.classList.toggle('constraints-mode', mode !== 'none');
  if (mode === 'none'){
    resetPick(); removeAllHandles();
    // при излизане показваме пасивните точки на селектирания елемент (ако има)
    const sel = document.querySelector('.widget.selected');
    if (sel) { injectHandleStyles(); showUsedHandles(sel); }
  } else {
    injectHandleStyles(); document.addEventListener('mousemove', updateCursorLine); document.addEventListener('mousemove', handleHoverMove, { passive:true });
  }
  window.dispatchEvent(new CustomEvent('constraints:mode', { detail: { mode } }));
}
export function getMode(){ return state.mode; }

function handleHoverMove(e){ const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.widget'); if (!el) { setHoverEl(null); return; } setHoverEl(el); }

export function initConstraints(){ document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') { setMode('none'); } }); observeSelectionChanges(); }

// Expose глобално
window.Constraints = { init: initConstraints, setMode, getMode, getConstraintsForElement, applyAround };
