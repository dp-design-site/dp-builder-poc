// ======= Утилити =======
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => 'w_' + Math.random().toString(36).slice(2,9);
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

const GRID = 10; // snap 10px

// ======= Състояние =======
const state = {
  selectedId: null
};

// ======= Създаване на widget DOM =======
function createWidget(type, x=40, y=40){
  const id = uid();
  const el = document.createElement('div');
  el.className = `widget ${type}`;
  el.dataset.id = id;
  el.dataset.type = type;
  el.style.left = x + 'px';
  el.style.top = y + 'px';

  // вътрешно съдържание
  if(type === 'button'){
    const b = document.createElement('button');
    b.textContent = 'Button';
    b.className = 'variant-primary';
    el.appendChild(b);
  } else if(type === 'toggle'){
    const t = document.createElement('div');
    t.className = 'toggle';
    t.textContent = 'Toggle';
    el.appendChild(t);
  } else if(type === 'label'){
    el.textContent = 'Label';
    el.style.padding = '6px 10px';
  } else if(type === 'panel'){
    el.style.width = '220px';
    el.style.height = '140px';
  }

  $('#canvas').appendChild(el);
  applyInteract(el);
  selectWidget(id);
  return el;
}

// ======= Interact.js: drag + resize =======
function applyInteract(el){
  interact(el).draggable({
    listeners: {
      move (event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // snap към GRID
        const nx = Math.round(x / GRID) * GRID;
        const ny = Math.round(y / GRID) * GRID;

        target.style.transform = `translate(${nx}px, ${ny}px)`;
        target.setAttribute('data-x', nx);
        target.setAttribute('data-y', ny);

        // позиция (left/top) = базови + transform
        const baseLeft = parseInt(target.style.left || 0, 10);
        const baseTop  = parseInt(target.style.top  || 0, 10);
        updateInspectorPosition(baseLeft + nx, baseTop + ny);
      }
    },
    inertia: false
  });

  interact(el).resizable({
    edges: { left: true, right: true, bottom: true, top: true },
    listeners: {
      move (event) {
        let { x, y } = event.target.dataset;
        x = parseFloat(x) || 0;
        y = parseFloat(y) || 0;

        let w = event.rect.width;
        let h = event.rect.height;

        // snap размер към GRID
        w = Math.max(40, Math.round(w / GRID) * GRID);
        h = Math.max(30, Math.round(h / GRID) * GRID);

        event.target.style.width  = w + 'px';
        event.target.style.height = h + 'px';

        x += event.deltaRect.left;
        y += event.deltaRect.top;

        event.target.style.transform = `translate(${x}px, ${y}px)`;
        event.target.dataset.x = x;
        event.target.dataset.y = y;

        // актуализирай инпутите за W/H
        $('#prop-w').value = Math.round(w);
        $('#prop-h').value = Math.round(h);
      }
    },
    inertia: false
  });

  // селекция
  el.addEventListener('pointerdown', (e)=>{
    if(!el.classList.contains('selected')) selectWidget(el.dataset.id);
    e.stopPropagation();
  });
}

// клик празно място → деселекция
$('#canvas').addEventListener('pointerdown', () => selectWidget(null));

// ======= Palette drag & drop (клон от библиотеката) =======
let ghostType = null;

$$('.palette-item').forEach(it => {
  it.addEventListener('dragstart', (e)=>{
    ghostType = it.dataset.type;
  });
  // HTML5 drag API – но ще ползваме клик за по-лесно добавяне
  it.addEventListener('click', ()=>{
    createWidget(it.dataset.type, 40 + Math.random()*60, 40 + Math.random()*60);
  });
});

// позволяваме drop
$('#canvas').addEventListener('dragover', (e)=> e.preventDefault());
$('#canvas').addEventListener('drop', (e)=>{
  e.preventDefault();
  if(!ghostType) return;
  const rect = $('#canvas').getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / GRID) * GRID;
  const y = Math.round((e.clientY - rect.top) / GRID) * GRID;
  createWidget(ghostType, x, y);
  ghostType = null;
});

// ======= Инспектор =======
function selectWidget(id){
  // махни предишния
  $$('.widget').forEach(w => w.classList.toggle('selected', w.dataset.id === id));
  state.selectedId = id;

  const empty = $('#inspector .empty');
  const fields = $('#inspector .fields');

  if(!id){
    empty.style.display = '';
    fields.classList.add('hidden');
    return;
  }

  const el = getSelected();
  empty.style.display = 'none';
  fields.classList.remove('hidden');

  // занули трансформациите в стилове → абсолютни координати
  const tx = parseFloat(el.getAttribute('data-x') || '0');
  const ty = parseFloat(el.getAttribute('data-y') || '0');
  const left = parseInt(el.style.left || '0', 10) + tx;
  const top  = parseInt(el.style.top  || '0', 10) + ty;

  // върни базата и занули transform (фиксираме позицията)
  el.style.left = left + 'px';
  el.style.top  = top + 'px';
  el.style.transform = 'translate(0,0)';
  el.setAttribute('data-x','0');
  el.setAttribute('data-y','0');

  // попълни полета
  $('#prop-id').value = el.dataset.id;
  $('#prop-type').value = el.dataset.type;
  $('#prop-x').value = Math.round(left);
  $('#prop-y').value = Math.round(top);
  $('#prop-w').value = Math.round(el.offsetWidth);
  $('#prop-h').value = Math.round(el.offsetHeight);

  const isButton = el.dataset.type === 'button';
  $('#row-variant').style.display = isButton ? '' : 'none';

  // текст
  let contentText = (()=>{
    if(isButton) return el.querySelector('button').textContent;
    if(el.dataset.type === 'toggle') return el.querySelector('.toggle').textContent;
    return el.textContent;
  })();
  $('#prop-text').value = contentText;

  // font size
  const targetForFont = (isButton ? el.querySelector('button')
                        : (el.dataset.type === 'toggle' ? el.querySelector('.toggle') : el));
  const computedFont = parseInt(getComputedStyle(targetForFont).fontSize,10);
  $('#prop-font').value = isNaN(computedFont) ? 14 : computedFont;

  // variant
  if(isButton){
    const cls = targetForFont.className || '';
    let v = 'primary';
    if(cls.includes('variant-secondary')) v = 'secondary';
    else if(cls.includes('variant-ghost')) v = 'ghost';
    else if(cls.includes('variant-danger')) v = 'danger';
    $('#prop-variant').value = v;
  }
}

function getSelected(){ return state.selectedId ? $(`.widget[data-id="${state.selectedId}"]`) : null; }

function updateInspectorPosition(x,y){
  $('#prop-x').value = Math.round(x);
  $('#prop-y').value = Math.round(y);
}

// промените от инспектора към елемента
$('#prop-text').addEventListener('input', e=>{
  const el = getSelected(); if(!el) return;
  if(el.dataset.type === 'button') el.querySelector('button').textContent = e.target.value || 'Button';
  else if(el.dataset.type === 'toggle') el.querySelector('.toggle').textContent = e.target.value || 'Toggle';
  else el.textContent = e.target.value || 'Label';
});

$('#prop-x').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  const x = Math.round(parseInt(e.target.value||0,10)/GRID)*GRID;
  el.style.left = x + 'px';
});

$('#prop-y').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  const y = Math.round(parseInt(e.target.value||0,10)/GRID)*GRID;
  el.style.top = y + 'px';
});

$('#prop-w').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  const w = Math.max(40, Math.round(parseInt(e.target.value||0,10)/GRID)*GRID);
  el.style.width = w + 'px';
});

$('#prop-h').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  const h = Math.max(30, Math.round(parseInt(e.target.value||0,10)/GRID)*GRID);
  el.style.height = h + 'px';
});

$('#prop-font').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  const target = el.dataset.type === 'button' ? el.querySelector('button')
                : el.dataset.type === 'toggle' ? el.querySelector('.toggle')
                : el;
  target.style.fontSize = clamp(parseInt(e.target.value||14,10), 8, 64) + 'px';
});

$('#prop-variant').addEventListener('change', e=>{
  const el = getSelected(); if(!el) return;
  if(el.dataset.type !== 'button') return;
  const b = el.querySelector('button');
  b.className = ''; // reset
  const v = e.target.value;
  if(v==='secondary') b.classList.add('variant-secondary');
  else if(v==='ghost') b.classList.add('variant-ghost');
  else if(v==='danger') b.classList.add('variant-danger');
  else b.classList.add('variant-primary');
});

// изтриване
$('#prop-delete').addEventListener('click', ()=>{
  const el = getSelected(); if(!el) return;
  el.remove();
  selectWidget(null);
});

// ======= Export / Import / Local save =======
function serialize(){
  const items = $$('.widget').map(el=>{
    const type = el.dataset.type;
    const rect = el.getBoundingClientRect();
    const parentRect = $('#canvas').getBoundingClientRect();

    const x = parseInt(el.style.left || '0',10);
    const y = parseInt(el.style.top || '0',10);
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);

    let text = '';
    let fontSize = 14;
    let variant = null;

    if(type === 'button'){
      const b = el.querySelector('button');
      text = b.textContent;
      fontSize = parseInt(getComputedStyle(b).fontSize,10);
      const cls = b.className || '';
      variant = cls.includes('variant-secondary') ? 'secondary'
              : cls.includes('variant-ghost') ? 'ghost'
              : cls.includes('variant-danger') ? 'danger'
              : 'primary';
    } else if(type === 'toggle'){
      const t = el.querySelector('.toggle');
      text = t.textContent;
      fontSize = parseInt(getComputedStyle(t).fontSize,10);
    } else {
      text = el.textContent;
      fontSize = parseInt(getComputedStyle(el).fontSize,10);
    }

    return { id: el.dataset.id, type, x, y, w, h, text, fontSize, variant };
  });

  return { version: 1, items };
}

function deserialize(data){
  $('#canvas').innerHTML = '<div class="canvas-hint">Пусни елементи тук</div>';
  data.items.forEach(it=>{
    const el = createWidget(it.type, it.x, it.y);
    el.style.width = it.w + 'px';
    el.style.height = it.h + 'px';

    if(it.type === 'button'){
      const b = el.querySelector('button');
      b.textContent = it.text || 'Button';
      b.style.fontSize = (it.fontSize||14)+'px';
      b.className = '';
      const v = it.variant || 'primary';
      b.classList.add(`variant-${v}`);
    } else if(it.type === 'toggle'){
      const t = el.querySelector('.toggle');
      t.textContent = it.text || 'Toggle';
      t.style.fontSize = (it.fontSize||14)+'px';
    } else {
      el.textContent = it.text || (it.type==='label' ? 'Label' : '');
      el.style.fontSize = (it.fontSize||14)+'px';
    }
  });
  selectWidget(null);
}

// Export (download)
$('#btn-export').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(serialize(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dp-configurator.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// Import (upload)
$('#file-import').addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const text = await file.text();
  try{
    const data = JSON.parse(text);
    deserialize(data);
  }catch(err){
    alert('Invalid JSON');
  }
  e.target.value = '';
});

// Clear
$('#btn-clear').addEventListener('click', ()=>{
  if(confirm('Да изчистя ли платното?')) {
    $('#canvas').innerHTML = '<div class="canvas-hint">Пусни елементи тук</div>';
    selectWidget(null);
  }
});

// Save/Load в LocalStorage
$('#btn-save').addEventListener('click', ()=>{
  localStorage.setItem('dp-configurator-mvp', JSON.stringify(serialize()));
  flash('Записано локално');
});
$('#btn-load').addEventListener('click', ()=>{
  const raw = localStorage.getItem('dp-configurator-mvp');
  if(!raw){ alert('Няма локален запис'); return; }
  try{ deserialize(JSON.parse(raw)); flash('Заредено'); }
  catch{ alert('Повредени данни'); }
});

// малък визуален „toast“
function flash(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style,{
    position:'fixed', right:'16px', bottom:'16px', background:'#1c2436',
    border:'1px solid #2b3550', color:'#e8ecf2', padding:'10px 12px',
    borderRadius:'10px', zIndex:9999
  });
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1600);
}

// стартово събитие: клик по празно място да не влачи selection
document.addEventListener('keydown', (e)=>{
  if(e.key==='Delete' || e.key==='Backspace'){
    const el = getSelected(); if(el){ el.remove(); selectWidget(null); }
  }
});
