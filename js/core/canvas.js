<!-- ===================== js/core/canvas.js ===================== -->
<script type="module" id="__inline_js_canvas">
import { registry } from './js/core/widgets.js';
import { mountInspectorForSelection, clearInspector } from './js/core/inspector.js';

const GRID=10, SNAP_TOL=6;
const canvas = () => document.getElementById('canvas');
const $ = (s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

export const state = { selection: new Set(), dragStart: new Map() };

export function initCanvas(){
  // Marquee selection
  const marquee = document.getElementById('marquee');
  let start=null;
  canvas().addEventListener('pointerdown', e=>{ if(e.target!==canvas()) return; start={x:e.offsetX,y:e.offsetY}; Object.assign(marquee.style,{left:start.x+'px',top:start.y+'px',width:'0px',height:'0px',display:'block'}); clearSelection(); });
  canvas().addEventListener('pointermove', e=>{ if(!start) return; const x=e.offsetX,y=e.offsetY; const l=Math.min(x,start.x), t=Math.min(y,start.y), w=Math.abs(x-start.x), h=Math.abs(y-start.y); Object.assign(marquee.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px'}); });
  window.addEventListener('pointerup', ()=>{ if(!start) return; const mr=marquee.getBoundingClientRect(), cr=canvas().getBoundingClientRect(); const ml=mr.left-cr.left, mt=mr.top-cr.top, mrgt=ml+mr.width, mb=mt+mr.height; const ids=$$('.widget',canvas()).filter(w=>{ const r=getRect(w); return !(r.right<ml||r.left>mrgt||r.bottom<mt||r.top>mb); }).map(w=>w.dataset.id); setSelection(ids); marquee.style.display='none'; start=null; });
}

export function createFromPalette(type,x=60+Math.random()*80,y=60+Math.random()*80){
  const def = registry[type]; if(!def) throw new Error('Unknown type');
  const el = def.create(); el.dataset.id = 'w_'+Math.random().toString(36).slice(2,9); el.dataset.type=type; el.style.left=Math.round(x/GRID)*GRID+'px'; el.style.top=Math.round(y/GRID)*GRID+'px'; el.style.width=(def.defaults.w||120)+'px'; el.style.height=(def.defaults.h||40)+'px';
  canvas().appendChild(el);
  def.applyProps(el, def.defaults);
  wireInteract(el);
  setSelection([el.dataset.id]);
  return el;
}

function wireInteract(el){
  interact(el).draggable({
    listeners: {
      start(){ state.dragStart.clear(); const ids = state.selection.has(el.dataset.id)?[...state.selection]:[el.dataset.id]; for(const id of ids){ const w=$(`.widget[data-id="${id}"]`,canvas()); state.dragStart.set(id,{x:parseInt(w.style.left||'0',10), y:parseInt(w.style.top||'0',10)}); } hideGuides(); },
      move(evt){ const ids=state.selection.has(el.dataset.id)?[...state.selection]:[el.dataset.id]; const start=state.dragStart.get(el.dataset.id); let nx=Math.round((start.x+evt.dx)/GRID)*GRID; let ny=Math.round((start.y+evt.dy)/GRID)*GRID; const snapped=smartGuides(el,nx,ny); nx=snapped.x; ny=snapped.y; for(const id of ids){ const w=$(`.widget[data-id="${id}"]`,canvas()); const s=state.dragStart.get(id); w.style.left=(s.x+(nx-start.x))+'px'; w.style.top=(s.y+(ny-start.y))+'px'; } if(state.selection.size===1) mountInspectorForSelection(); },
      end(){ hideGuides(); }
    }, inertia:false
  });

  interact(el).resizable({ edges:{left:true,right:true,top:true,bottom:true}, inertia:false, listeners:{ move(evt){ const t=evt.target; let w=Math.max(40,Math.round(evt.rect.width/GRID)*GRID), h=Math.max(30,Math.round(evt.rect.height/GRID)*GRID); t.style.width=w+'px'; t.style.height=h+'px'; const nx=Math.round((parseInt(t.style.left||'0',10)+evt.deltaRect.left)/GRID)*GRID; const ny=Math.round((parseInt(t.style.top||'0',10)+evt.deltaRect.top )/GRID)*GRID; t.style.left=nx+'px'; t.style.top=ny+'px'; mountInspectorForSelection(); } } });

  el.addEventListener('pointerdown', e=>{ e.stopPropagation(); if(e.shiftKey){ toggleInSelection(el.dataset.id);} else setSelection([el.dataset.id]); });
}

function toggleInSelection(id){ if(state.selection.has(id)) state.selection.delete(id); else state.selection.add(id); reflectSelection(); }
function clearSelection(){ state.selection.clear(); reflectSelection(); }
export function setSelection(ids){ state.selection = new Set(ids||[]); reflectSelection(); }
function reflectSelection(){ $$('.widget',canvas()).forEach(w=>w.classList.toggle('selected',state.selection.has(w.dataset.id))); if(state.selection.size===1) mountInspectorForSelection(); else clearInspector(); }

// Guides
function hideGuides(){ $('#guide-v').style.display='none'; $('#guide-h').style.display='none'; }
function smartGuides(el,nx,ny){ const others=$$('.widget',canvas()).filter(w=>w!==el); const r=rectAt(el,nx,ny); let sx=nx, sy=ny, showV=false, showH=false, vPos=0, hPos=0; for(const o of others){ const or=getRect(o); const xs=[or.left,or.centerX,or.right]; for(const x of xs){ if(Math.abs(r.left-x)<=SNAP_TOL){ sx+=x-r.left; vPos=x; showV=true; } if(Math.abs(r.centerX-x)<=SNAP_TOL){ sx+=x-r.centerX; vPos=x; showV=true; } if(Math.abs(r.right-x)<=SNAP_TOL){ sx+=x-r.right; vPos=x; showV=true; } } const ys=[or.top,or.centerY,or.bottom]; for(const y of ys){ if(Math.abs(r.top-y)<=SNAP_TOL){ sy+=y-r.top; hPos=y; showH=true; } if(Math.abs(r.centerY-y)<=SNAP_TOL){ sy+=y-r.centerY; hPos=y; showH=true; } if(Math.abs(r.bottom-y)<=SNAP_TOL){ sy+=y-r.bottom; hPos=y; showH=true; } } }
  const gv=$('#guide-v'), gh=$('#guide-h'); if(showV){ gv.style.left=vPos+'px'; gv.style.display='block'; } else gv.style.display='none'; if(showH){ gh.style.top=hPos+'px'; gh.style.display='block'; } else gh.style.display='none'; return {x:sx,y:sy}; }

function rectAt(el,left,top){ const w=el.offsetWidth, h=el.offsetHeight; return {left,top,right:left+w,bottom:top+h,centerX:left+w/2,centerY:top+h/2,w,h}; }
function getRect(el){ return rectAt(el, parseInt(el.style.left||'0',10), parseInt(el.style.top||'0',10)); }

// Serialize
export function serialize(){ const items=$$('.widget',canvas()).map(el=>{ const t=el.dataset.type, x=parseInt(el.style.left||'0',10), y=parseInt(el.style.top||'0',10), w=el.offsetWidth, h=el.offsetHeight; const def=registry[t]; const props = extractProps(el,t); return {id:el.dataset.id,type:t,x,y,w,h,...props}; }); return {version:1, items}; }
export function deserialize(data){ canvas().innerHTML='<div class="canvas-hint">Пусни елементи тук</div><div id="guide-v" class="guide v" style="display:none"></div><div id="guide-h" class="guide h" style="display:none"></div><div id="marquee" class="marquee" style="display:none"></div>'; for(const it of (data.items||[])){ const el = createFromPalette(it.type, it.x, it.y); el.dataset.id = it.id; el.style.width=it.w+'px'; el.style.height=it.h+'px'; applyProps(el,it.type,it); } clearSelection(); }

function extractProps(el,type){ const def=registry[type]; const d=def.defaults; if(type==='button'){ const b=el.querySelector('button'); return { text:b.textContent, fontSize:parseInt(getComputedStyle(b).fontSize,10), variant:(b.className.replace('variant-','')||'primary') } }
  if(type==='label'){ return { text:el.textContent, fontSize:parseInt(getComputedStyle(el).fontSize,10) } }
  if(type==='toggle'){ const t=el.querySelector('.toggle'); return { text:t.textContent, fontSize:parseInt(getComputedStyle(t).fontSize,10) } }
  if(type==='panel'){ const header=!!el.querySelector('.panel-header'); return { radius:parseInt(el.style.borderRadius||d.radius,10)||d.radius, borderWidth:parseInt(el.style.borderWidth||d.borderWidth,10)||d.borderWidth, borderColor:el.style.borderColor||d.borderColor, bg:el.style.background||d.bg, header, headerText: header?(el.querySelector('.panel-header')?.textContent||d.headerText):d.headerText, headerColor: header?(el.querySelector('.panel-header')?.style.background||d.headerColor):d.headerColor } }
  if(type==='textfield'){ const inp=el.querySelector('input'); return { label: el.querySelector('label')?.textContent||'', placeholder: inp.placeholder||'', fontSize: parseInt(getComputedStyle(inp).fontSize,10) } }
  if(type==='checkbox'){ return { label: el.querySelector('.lbl').textContent, checked: el.querySelector('.box').style.background!=='rgb(15, 20, 30)' } }
  return {};
}
function applyProps(el,type,props){ registry[type].applyProps(el, props); }

// Align/Distribute API used by buttons
function align(fn){ const sel=[...state.selection].map(id=>$(`.widget[data-id="${id}"]`,canvas())); if(sel.length<2) return; const rects=sel.map(getRect); fn(sel,rects); }
export const alignAPI = {
  'align-left': ()=>align((sel,rects)=>{ const L=Math.min(...rects.map(r=>r.left)); sel.forEach(w=>w.style.left=L+'px'); }),
  'align-right': ()=>align((sel,rects)=>{ const R=Math.max(...rects.map(r=>r.right)); sel.forEach((w,i)=>w.style.left=(R-rects[i].w)+'px'); }),
  'align-top': ()=>align((sel,rects)=>{ const T=Math.min(...rects.map(r=>r.top)); sel.forEach(w=>w.style.top=T+'px'); }),
  'align-bottom': ()=>align((sel,rects)=>{ const B=Math.max(...rects.map(r=>r.bottom)); sel.forEach((w,i)=>w.style.top=(B-rects[i].h)+'px'); }),
  'align-vcenter': ()=>align((sel,rects)=>{ const C=Math.round((Math.min(...rects.map(r=>r.top))+Math.max(...rects.map(r=>r.bottom)))/2); sel.forEach((w,i)=>w.style.top=(C-Math.round(rects[i].h/2))+'px'); }),
  'align-hcenter': ()=>align((sel,rects)=>{ const C=Math.round((Math.min(...rects.map(r=>r.left))+Math.max(...rects.map(r=>r.right)))/2); sel.forEach((w,i)=>w.style.left=(C-Math.round(rects[i].w/2))+'px'); }),
  'distribute-h': ()=>align((sel,rects)=>{ const sorted=rects.map((r,i)=>({r,i})).sort((a,b)=>a.r.left-b.r.left); const L=sorted[0].r.left, R=sorted.at(-1).r.right; const total=sorted.reduce((s,o)=>s+o.r.w,0); const gap=(R-L-total)/(sorted.length-1); let x=L; sorted.forEach(({r,i})=>{ sel[i].style.left=x+'px'; x+=r.w+gap; }); }),
  'distribute-v': ()=>align((sel,rects)=>{ const sorted=rects.map((r,i)=>({r,i})).sort((a,b)=>a.r.top-b.r.top); const T=sorted[0].r.top, B=sorted.at(-1).r.bottom; const total=sorted.reduce((s,o)=>s+o.r.h,0); const gap=(B-T-total)/(sorted.length-1); let y=T; sorted.forEach(({r,i})=>{ sel[i].style.top=y+'px'; y+=r.h+gap; }); })
};

export { getRect };
</script>
