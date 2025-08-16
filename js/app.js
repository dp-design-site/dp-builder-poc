import './core/component-loader.js'; // дефинира window.loadComponent
import { initSelection } from './core/selection.js';
import { smartSnap, hideGuides, updateGuideStyles, setSnapOptions, snapResize } from './core/snap.js';
import { groupSelected, ungroupSelected, copySelected, pasteClipboard, duplicateSelected, deleteSelected } from './actions/context-actions.js';

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

  // Snapbar контроли → пускат настройки към snap.js
  document.getElementById('snap-enable')?.addEventListener('change', e => {
    setSnapOptions({ enabled: !!e.target.checked });
  });
  document.getElementById('snap-edges')?.addEventListener('change', e => {
    setSnapOptions({ edges: !!e.target.checked });
  });
  document.getElementById('snap-centers')?.addEventListener('change', e => {
    setSnapOptions({ centers: !!e.target.checked });
  });
  document.getElementById('snap-tolerance')?.addEventListener('input', e => {
    const tol = parseInt(e.target.value, 10);
    setSnapOptions({ tolerance: tol });
  });
  for (const id of ['guide-style','guide-color','guide-width']) {
    document.getElementById(id)?.addEventListener('input', updateGuideStyles);
  }

  // Selection
  initSelection();

  // === DRAG с MULTI-SELECTION ===
  let dragGroupStart = new Map();

  interact('.widget').draggable({
    listeners: {
      start (event) {
        dragGroupStart.clear();
        const target = event.target;
        const selected = target.classList.contains('selected')
          ? document.querySelectorAll('.widget.selected')
          : [target];
        for (const w of selected) {
          dragGroupStart.set(w, {
            x: parseFloat(w.getAttribute('data-x')) || 0,
            y: parseFloat(w.getAttribute('data-y')) || 0
          });
        }
        event.interaction.startX = parseFloat(target.getAttribute('data-x')) || 0;
        event.interaction.startY = parseFloat(target.getAttribute('data-y')) || 0;
      },
      move (event) {
        const target = event.target;
        let dx = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx - (event.interaction.startX || 0);
        let dy = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy - (event.interaction.startY || 0);

        // Smart snap (от snap.js) само за target
        let tx = (dragGroupStart.get(target)?.x || 0) + dx;
        let ty = (dragGroupStart.get(target)?.y || 0) + dy;
        const snapped = smartSnap(target, tx, ty, event);
        let sdx = snapped.x - (dragGroupStart.get(target)?.x || 0);
        let sdy = snapped.y - (dragGroupStart.get(target)?.y || 0);

        for (const [w, start] of dragGroupStart) {
          let x = start.x + sdx;
          let y = start.y + sdy;
          w.style.transform = `translate(${x}px, ${y}px)`;
          w.setAttribute('data-x', x);
          w.setAttribute('data-y', y);
        }
      },
      end () {
        hideGuides();
        dragGroupStart.clear();
      }
    }
  });

  // === RESIZE със snap, изнесен в snap.js ===
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

        const { x, y, w, h } = snapResize(event, start, moving);

        // Минимални размери и еднократно писане в DOM
        const W = Math.max(40, w);
        const H = Math.max(40, h);
        event.target.style.transform = `translate(${x}px, ${y}px)`;
        event.target.setAttribute('data-x', x);
        event.target.setAttribute('data-y', y);
        event.target.style.width  = W + 'px';
        event.target.style.height = H + 'px';

        hideGuides();
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
