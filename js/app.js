
<!-- ===================== js/app.js ===================== -->
<script type="module" id="__inline_js_do_not_edit">
import { initCanvas, createFromPalette, serialize, deserialize, alignAPI, setSelection } from './js/core/canvas.js';
import { buildPalette } from './js/core/widgets.js';
import { initInspector } from './js/core/inspector.js';

// Palette
buildPalette(document.getElementById('palette'), type => createFromPalette(type));

// Canvas & Inspector
initCanvas();
initInspector();

// Top actions
document.getElementById('btn-export').onclick = ()=>{
  const blob = new Blob([JSON.stringify(serialize(), null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='dp-configurator.json'; a.click(); URL.revokeObjectURL(a.href);
};

document.getElementById('file-import').onchange = async (e)=>{
  const f = e.target.files?.[0]; if(!f) return; try{ const data = JSON.parse(await f.text()); deserialize(data); setSelection([]);}catch{ alert('Invalid JSON'); } e.target.value='';
};

document.getElementById('btn-clear').onclick = ()=>{ if(confirm('Clear canvas?')) deserialize({version:1, items:[]}); };

document.getElementById('btn-save').onclick = ()=>{ localStorage.setItem('dp-configurator', JSON.stringify(serialize())); toast('Saved'); };

document.getElementById('btn-load').onclick = ()=>{ const raw=localStorage.getItem('dp-configurator'); if(!raw){ alert('No local data'); return; } try{ deserialize(JSON.parse(raw)); toast('Loaded'); }catch{ alert('Bad data'); } };

// Align buttons
for(const [id, fn] of Object.entries(alignAPI)){
  const el = document.getElementById(id); if(el) el.onclick = fn;
}

// Demo seed
createFromPalette('button');
createFromPalette('panel');
createFromPalette('textfield');

function toast(msg){ const t=document.createElement('div'); t.textContent=msg; Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',background:'#1c2436',border:'1px solid #2b3550',color:'#e8ecf2',padding:'10px 12px',borderRadius:'10px',zIndex:9999}); document.body.appendChild(t); setTimeout(()=>t.remove(),1400); }
</script>
