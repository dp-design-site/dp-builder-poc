<!-- ===================== js/core/inspector.js ===================== -->
<script type="module" id="__inline_js_inspector">
import { registry } from './js/core/widgets.js';
import { state } from './js/core/canvas.js';

const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

export function initInspector(){ renderEmpty(); }
export function clearInspector(){ renderEmpty(); }
export function mountInspectorForSelection(){ if(state.selection.size!==1){ renderEmpty(); return; } const id=[...state.selection][0]; const el=document.querySelector(`.widget[data-id="${id}"]`); renderFor(el); }

function renderEmpty(){ const form = document.getElementById('inspector'); form.innerHTML = `<div class="section"><h3>Selection</h3><div class="rows"><div>Няма избран елемент</div></div></div>`; }

function renderFor(el){ const type=el.dataset.type; const spec=registry[type]; const form=document.getElementById('inspector');
  const base = extractCommon(el);
  const propVals = extractByType(el,type);

  let html = '';
  // Common section
  html += `<div class="section"><h3>Common</h3><div class="rows">
    <div class="row"><div>ID</div><input type="text" value="${el.dataset.id}" readonly /></div>
    <div class="row"><div>Тип</div><input type="text" value="${type}" readonly /></div>
    <div class="row"><div>X</div><input id="c_x" type="number" value="${base.x}" /></div>
    <div class="row"><div>Y</div><input id="c_y" type="number" value="${base.y}" /></div>
    <div class="row"><div>Ширина</div><input id="c_w" type="number" value="${base.w}" /></div>
    <div class="row"><div>Височина</div><input id="c_h" type="number" value="${base.h}" /></div>
  </div></div>`;

  // Type-specific sections
  for(const grp of (spec.inspector?.groups||[])){
    html += `<div class="section"><h3>${grp.title}</h3><div class="rows">`;
    for(const [key, ctrl] of grp.rows){
      if(ctrl.when && !ctrl.when(propVals)) continue;
      html += `<div class="row"><div>${key}</div>${renderControl(key, ctrl, propVals[key])}</div>`;
    }
    html += `</div></div>`;
  }

  // Danger area
  html += `<div class="section"><h3>Danger</h3><div class="rows"><button id="delete" class="btn danger" type="button">Изтрий елемента</button></div></div>`;

  form.innerHTML = html;

  // Wire common inputs
  $('#c_x').onchange = e=>{ el.style.left = snap(+e.target.value)+'px'; };
  $('#c_y').onchange = e=>{ el.style.top  = snap(+e.target.value)+'px'; };
  $('#c_w').onchange = e=>{ el.style.width  = Math.max(40, snap(+e.target.value))+'px'; };
  $('#c_h').onchange = e=>{ el.style.height = Math.max(30, snap(+e.target.value))+'px'; };
  $('#delete').onclick = ()=>{ el.remove(); renderEmpty(); };

  // Wire type-specific
  for(const grp of (spec.inspector?.groups||[])){
    for(const [key, ctrl] of grp.rows){
      if(ctrl.when && !ctrl.when(propVals)) continue;
      const inp = document.getElementById('p_'+key);
      if(!inp) continue;
      inp.oninput = inp.onchange = ()=> applyChange(el, type, key, ctrl);
    }
  }
}

function snap(v){ return Math.round(v/10)*10 }

function renderControl(key, ctrl, val){
  const id = 'p_'+key;
  if(ctrl.type==='text') return `<input id="${id}" type="text" value="${escapeHtml(val||'')}" />`;
  if(ctrl.type==='number') return `<input id="${id}" type="number" value="${val||0}" min="${ctrl.min??''}" max="${ctrl.max??''}" />`;
  if(ctrl.type==='select') return `<select id="${id}">${(ctrl.options||[]).map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('')}</select>`;
  if(ctrl.type==='checkbox') return `<select id="${id}"><option ${val?'selected':''} value="true">Да</option><option ${!val?'selected':''} value="false">Не</option></select>`;
  if(ctrl.type==='color') return `<div class="swatch"><input id="${id}" type="color" value="${val||'#000000'}" /><input id="${id}_txt" type="text" value="${val||'#000000'}" /></div>`;
  return `<input id="${id}" type="text" value="${escapeHtml(val||'')}" />`;
}

function applyChange(el,type,key,ctrl){
  let value;
  if(ctrl.type==='color'){
    const c = document.getElementById('p_'+key); const t=document.getElementById('p_'+key+'_txt'); value = c.value; t.value=value;
  } else if(ctrl.type==='checkbox'){
    const v=document.getElementById('p_'+key).value; value = v==='true';
  } else {
    value = document.getElementById('p_'+key).value;
    if(ctrl.type==='number') value = +value;
  }
  // Merge and apply
  const current = extractByType(el,type); current[key]=value; registry[type].applyProps(el,current);
}

function extractCommon(el){ return { x:+el.style.left.replace('px','')||0, y:+el.style.top.replace('px','')||0, w:el.offsetWidth, h:el.offsetHeight } }
function extractByType(el,type){
  if(type==='button'){ const b=el.querySelector('button'); const variant=(b.className.replace('variant-','')||'primary'); return { text:b.textContent, fontSize:parseInt(getComputedStyle(b).fontSize,10), variant } }
  if(type==='label'){ return { text:el.textContent, fontSize:parseInt(getComputedStyle(el).fontSize,10) } }
  if(type==='toggle'){ const t=el.querySelector('.toggle'); return { text:t.textContent, fontSize:parseInt(getComputedStyle(t).fontSize,10) } }
  if(type==='panel'){ const header=!!el.querySelector('.panel-header'); return { radius:parseInt(el.style.borderRadius||12,10), borderWidth:parseInt(el.style.borderWidth||1,10), borderColor:el.style.borderColor||'#2a2f44', bg:el.style.background||'#121722', header, headerText: header?(el.querySelector('.panel-header')?.textContent||'Panel'):'Panel', headerColor: header?(el.querySelector('.panel-header')?.style.background||'#1b2232'):'#1b2232' } }
  if(type==='textfield'){ const inp=el.querySelector('input'); return { label: el.querySelector('label')?.textContent||'', placeholder: inp.placeholder||'', fontSize: parseInt(getComputedStyle(inp).fontSize,10) } }
  if(type==='checkbox'){ return { label: el.querySelector('.lbl').textContent, checked: el.querySelector('.box').style.background !== 'rgb(15, 20, 30)' } }
  return {};
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
</script>

