// js/core/constraints-engine.js
// Минимален двигател за констрайнти: създаване, изтриване и прилагане с реални връзки.

const store = {
  list: new Map(),          // id -> Constraint
  byEl: new Map(),          // elId -> Set(constraintId)
};

function uid() { return 'c_' + Math.random().toString(36).slice(2, 9); }

function getRect(el){
  const x = parseFloat(el.getAttribute('data-x')) || 0;
  const y = parseFloat(el.getAttribute('data-y')) || 0;
  const w = el.getBoundingClientRect().width;
  const h = el.getBoundingClientRect().height;
  return { left:x, right:x+w, top:y, bottom:y+h, centerX:x+w/2, centerY:y+h/2 };
}

function anchorValue(rect, anchor){
  switch(anchor){
    case 'left': return rect.left; case 'right': return rect.right; case 'centerX': return rect.centerX;
    case 'top': return rect.top; case 'bottom': return rect.bottom; case 'centerY': return rect.centerY;
  }
}

function setPos(el, x, y){
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.setAttribute('data-x', x);
  el.setAttribute('data-y', y);
}

function addIndex(elId, cid){ if(!store.byEl.has(elId)) store.byEl.set(elId, new Set()); store.byEl.get(elId).add(cid); }
function remIndex(elId, cid){ const s=store.byEl.get(elId); if(s){ s.delete(cid); if(!s.size) store.byEl.delete(elId);} }

export function createConstraint(aEl, aAnchor, bEl, bAnchor){
  const axis = (aAnchor==='left'||aAnchor==='right'||aAnchor==='centerX' || bAnchor==='left'||bAnchor==='right'||bAnchor==='centerX') ? 'x' : 'y';
  const c = { id: uid(), axis, a: {id:aEl.id, anchor:aAnchor}, b:{id:bEl.id, anchor:bAnchor} };
  store.list.set(c.id, c);
  addIndex(c.a.id, c.id); addIndex(c.b.id, c.id);
  applyConstraints(); // моментално прилагане
  return c.id;
}

export function deleteConstraint(id){
  const c = store.list.get(id); if(!c) return;
  store.list.delete(id);
  remIndex(c.a.id, id); remIndex(c.b.id, id);
}

export function getConstraintsForElement(elId){
  const ids = Array.from(store.byEl.get(elId) || []);
  return ids.map(id => store.list.get(id)).filter(Boolean);
}

export function applyConstraints(){
  // итеративно прилагане докато няма промяна (за стабилност)
  let changed;
  let iterations = 0;
  do {
    changed = false;
    iterations++;
    for (const c of store.list.values()){
      const aEl = document.getElementById(c.a.id);
      const bEl = document.getElementById(c.b.id);
      if (!aEl || !bEl) continue;

      const ar = getRect(aEl); const br = getRect(bEl);
      const av = anchorValue(ar, c.a.anchor);
      const bv = anchorValue(br, c.b.anchor);

      if (c.axis === 'x'){
        const dx = av - bv;
        if (Math.abs(dx) > 0.5){
          const nx = (parseFloat(bEl.getAttribute('data-x'))||0) + dx;
          setPos(bEl, nx, parseFloat(bEl.getAttribute('data-y'))||0);
          changed = true;
        }
      } else {
        const dy = av - bv;
        if (Math.abs(dy) > 0.5){
          const ny = (parseFloat(bEl.getAttribute('data-y'))||0) + dy;
          setPos(bEl, parseFloat(bEl.getAttribute('data-x'))||0, ny);
          changed = true;
        }
      }
    }
  } while (changed && iterations < 10);
}

export function serializeConstraints(){
  return JSON.stringify({ list: Array.from(store.list.values()) });
}

export function importConstraints(json){
  try {
    const data = JSON.parse(json);
    store.list.clear(); store.byEl.clear();
    for (const c of data.list || []){
      store.list.set(c.id, c);
      addIndex(c.a.id, c.id); addIndex(c.b.id, c.id);
    }
    applyConstraints();
  } catch(e){ console.warn('[constraints-engine] import error', e); }
}
