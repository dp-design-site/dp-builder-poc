/*
 DP Configurator — Properties Section: Typography (v0.1)
 File: js/ui/props-typography.js

 Embeds a "Текст" секция в десния Properties панел.
 - Автоматично таргетира текстов елемент в селектирания widget:
   1) предпочита елемент с [data-editable="text"]
   2) иначе търси .wb-name
 - Управлява: font-family, size, weight, italic, align, transform, color, letter-spacing.
 - Публик API: PropertiesSections.typography.sync(selectedWidget)
*/
(function (global) {
  const NS = (global.PropertiesSections = global.PropertiesSections || {});

  const S = { section: null, inputs: {}, target: null };

  function section() {
    if (S.section) return S.section;
    const sec = el('section', { class: 'prop-section', 'data-key': 'typography' });
    const header = el('header', { class: 'prop-header', tabindex: '0' }, [ el('span', { class: 'prop-title', text: 'Текст' }), toggleBtn() ]);
    const body = el('div', { class: 'prop-body' });
    header.querySelector('.prop-toggle').addEventListener('click', () => sec.classList.toggle('collapsed'));
    header.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); sec.classList.toggle('collapsed'); }});
    sec.appendChild(header); sec.appendChild(body);

    // Row: Family
    body.appendChild(row([ label('Шрифт'), select({ id:'tx-family' }, families()) ]));
    // Row: Size + Line
    body.appendChild(row([ label('Размер'), number({ id:'tx-size', min:8, max:128, step:1 }), label('Line'), number({ id:'tx-line', min:0.8, max:3, step:0.1 }) ]));
    // Row: Weight + Style
    body.appendChild(row([ label('Тегло'), select({ id:'tx-weight' }, weights()), label('Стил'), select({ id:'tx-style' }, [['normal','Normal'],['italic','Italic']]) ]));
    // Row: Align + Transform
    body.appendChild(row([ label('Подравняване'), select({ id:'tx-align' }, aligns()), label('Регистр'), select({ id:'tx-transform' }, transforms()) ]));
    // Row: Color
    const clr = row([ label('Цвят'), color({ id:'tx-color' }), text({ id:'tx-color-hex', class:'hex', placeholder:'#RRGGBB' }) ]);
    clr.classList.add('row-color'); body.appendChild(clr);
    // Row: Letter spacing
    body.appendChild(row([ label('Интервал'), number({ id:'tx-letter', step:0.1, min:-5, max:20 }) ]));

    S.inputs = mapInputs(sec, ['tx-family','tx-size','tx-line','tx-weight','tx-style','tx-align','tx-transform','tx-color','tx-color-hex','tx-letter']);
    Object.values(S.inputs).forEach(inp => inp.addEventListener('input', apply));
    S.inputs['tx-color'].addEventListener('input', () => syncColorToHex('#tx-color', '#tx-color-hex', S.inputs['tx-color'].value));
    S.inputs['tx-color-hex'].addEventListener('input', syncHexToColor);

    S.section = sec;
    return sec;
  }

  function sync(selectedWidget){
    S.target = resolveTarget(selectedWidget);
    paint();
  }

  function resolveTarget(w){
    if (!w) return null;
    return w.querySelector('[data-editable="text"]') || w.querySelector('.wb-name') || null;
  }

  function paint(){
    const t = S.target; const dis = !t; setDisabled(dis);
    if (!t) return;
    const cs = getComputedStyle(t);
    set('tx-family', pick(cs.fontFamily, families().map(x=>x[0])));
    set('tx-size', parseInt(cs.fontSize)||12);
    set('tx-line', parseFloat(cs.lineHeight)||1.2);
    set('tx-weight', String(parseInt(cs.fontWeight)||400));
    set('tx-style', cs.fontStyle||'normal');
    set('tx-align', cs.textAlign||'left');
    set('tx-transform', cs.textTransform||'none');
    const color = rgbToHex(cs.color); set('tx-color', color); set('tx-color-hex', color.toUpperCase());
    set('tx-letter', parseFloat(cs.letterSpacing)||0);
  }

  function apply(){ const t=S.target; if(!t) return; const st=t.style;
    st.fontFamily   = val('tx-family');
    st.fontSize     = px(val('tx-size'));
    st.lineHeight   = String(val('tx-line'));
    st.fontWeight   = String(val('tx-weight'));
    st.fontStyle    = String(val('tx-style'));
    st.textAlign    = String(val('tx-align'));
    st.textTransform= String(val('tx-transform'));
    st.color        = hex(val('tx-color-hex'));
    st.letterSpacing= px(val('tx-letter'));
  }

  // helpers
  function families(){ return [['system-ui','System'],['Helvetica','Helvetica'],['Arial','Arial'],['Roboto','Roboto'],['Inter','Inter'],['Montserrat','Montserrat'],['inherit','(inherit)']]; }
  function weights(){ return [['300','Light'],['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold']]; }
  function aligns(){ return [['left','Ляво'],['center','Център'],['right','Дясно']]; }
  function transforms(){ return [['none','—'],['uppercase','UPPER'],['lowercase','lower'],['capitalize','Cap']]; }

  function row(children){ const n=el('div',{class:'prop-row'},children); return n; }
  function label(text){ return el('label',{class:'prop-label',text}); }
  function number(attrs){ return input({ type:'number', ...attrs }); }
  function color(attrs){ return input({ type:'color', ...attrs }); }
  function text(attrs){ return input({ type:'text', ...attrs }); }
  function select(attrs, opts){ const n=el('select',attrs); opts.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;n.appendChild(o);}); return n; }
  function input(attrs){ const n=el('input',attrs); return n; }
  function el(tag, attrs, children){ const n=document.createElement(tag); if(attrs){ for(const[k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='text') n.textContent=v; else n.setAttribute(k,v);} } if(children){ for(const c of children) n.appendChild(c);} return n; }
  function toggleBtn(){ const b=el('button',{class:'prop-toggle',title:'Покажи/Скрий'}); const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','16'); svg.setAttribute('height','16'); const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d','M8.12 9.29L12 13.17l3.88-3.88 1.41 1.41L12 16l-5.29-5.29 1.41-1.42z'); p.setAttribute('fill','currentColor'); svg.appendChild(p); b.appendChild(svg); return b; }
  function setDisabled(dis){ (S.section||document).querySelectorAll('[data-key="typography"] .prop-body input, [data-key="typography"] .prop-body select').forEach(n=>n.disabled=!!dis); }
  function set(id,v){ const i=S.inputs[id]; if(i) i.value=v; }
  function val(id){ return S.inputs[id]?.value; }
  function px(v){ const n=parseFloat(v); return Number.isFinite(n)? (n+'px') : ''; }
  function hex(v){ return /^#[0-9a-fA-F]{6}$/.test(v)? v : '#000000'; }
  function rgbToHex(rgb){ if(!rgb) return '#000000'; const m=rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if(!m) return '#000000'; const r=(+m[1]).toString(16).padStart(2,'0'); const g=(+m[2]).toString(16).padStart(2,'0'); const b=(+m[3]).toString(16).padStart(2,'0'); return `#${r}${g}${b}`; }
  function pick(val, options){ const clean=String(val||'').replaceAll('"',''); const found = options.find(o => clean.includes(o)); return found || options[0]; }

  function mapInputs(root, ids){
    const m = {};
    ids.forEach(id => m[id] = root.querySelector('#' + id));
    return m;
  }

  global.syncColorToHex = function(colorSel, hexSel, value) {
    const val = hex(value);
    const color = document.querySelector(colorSel);
    const hexInput = document.querySelector(hexSel);
    if (color) color.value = val;
    if (hexInput) hexInput.value = val.toUpperCase();
  };

  global.syncHexToColor = function(e) {
    const hexVal = e.target.value;
    const color = document.querySelector('#tx-color');
    if (color) color.value = hex(hexVal);
  };

  NS.typography = { section, sync };
})(window);
