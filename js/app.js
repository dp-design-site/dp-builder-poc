import './core/component-loader.js'; // дефинира window.loadComponent
import { initSelection } from './core/selection.js';
import { smartSnap, hideGuides, updateGuideStyles, setSnapOptions } from './core/snap.js';
import { groupSelected, ungroupSelected, copySelected, pasteClipboard, duplicateSelected, deleteSelected } from './actions/context-actions.js';

// ==============================
// Локално състояние за snap (временно, докато финализираме resize snap)
// ==============================
let SNAP_TOL = 3;
let SNAP_ENABLED = true;
let SNAP_EDGES = true;
let SNAP_CENTERS = true;

function allWidgets(except = null, ignoreSelected = false) {
  return Array.from(document.querySelectorAll('.widget')).filter(w =>
    w !== except && (!ignoreSelected || !w.classList.contains('selected'))
  );
}

function getRect(el) {
  const x = parseFloat(el.getAttribute('data-x')) || 0;
  const y = parseFloat(el.getAttribute('data-y')) || 0;
  const w = el.offsetWidth, h = el.offsetHeight;
  return {
    left: x, right: x + w, top: y, bottom: y + h,
    centerX: x + w / 2, centerY: y + h / 2,
    width: w, height: h
  };
}

function showGuideLocal(axis, pos) {
  const guide = document.getElementById(axis === 'v' ? 'guide-v' : 'guide-h');
  if (!guide) return;
  if (axis === 'v') guide.style.left = pos + 'px';
  else guide.style.top = pos + 'px';
  guide.style.display = 'block';
  updateGuideStyles();
}

// ==============================
// BOOTSTRAP
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  // Delete / Backspace (ако фокусът не е в поле за въвеждане)
  document.addEventListener('keydown', function(e) {
    const isTextInput = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    if (!isTextInput && (e.key === 'Delete' || e.key === 'Backspace')) {
      deleteSelected();
      e.preventDefault();
    }
  });

  // --- Color picker + hex sync ---
  const colorPicker = document.getElementById('guide-color');
  const colorHex = document.getElementById('guide-color-hex');
  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', e => {
      colorHex.value = e.target.value;
      updateGuideStyles();
    });
    colorHex.addEventListener('input', e => {
      let val = e.target.value;
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorPicker.value = val;
        updateGuideStyles();
      }
    });
  }
  updateGuideStyles();

  // Snapbar контроли → синхронизираме локално и към snap.js
  document.getElementById('snap-enable')?.addEventListener('change', e => {
    SNAP_ENABLED = !!e.target.checked; setSnapOptions({ enabled: SNAP_ENABLED });
  });
  document.getElementById('snap-edges')?.addEventListener('change', e => {
    SNAP_EDGES = !!e.target.checked; setSnapOptions({ edges: SNAP_EDGES });
  });
  document.getElementById('snap-centers')?.addEventListener('change', e => {
    SNAP_CENTERS = !!e.target.checked; setSnapOptions({ centers: SNAP_CENTERS });
  });
  document.getElementById('snap-tolerance')?.addEventListener('input', e => {
    SNAP_TOL = parseInt(e.target.value, 10); setSnapOptions({ tolerance: SNAP_TOL });
  });
  for (const id of ['guide-style','guide-color','guide-width']) {
    document.getElementById(id)?.addEventListener('input', updateGuideStyles);
  }

  // Selection
  initSelection();

  // === DRAG/RESIZE с MULTI-SELECTION ===
  let dragGroupStart = new Map();

  interact('.widget').resizable({
  edges: { left: true, right: true, top: true, bottom: true },
  inertia: false,
  listeners: {
    start (event) {
      const t = event.target;
      const x = parseFloat(t.getAttribute('data-x')) || 0;
      const y = parseFloat(t.getAttribute('data-y')) || 0;
      event.interaction._resizeStart = {
        x, y,
        w: t.offsetWidth,
        h: t.offsetHeight,
        right: x + t.offsetWidth,
        bottom: y + t.offsetHeight
      };
    },
    move (event) {
      const start = event.interaction._resizeStart;
      // някои версии на interact не подават event.edges – правим fallback
      const moving = event.edges || {
        left:   event.deltaRect.left   !== 0,
        right:  event.deltaRect.right  !== 0,
        top:    event.deltaRect.top    !== 0,
        bottom: event.deltaRect.bottom !== 0
      };

      // предложени стойности (без DOM writes)
      let x = start.x + event.deltaRect.left;
      let y = start.y + event.deltaRect.top;
      let w = start.w + event.deltaRect.width;
      let h = start.h + event.deltaRect.height;

      let left   = x;
      let right  = x + w;
      let top    = y;
      let bottom = y + h;

      // SNAP само за активните ръбове – намалява jitter
      const tol = SNAP_TOL;
      if (SNAP_ENABLED && !event.shiftKey) {
        for (const other of allWidgets(event.target)) {
          const or = getRect(other);

          if (SNAP_EDGES) {
            if (moving.left) {
              if (Math.abs(left - or.left)   < tol) left = or.left;
              if (Math.abs(left - or.right)  < tol) left = or.right;
            }
            if (moving.right) {
              if (Math.abs(right - or.left)  < tol) right = or.left;
              if (Math.abs(right - or.right) < tol) right = or.right;
            }
            if (moving.top) {
              if (Math.abs(top - or.top)     < tol) top = or.top;
              if (Math.abs(top - or.bottom)  < tol) top = or.bottom;
            }
            if (moving.bottom) {
              if (Math.abs(bottom - or.top)  < tol) bottom = or.top;
              if (Math.abs(bottom - or.bottom) < tol) bottom = or.bottom;
            }
          }
          // център-­snap при resize често причинява трептене – препоръчвам да го изключим за момента
        }
      }

      // фиксираме неподвижния ръб спрямо стартовия rect
      if (moving.left && !moving.right) { x = left;        w = start.right  - left;  }
      else if (moving.right && !moving.left) { x = start.x;    w = right - start.x;    }
      else { x = left; w = right - left; } // и двата – рядко

      if (moving.top && !moving.bottom) { y = top;         h = start.bottom - top;   }
      else if (moving.bottom && !moving.top) { y = start.y;    h = bottom - start.y;   }
      else { y = top;  h = bottom - top; }

      // минимални размери + еднократен DOM write
      w = Math.max(40, w);
      h = Math.max(40, h);

      event.target.style.transform = `translate(${x}px, ${y}px)`;
      event.target.setAttribute('data-x', x);
      event.target.setAttribute('data-y', y);
      event.target.style.width  = w + 'px';
      event.target.style.height = h + 'px';

      hideGuides(); // държим UI стабилен; ако искаш, можем да показваме guide за точно снапнатия ръб
    },
    end () { hideGuides(); }
  }
});

  // === Context Menu Mount ===
  loadComponent('#context-menu-mount', 'components/context-menu.html').then(() => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    canvas.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, [
        { label: 'Group',     shortcut: 'Ctrl+G',        action: groupSelected },
        { label: 'Ungroup',   shortcut: 'Ctrl+Shift+G',  action: ungroupSelected },
        'separator',
        { label: 'Copy',      shortcut: 'Ctrl+C',        action: copySelected },
        { label: 'Paste',     shortcut: 'Ctrl+V',        action: pasteClipboard },
        { label: 'Duplicate', shortcut: 'Ctrl+D',        action: duplicateSelected },
        { label: 'Delete',    shortcut: 'Del',           action: deleteSelected }
      ]);
    });
  });
});
