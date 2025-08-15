const SNAP_TOL = 8;

function allWidgets(except = null) {
  return Array.from(document.querySelectorAll('.widget')).filter(w => w !== except);
}

function getRect(el) {
  // Използваме само data-x, data-y и width/height!
  const x = parseFloat(el.getAttribute('data-x')) || 0;
  const y = parseFloat(el.getAttribute('data-y')) || 0;
  const w = el.offsetWidth, h = el.offsetHeight;
  return {
    left: x, right: x + w, top: y, bottom: y + h,
    centerX: x + w / 2, centerY: y + h / 2,
    width: w, height: h
  };
}

function hideGuides() {
  document.getElementById('guide-v').style.display = 'none';
  document.getElementById('guide-h').style.display = 'none';
}

function showGuide(axis, pos) {
  if (axis === 'v') {
    const guide = document.getElementById('guide-v');
    guide.style.left = pos + 'px';
    guide.style.display = 'block';
  } else {
    const guide = document.getElementById('guide-h');
    guide.style.top = pos + 'px';
    guide.style.display = 'block';
  }
}

// Връща и къде да се покаже snap-натия ръб!
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

  if (vGuide && vGuidePos !== null) showGuide('v', vGuidePos);
  else document.getElementById('guide-v').style.display = 'none';

  if (hGuide && hGuidePos !== null) showGuide('h', hGuidePos);
  else document.getElementById('guide-h').style.display = 'none';

  return { x: snappedX, y: snappedY };
}

// Инициализация на drag/resize
window.addEventListener('DOMContentLoaded', () => {
  interact('.widget').draggable({
    listeners: {
      move (event) {
        const target = event.target;
        let x = parseFloat(target.getAttribute('data-x')) || 0;
        let y = parseFloat(target.getAttribute('data-y')) || 0;
        x += event.dx;
        y += event.dy;
        // --- SNAPPING ---
        const snapped = smartSnap(target, x, y);
        x = snapped.x; y = snapped.y;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      },
      end () {
        hideGuides();
      }
    }
  });
  interact('.widget').resizable({
    edges: { left: true, right: true, top: true, bottom: true },
    listeners: {
      move (event) {
        let x = parseFloat(event.target.getAttribute('data-x')) || 0;
        let y = parseFloat(event.target.getAttribute('data-y')) || 0;
        // Преди resize - старите w/h:
        const prevW = event.target.offsetWidth;
        const prevH = event.target.offsetHeight;

        // Update размера
        event.target.style.width  = event.rect.width + 'px';
        event.target.style.height = event.rect.height + 'px';

        // Update позиция ако resize-ваш от ляво/горе
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        // --- SNAPPING ---
        // Правим временно нов getRect:
        const w = event.rect.width;
        const h = event.rect.height;
        const tr = {
          left: x, right: x + w, top: y, bottom: y + h,
          centerX: x + w/2, centerY: y + h/2
        };

        let snappedX = x, snappedY = y;
        let snappedW = w, snappedH = h;
        let vGuide = null, hGuide = null;
        let vGuidePos = null, hGuidePos = null;

        for (const other of allWidgets(event.target)) {
          const or = getRect(other);

          // Вертикален snap (left/right/center)
          for (const [txName, tx] of [['left', tr.left], ['centerX', tr.centerX], ['right', tr.right]]) {
            for (const ox of [or.left, or.centerX, or.right]) {
              if (Math.abs(tx - ox) < SNAP_TOL) {
                if (txName === 'left')   { snappedX = ox; snappedW = tr.right - ox; vGuide = true; vGuidePos = ox; }
                if (txName === 'right')  { snappedW = ox - tr.left; vGuide = true; vGuidePos = ox; }
                if (txName === 'centerX'){
                  // Snap към център – местим x и width наведнъж
                  const newX = ox - (tr.right - tr.left)/2;
                  snappedX = newX;
                  snappedW = tr.right - tr.left;
                  vGuide = true; vGuidePos = ox;
                }
              }
            }
          }
          // Хоризонтален snap (top/bottom/center)
          for (const [tyName, ty] of [['top', tr.top], ['centerY', tr.centerY], ['bottom', tr.bottom]]) {
            for (const oy of [or.top, or.centerY, or.bottom]) {
              if (Math.abs(ty - oy) < SNAP_TOL) {
                if (tyName === 'top')    { snappedY = oy; snappedH = tr.bottom - oy; hGuide = true; hGuidePos = oy; }
                if (tyName === 'bottom') { snappedH = oy - tr.top; hGuide = true; hGuidePos = oy; }
                if (tyName === 'centerY'){
                  const newY = oy - (tr.bottom - tr.top)/2;
                  snappedY = newY;
                  snappedH = tr.bottom - tr.top;
                  hGuide = true; hGuidePos = oy;
                }
              }
            }
          }
        }

        event.target.style.transform = `translate(${snappedX}px, ${snappedY}px)`;
        event.target.setAttribute('data-x', snappedX);
        event.target.setAttribute('data-y', snappedY);
        event.target.style.width  = Math.max(40, snappedW) + 'px';
        event.target.style.height = Math.max(40, snappedH) + 'px';

        if (vGuide && vGuidePos !== null) showGuide('v', vGuidePos);
        else document.getElementById('guide-v').style.display = 'none';

        if (hGuide && hGuidePos !== null) showGuide('h', hGuidePos);
        else document.getElementById('guide-h').style.display = 'none';
      },
      end () {
        hideGuides();
      }
    }
  });
});
