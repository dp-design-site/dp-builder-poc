// DP Configurator Builder – App entry (ES module)
// This file wires the UI: palette, canvas, inspector, and app-level actions.

import {
  initCanvas,
  createFromPalette,
  serialize,
  deserialize,
  alignAPI,
  setSelection,
  initPaletteDnd,
} from './core/canvas.js';

import { buildPalette } from './core/widgets.js';
import { initInspector } from './core/inspector.js';

// ------- Utilities -------
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    background: '#1c2436',
    border: '1px solid #2b3550',
    color: '#e8ecf2',
    padding: '10px 12px',
    borderRadius: '10px',
    zIndex: 9999,
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

// ------- App bootstrap -------
function bootstrap() {
  // Build palette
  const paletteRoot = document.getElementById('palette');
  buildPalette(paletteRoot, (type) => createFromPalette(type));
  // Enable HTML5 drag & drop from palette
  initPaletteDnd(paletteRoot);

  // Init canvas + inspector
  initCanvas();
  initInspector();

  // Top actions
  const btnExport = document.getElementById('btn-export');
  const fileImport = document.getElementById('file-import');
  const btnClear = document.getElementById('btn-clear');
  const btnSave = document.getElementById('btn-save');
  const btnLoad = document.getElementById('btn-load');

  btnExport.onclick = () => {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dp-configurator.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  fileImport.onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      deserialize(data);
      setSelection([]);
      toast('Imported');
    } catch {
      alert('Invalid JSON');
    }
    e.target.value = '';
  };

  btnClear.onclick = () => {
    if (confirm('Clear canvas?')) deserialize({ version: 1, items: [] });
  };

  btnSave.onclick = () => {
    localStorage.setItem('dp-configurator', JSON.stringify(serialize()));
    toast('Saved');
  };

  btnLoad.onclick = () => {
    const raw = localStorage.getItem('dp-configurator');
    if (!raw) {
      alert('No local data');
      return;
    }
    try {
      deserialize(JSON.parse(raw));
      toast('Loaded');
    } catch {
      alert('Bad data');
    }
  };

  // Align/Distribute buttons
  for (const [id, fn] of Object.entries(alignAPI)) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  }

  // Demo seed (can be removed)
  createFromPalette('button');
  createFromPalette('panel');
  createFromPalette('textfield');
}

// Run when DOM is ready (script is loaded at the end of body, but this is safe)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
