// core/widgets.js (registry-based)
// Exports a registry of widgets used by canvas.js & inspector.js
// Each widget defines: label, defaults, create() DOM, applyProps(el, props), inspector schema

export const registry = {
  // СЛАГАМЕ САМО ЕДИН ПРОСТ WIDGET!
  simplepanel: {
    label: 'SimplePanel',
    defaults: { w: 200, h: 100 },
    create(props = {}) {
      const el = document.createElement('div');
      el.className = 'widget simplepanel';
      el.textContent = 'Simple Panel';
      el.style.background = '#20273a';
      el.style.color = '#fff';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '18px';
      el.style.borderRadius = '12px';
      return el;
    },
    applyProps(el, props = {}) {
      // за простота – нищо специално
    },
    inspector: { groups: [] }
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

