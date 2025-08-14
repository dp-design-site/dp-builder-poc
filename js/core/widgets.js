// core/widgets.js (registry-based)
// Exports a registry of widgets used by canvas.js & inspector.js
// Each widget defines: label, defaults, create() DOM, applyProps(el, props), inspector schema

export const registry = {
  button: {
    label: 'Button',
    defaults: { w:100, h:40, text:'Button', fontSize:14, variant:'primary' },
    create(){
      const wrap = document.createElement('div'); wrap.className = 'widget button';
      const b = document.createElement('button'); b.className='variant-primary'; b.textContent='Button'; wrap.appendChild(b);
      return wrap;
    },
    applyProps(el, props){ const b=el.querySelector('button'); b.textContent=props.text; b.style.fontSize=props.fontSize+'px'; b.className='variant-'+(props.variant||'primary'); },
    inspector: {
      groups: [
        { title:'Content', rows:[ ['text',{type:'text'}], ['fontSize',{type:'number',min:8,max:64}] ] },
        { title:'Style', rows:[ ['variant',{type:'select',options:['primary','secondary','ghost','danger']}] ] }
      ]
    }
  },
  label: {
    label: 'Label',
    defaults: { w:100, h:30, text:'Label', fontSize:14 },
    create(){ const el=document.createElement('div'); el.className='widget label'; el.textContent='Label'; return el; },
    applyProps(el, p){ el.textContent=p.text; el.style.fontSize=p.fontSize+'px'; },
    inspector: { groups:[ {title:'Text', rows:[ ['text',{type:'text'}], ['fontSize',{type:'number',min:8,max:64}] ] } ] }
  },
  toggle: {
    label: 'Toggle',
    defaults: { w:110, h:36, text:'Toggle', fontSize:14 },
    create(){ const el=document.createElement('div'); el.className='widget toggle-wrap'; el.innerHTML='<div class="toggle">Toggle</div>'; return el; },
    applyProps(el,p){ const t=el.querySelector('.toggle'); t.textContent=p.text; t.style.fontSize=p.fontSize+'px'; },
    inspector: { groups:[ {title:'Toggle', rows:[ ['text',{type:'text'}], ['fontSize',{type:'number',min:8,max:64}] ] } ] }
  },
  panel: {
    label: 'Panel',
    defaults: { w:260, h:160, radius:12, borderWidth:1, borderColor:'#2a2f44', bg:'#121722', header:false, headerText:'Panel', headerColor:'#1b2232' },
    create(){ const el=document.createElement('div'); el.className='widget panel'; return el; },
    applyProps(el,p){ el.style.borderRadius=p.radius+'px'; el.style.borderWidth=p.borderWidth+'px'; el.style.borderColor=p.borderColor; el.style.background=p.bg; if(p.header){ if(!el.querySelector('.panel-header')){ const hd=document.createElement('div'); hd.className='panel-header'; hd.style.cssText='position:absolute;left:0;top:0;right:0;height:32px;padding:6px 10px;border-bottom:1px solid #2a2f44;'; el.appendChild(hd);} const hd=el.querySelector('.panel-header'); hd.textContent=p.headerText; hd.style.background=p.headerColor; } else { el.querySelector('.panel-header')?.remove(); } },
    inspector: { groups:[
      { title:'Border', rows:[ ['borderWidth',{type:'number',min:0,max:12}], ['borderColor',{type:'color'}], ['radius',{type:'number',min:0,max:48}] ] },
      { title:'Background', rows:[ ['bg',{type:'color'}] ] },
      { title:'Header', rows:[ ['header',{type:'checkbox'}], ['headerText',{type:'text', when:k=>k.header}], ['headerColor',{type:'color', when:k=>k.header}] ] }
    ]}
  },
  textfield: {
    label: 'Text Field',
    defaults: { w:200, h:36, label:'Етикет', placeholder:'', fontSize:14 },
    create(){ const el=document.createElement('div'); el.className='widget textfield'; el.style.padding='8px'; el.innerHTML='<div class="input-wrap"><input class="input-field" placeholder="" /></div>'; return el; },
    applyProps(el,p){ const inp=el.querySelector('input'); inp.placeholder=p.placeholder; inp.style.fontSize=p.fontSize+'px'; if(p.label){ if(!el.querySelector('label')){ const lb=document.createElement('label'); lb.style.display='block'; lb.style.marginBottom='6px'; lb.textContent=p.label; el.prepend(lb); } else el.querySelector('label').textContent=p.label; } else { el.querySelector('label')?.remove(); } },
    inspector: { groups:[ { title:'Field', rows:[ ['label',{type:'text'}], ['placeholder',{type:'text'}], ['fontSize',{type:'number',min:10,max:32}] ] } ] }
  },
  checkbox: {
    label: 'Checkbox',
    defaults: { w:160, h:28, label:'Опция', checked:false },
    create(){ const el=document.createElement('div'); el.className='widget checkbox'; el.innerHTML='<div class="box"></div><div class="lbl">Опция</div>'; return el; },
    applyProps(el,p){ el.querySelector('.lbl').textContent=p.label; el.querySelector('.box').style.background = p.checked ? '#275985' : '#0f141e'; },
    inspector: { groups:[ { title:'Checkbox', rows:[ ['label',{type:'text'}], ['checked',{type:'checkbox'}] ] } ] }
  }
};

export function buildPalette(root, onAdd){
  root.innerHTML = '';
  for(const [type, def] of Object.entries(registry)){
    const it = document.createElement('div'); it.className='palette-item'; it.textContent=def.label; it.dataset.type=type;
    it.onclick = ()=> onAdd(type);
    root.appendChild(it);
  }
}
