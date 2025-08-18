// js/core/constraints-engine.js
// Двигател за констрайнти: създаване, изтриване и ПРИЛАГАНЕ с реални връзки (каскадно около мръднал елемент)

const store = {
  list: new Map(),          // id -> Constraint
  byEl: new Map(),          // elId -> Set(constraintId)
};

function uid() { return 'c_' + Math.random().toString(36).slice(2, 9); }

function getXY(el){
  return {
    x: parseFloat(el.getAttribute('data-x')) || 0,
    y: parseFloat(el.getAttribute('data-y')) || 0,
  };
}
function setPos(el, x, y){
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.setAttribute('data-x', x);
  el.setAttribute('data-y', y);
}
function getRect(el){
  const {x,y} = getXY(el);
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

function addIndex(elId, cid){ if(!store.byEl.has(elId)) store.byEl.set(elId, new Set()); store.byEl.get(elId).add(cid); }
function remIndex(elId, cid){ const s=store.byEl.get(elId); if(s){ s.delete(cid); if(!s.size) store.byEl.delete(elId);} }

export function createConstraint(aEl, aAnchor, bEl, bAnchor){
  const axis = (aAnchor==='left'||aAnchor==='right'||aAnchor==='centerX' || bAnchor==='left'||bAnchor==='right'||bAnchor==='centerX') ? 'x' : 'y';
  const c = { id: uid(), axis, a: {id:aEl.id, anchor:aAnchor}, b:{id:bEl.id, anchor:bAnchor} };
  store.list.set(c.id, c);
  addIndex(c.a.id, c.id); addIndex(c.b.id, c.id);
  // начално прилагане – придвижваме A към B (B е таргетът)
  applyConstraint(c, c.b.id);
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

// ===== Прилагане на ЕДИН констрайнт относно конкретно "мръднал" край =====
function applyConstraint(c, draggedId){
  const aEl = document.getElementById(c.a.id);
  const bEl = document.getElementById(c.b.id);
  if (!aEl || !bEl) return;

  const ar = getRect(aEl); const br = getRect(bEl);
  const av = anchorValue(ar, c.a.anchor);
  const bv = anchorValue(br, c.b.anchor);

  if (draggedId === c.a.id){
    // местим A към B (B е таргет)
    if (c.axis === 'x') setPos(aEl, getXY(aEl).x + (bv - av), getXY(aEl).y);
    else                setPos(aEl, getXY(aEl).x, getXY(aEl).y + (bv - av));
  } else if (draggedId === c.b.id){
    // местим A към B пак (B е референция)
    if (c.axis === 'x') setPos(aEl, getXY(aEl).x + (bv - av), getXY(aEl).y);
    else                setPos(aEl, getXY(aEl).x, getXY(aEl).y + (bv - av));
  } else {
    // по подразбиране местим A към B
    if (c.axis === 'x') setPos(aEl, getXY(aEl).x + (bv - av), getXY(aEl).y);
    else                setPos(aEl, getXY(aEl).x, getXY(aEl).y + (bv - av));
  }
}

// Приложи всички констрайнти ОКОЛО даден елемент (с каскада по веригата)
export function applyAround(elId, maxDepth = 8){
  const visited = new Set();
  const q = [elId];
  let depth = 0;
  while (q.length && depth < maxDepth){
    const current = q.shift();
    if (visited.has(current)) { depth++; continue; }
    visited.add(current);
    const ids = Array.from(store.byEl.get(current) || []);
    for (const cid of ids){
      const c = store.list.get(cid); if (!c) continue;
      applyConstraint(c, current);
      const other = (c.a.id === current) ? c.b.id : c.a.id;
      q.push(other);
    }
    depth++;
  }
}
 
// Глобално прилагане – полезно след import()
export function applyConstraints(){
  let changed; let iterations = 0;
  do {
    changed = false; iterations++;
    for (const c of store.list.values()){
      const aEl = document.getElementById(c.a.id);
      const bEl = document.getElementById(c.b.id);
      if (!aEl || !bEl) continue;
      const ar = getRect(aEl); const br = getRect(bEl);
      const av = anchorValue(ar, c.a.anchor);
      const bv = anchorValue(br, c.b.anchor);
      if (c.axis === 'x'){
        const dx = av - bv; if (Math.abs(dx) > 0.5){ setPos(aEl, getXY(aEl).x - dx, getXY(aEl).y); changed = true; }
      } else {
        const dy = av - bv; if (Math.abs(dy) > 0.5){ setPos(aEl, getXY(aEl).x, getXY(aEl).y - dy); changed = true; }
      }
    }
  } while (changed && iterations < 10);
}

// Визуално: анкерите, които участват в връзки за даден елемент
export function getUsedAnchors(elId){
  const out = new Map(); // anchor -> [{id, otherElId, otherAnchor}]
  for (const c of getConstraintsForElement(elId)){
    const side = (c.a.id === elId) ? c.a : c.b;
    const other = (c.a.id === elId) ? c.b : c.a;
    if (!out.has(side.anchor)) out.set(side.anchor, []);
    out.get(side.anchor).push({ id: c.id, otherElId: other.id, otherAnchor: other.anchor });
  }
  return out;
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

// === Helper: дали два елемента са свързани чрез констрайнти (директно или косвено) ===
export function areConnected(elIdA, elIdB, maxDepth=20){
  if (elIdA===elIdB) return true;
  const visited=new Set();
  const q=[elIdA];
  while(q.length && maxDepth-->0){
    const cur=q.shift();
    if(cur===elIdB) return true;
    if(visited.has(cur)) continue;
    visited.add(cur);
    const ids=Array.from(store.byEl.get(cur)||[]);
    for(const cid of ids){
      const c=store.list.get(cid); if(!c) continue;
      const other=(c.a.id===cur)?c.b.id:c.a.id;
      if(!visited.has(other)) q.push(other);
    }
  }
  return false;
}
