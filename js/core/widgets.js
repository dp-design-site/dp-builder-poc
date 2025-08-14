// core/widgets.js
// Defines available widgets in the palette and their creation logic.

import { addItemToCanvas } from './canvas.js';

const widgetDefs = {
  button: {
    name: 'Button',
    defaults: {
      w: 100,
      h: 40,
      text: 'Click Me',
      background: '#3ea6ff',
      borderRadius: 4,
    },
    render: (props) => {
      const btn = document.createElement('button');
      btn.textContent = props.text;
      btn.style.width = props.w + 'px';
      btn.style.height = props.h + 'px';
      btn.style.background = props.background;
      btn.style.borderRadius = props.borderRadius + 'px';
      return btn;
    },
  },
  panel: {
    name: 'Panel',
    defaults: {
      w: 200,
      h: 150,
      background: '#161a22',
      borderRadius: 6,
    },
    render: (props) => {
      const div = document.createElement('div');
      div.style.width = props.w + 'px';
      div.style.height = props.h + 'px';
      div.style.background = props.background;
      div.style.borderRadius = props.borderRadius + 'px';
      return div;
    },
  },
  textfield: {
    name: 'Text Field',
    defaults: {
      w: 200,
      h: 30,
      placeholder: 'Enter text...',
    },
    render: (props) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = props.placeholder;
      input.style.width = props.w + 'px';
      input.style.height = props.h + 'px';
      return input;
    },
  },
};

export function buildPalette(container, onSelect) {
  container.innerHTML = '';
  for (const key in widgetDefs) {
    const def = widgetDefs[key];
    const el = document.createElement('div');
    el.className = 'palette-item';
    el.textContent = def.name;
    el.onclick = () => onSelect(key);
    container.appendChild(el);
  }
}

export function createWidgetInstance(type) {
  const def = widgetDefs[type];
  if (!def) return null;
  return {
    type,
    props: { ...def.defaults },
  };
}

export function renderWidget(type, props) {
  const def = widgetDefs[type];
  if (!def) return null;
  return def.render(props);
}
