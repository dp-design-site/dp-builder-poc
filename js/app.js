// app.js – Drag, Resize & Smart Guides
// ЗАДЪЛЖИТЕЛНО: Interact.js трябва да е зареден чрез CDN в index.html
// <script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>

const SNAP_TOL = 8;

function allWidgets(except = null) {
  return Array.from(document.querySelectorAll('.widget')).filter(w => w !== except);
}

function getRect(el) {
  // x и y са относително към canvas!
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const x = elRect.left - canvasRect.left;
  const y = elRect.top - canvasRect.top;
  const w = el.offsetWidth, h = el.offsetHeight;
  return {
    left: x, right: x + w, top: y, bottom: y + h,
    centerX: x + w / 2, centerY: y + h / 2
  };
}



function hideGuides() {
  document.getElementById('guide-v').style.display = 'none';
  document.getElementById('guide-h').style.display = 'none';
}

function showGuide(axis, pos) {
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();
  if (axis === 'v') {
    const guide = document.getElementById('guide-v');
    guide.style.left = (pos) + 'px';
    guide.style.display = 'block';
  } else {
    const guide = document.getElementById('guide-h');
    guide.style.top = (pos) + 'px';
    guide.style.display = 'block';
  }
}


function smartSnap(target, nx, ny) {
  const tr = getRect(target);
  let snappedX = nx, snappedY = ny;
  let vGuide = null, hGuide = null;
  let vGuidePos = null, hGuidePos = null;

  for (const other of allWidgets(target)) {
    const or = getRect(other);

    // Vertical snap (left, center, right)
    for (const [txName, tx] of [['left', tr.left], ['centerX', tr.centerX], ['right', tr.right]]) {
      for (const ox of [or.left, or.centerX, or.right]) {
        if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
          snappedX = ox - (tx - tr.left);
          vGuide = true;
          // Ново: линията трябва да е на snap-натия ръб на нашия widget!
          if (txName === 'left')    vGuidePos = snappedX;
          if (txName === 'centerX') vGuidePos = snappedX + (tr.centerX - tr.left);
          if (txName === 'right')   vGuidePos = snappedX + (tr.right - tr.left);
        }
      }
    }

    // Horizontal snap (top, center, bottom)
    for (const [tyName, ty] of [['top', tr.top], ['centerY', tr.centerY], ['bottom', tr.bottom]]) {
      for (const oy of [or.top, or.centerY, or.bottom]) {
        if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
          snappedY = oy - (ty - tr.top);
          hGuide = true;
          if (tyName === 'top')     hGuidePos = snappedY;
          if (tyName === 'centerY') hGuidePos = snappedY + (tr.centerY - tr.top);
          if (tyName === 'bottom')  hGuidePos = snappedY + (tr.bottom - tr.top);
        }
      }
    }
  }

  if (vGuide) showGuide('v', vGuidePos);
  else document.getElementById('guide-v').style.display = 'none';

  if (hGuide) showGuide('h', hGuidePos);
  else document.getElementById('guide-h').style.display = 'none';

  return { x: snappedX, y: snappedY };
}


// Interact.js инициализация
window.addEventListener('DOMContentLoaded', () => {
  interact('.widget').draggable({
    listeners: {
      move (event) {
        const target = event.target;
        let x = parseInt(target.getAttribute('data-x')) || 0;
        let y = parseInt(target.getAttribute('data-y')) || 0;
        x += event.dx;
        y += event.dy;
        // --- SNAPPING ---
        const snapped = smartSnap(target, x, y);
        x = snapped.x; y = snapped.y;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      },
      end (event) {
        hideGuides();
      }
    }
  });
  interact('.widget').resizable({
    edges: { left: true, right: true, top: true, bottom: true },
    listeners: {
      move (event) {
        let { x, y } = event.target.dataset;
        x = parseInt(x) || 0;
        y = parseInt(y) || 0;
        // update the element's style
        event.target.style.width  = event.rect.width + 'px';
        event.target.style.height = event.rect.height + 'px';
        // translate when resizing from top/left edges
        x += event.deltaRect.left;
        y += event.deltaRect.top;
        event.target.style.transform = `translate(${x}px, ${y}px)`;
        event.target.setAttribute('data-x', x);
        event.target.setAttribute('data-y', y);
        // Smart guides могат да се добавят и тук, ако искаш snap при resize
      },
      end (event) {
        hideGuides();
      }
    }
  });
});
