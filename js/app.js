let SNAP_TOL = 3;
let SNAP_ENABLED = true;
let SNAP_EDGES = true;
let SNAP_CENTERS = true;

function allWidgets(except = null) {
  return Array.from(document.querySelectorAll('.widget')).filter(w => w !== except);
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

function hideGuides() {
  document.getElementById('guide-v').style.display = 'none';
  document.getElementById('guide-h').style.display = 'none';
}

function showGuide(axis, pos) {
  const guide = document.getElementById(axis === 'v' ? 'guide-v' : 'guide-h');
  if (axis === 'v') {
    guide.style.left = pos + 'px';
    guide.style.display = 'block';
  } else {
    guide.style.top = pos + 'px';
    guide.style.display = 'block';
  }
  updateGuideStyles();
}

function updateGuideStyles() {
  const style = document.getElementById('guide-style')?.value || 'solid';
  const color = document.getElementById('guide-color')?.value || '#37bcff';
  const width = document.getElementById('guide-width')?.value || 2;
  for (const id of ['guide-v', 'guide-h']) {
    const guide = document.getElementById(id);
    // Style: dashed, dotted, solid
    if (style !== 'solid') {
      guide.style.background = 'none';
      if (id === 'guide-v') {
        guide.style.borderLeft = width + 'px ' + style + ' ' + color;
        guide.style.borderTop = 'none';
      } else {
        guide.style.borderTop = width + 'px ' + style + ' ' + color;
        guide.style.borderLeft = 'none';
      }
    } else {
      guide.style.border = 'none';
      guide.style.background = color;
    }
    guide.style.width = id === 'guide-v' ? width + 'px' : '';
    guide.style.height = id === 'guide-h' ? width + 'px' : '';
  }
}

function smartSnap(target, nx, ny, event = {}) {
  if (!SNAP_ENABLED || event.shiftKey) {
    hideGuides();
    return { x: nx, y: ny };
  }
  const tr = getRect(target);
  let snappedX = nx, snappedY = ny;
  let vGuide = null, hGuide = null;
  let vGuidePos = null, hGuidePos = null;

  for (const other of allWidgets(target)) {
    const or = getRect(other);

    // Vertical snap (left, center, right)
    if (SNAP_EDGES) {
      for (const [txName, tx] of [['left', tr.left], ['right', tr.right]]) {
        for (const ox of [or.left, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const [txName, tx] of [['centerX', tr.centerX]]) {
        for (const ox of [or.centerX]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }

    // Във vertical snap:
    if (SNAP_CENTERS) {
      for (const [txName, tx] of [['left', tr.left], ['centerX', tr.centerX], ['right', tr.right]]) {
        for (const ox of [or.left, or.centerX, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }

    // Във vertical snap:
    if (SNAP_CENTERS) {
      for (const [txName, tx] of [['left', tr.left], ['centerX', tr.centerX], ['right', tr.right]]) {
        for (const ox of [or.left, or.centerX, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }

    // Horizontal snap (top, center, bottom)
    if (SNAP_EDGES) {
      for (const [tyName, ty] of [['top', tr.top], ['bottom', tr.bottom]]) {
        for (const oy of [or.top, or.bottom]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true;
            hGuidePos = snappedY + (ty - tr.top);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const [tyName, ty] of [['centerY', tr.centerY]]) {
        for (const oy of [or.centerY]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true;
            hGuidePos = snappedY + (ty - tr.top);
          }
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

// === SNAPBAR логика + COLOR HEX синхронизация ===
document.addEventListener('DOMContentLoaded', () => {

  document.addEventListener('keydown', function(e) {
    // Delete или Backspace (когато няма input/textarea фокус)
    if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement === document.body) {
      for (const w of document.querySelectorAll('.widget.selected')) {
        w.remove();
      }
      // Ако имаш inspector или друго, може да го затвориш тук
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
  document.getElementById('snap-enable')?.addEventListener('change', e => {
    SNAP_ENABLED = !!e.target.checked;
  });
  document.getElementById('snap-edges')?.addEventListener('change', e => {
    SNAP_EDGES = !!e.target.checked;
  });
  document.getElementById('snap-centers')?.addEventListener('change', e => {
    SNAP_CENTERS = !!e.target.checked;
  });
  document.getElementById('snap-tolerance')?.addEventListener('input', e => {
    SNAP_TOL = parseInt(e.target.value, 10);
  });
  for (const id of ['guide-style','guide-color','guide-width']) {
    document.getElementById(id)?.addEventListener('input', updateGuideStyles);
  }

  // === MARQUEE SELECTION LOGIC ===
  const canvas = document.getElementById('canvas');
  const marquee = document.getElementById('marquee');
  let marqueeActive = false;
  let marqueeStart = {x:0, y:0};
  let marqueeType = 'normal'; // left-right или right-left

  // НОВО: без подскачане през widget-и
  function setMarqueeDragging(dragging) {
    if (dragging) {
      document.body.classList.add('marquee-dragging');
    } else {
      document.body.classList.remove('marquee-dragging');
    }
  }

  canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.classList.contains('widget')) return;
    if (!e.shiftKey && !e.ctrlKey) {
      for (const w of document.querySelectorAll('.widget.selected')) w.classList.remove('selected');
    }
    marqueeActive = true;
    setMarqueeDragging(true); // НОВО
    marqueeStart = { x: e.offsetX, y: e.offsetY };
    marquee.style.left = marqueeStart.x + 'px';
    marquee.style.top = marqueeStart.y + 'px';
    marquee.style.width = marquee.style.height = '0px';
    marquee.style.display = 'block';
    marqueeType = null; // ще определим при mousemove
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!marqueeActive) return;
    const x = e.offsetX, y = e.offsetY;
    const left = Math.min(marqueeStart.x, x);
    const top = Math.min(marqueeStart.y, y);
    const width = Math.abs(marqueeStart.x - x);
    const height = Math.abs(marqueeStart.y - y);
    marquee.style.left = left + 'px';
    marquee.style.top = top + 'px';
    marquee.style.width = width + 'px';
    marquee.style.height = height + 'px';
    marqueeType = (x >= marqueeStart.x) ? 'left-right' : 'right-left';
    for (const w of document.querySelectorAll('.widget')) {
      const wx = parseFloat(w.getAttribute('data-x')) || 0;
      const wy = parseFloat(w.getAttribute('data-y')) || 0;
      const ww = w.offsetWidth, wh = w.offsetHeight;
      if (marqueeType === 'left-right') {
        if (
          wx >= left && wx + ww <= left + width &&
          wy >= top && wy + wh <= top + height
        ) {
          w.classList.add('selected');
        } else {
          w.classList.remove('selected');
        }
      } else {
        if (
          wx < left + width && wx + ww > left &&
          wy < top + height && wy + wh > top
        ) {
          w.classList.add('selected');
        } else {
          w.classList.remove('selected');
        }
      }
    }
  });

  canvas.addEventListener('mouseup', function(e) {
    if (!marqueeActive) return;
    marqueeActive = false;
    setMarqueeDragging(false); // НОВО
    marquee.style.display = 'none';
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      for (const w of document.querySelectorAll('.widget.selected')) w.classList.remove('selected');
      marqueeActive = false;
      setMarqueeDragging(false); // НОВО
      marquee.style.display = 'none';
    }
  });

  // === MULTI-DRAG с дълго задържане ===
  let dragTimer = null, dragStarted = false;
  for (const widget of document.querySelectorAll('.widget')) {
    widget.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (marqueeActive) return;
      if (e.shiftKey) {
        widget.classList.toggle('selected');
      } else {
        // Ако вече има мулти-селекция и този е част от нея, стартирай multi-drag със задържане!
        const selected = document.querySelectorAll('.widget.selected');
        if (selected.length > 1 && widget.classList.contains('selected')) {
          dragStarted = false;
          dragTimer = setTimeout(() => {
            dragStarted = true;
            // Симулираме drag start чрез dispatchEvent, ако искаш може да покажеш и outline
          }, 200);
          // Ако започне да се движи (mousemove) – стартирай веднага
          const moveHandler = () => {
            if (dragTimer) {
              clearTimeout(dragTimer); dragTimer = null;
              dragStarted = true;
            }
            window.removeEventListener('mousemove', moveHandler);
          };
          window.addEventListener('mousemove', moveHandler);

          // При mouseup – ако не е dragStarted, селектирай само този
          const upHandler = () => {
            if (!dragStarted) {
              for (const w of document.querySelectorAll('.widget.selected')) w.classList.remove('selected');
              widget.classList.add('selected');
            }
            window.removeEventListener('mouseup', upHandler);
            window.removeEventListener('mousemove', moveHandler);
            if (dragTimer) clearTimeout(dragTimer);
          };
          window.addEventListener('mouseup', upHandler);
        } else {
          for (const w of document.querySelectorAll('.widget.selected')) w.classList.remove('selected');
          widget.classList.add('selected');
        }
      }
      e.stopPropagation();
    });
  }

  // === DRAG/RESIZE с MULTI-SELECTION (PRO style) ===
let dragGroupStart = new Map();

interact('.widget').draggable({
  listeners: {
    start (event) {
      dragGroupStart.clear();
      const target = event.target;
      // Ако target е селектиран - група drag
      const selected = target.classList.contains('selected')
        ? document.querySelectorAll('.widget.selected')
        : [target];
      for (const w of selected) {
        dragGroupStart.set(w, {
          x: parseFloat(w.getAttribute('data-x')) || 0,
          y: parseFloat(w.getAttribute('data-y')) || 0
        });
      }
    },
    move (event) {
      const target = event.target;
      // Винаги работим с група, дори да е само един
      const group = dragGroupStart.size
        ? Array.from(dragGroupStart.keys())
        : [target];

      for (const w of group) {
        const start = dragGroupStart.get(w) || {
          x: parseFloat(w.getAttribute('data-x')) || 0,
          y: parseFloat(w.getAttribute('data-y')) || 0
        };
        let x = start.x + event.dx;
        let y = start.y + event.dy;
        // Smart snap само за target
        if (w === target) {
          const snapped = smartSnap(target, x, y, event);
          x = snapped.x; y = snapped.y;
          // Изчисли delta между snapнатия target и началната му позиция
          var dx = x - start.x;
          var dy = y - start.y;
        }
        // Всички останали местим със същия dx, dy
        if (w !== target) {
          x = start.x + dx;
          y = start.y + dy;
        }
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
        // SNAPPING
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
        if (SNAP_ENABLED && !event.shiftKey) {
          for (const other of allWidgets(event.target)) {
            const or = getRect(other);
            // Вертикален snap (left/right/center)
            if (SNAP_EDGES) {
              for (const [txName, tx] of [['left', tr.left], ['right', tr.right]]) {
                for (const ox of [or.left, or.right]) {
                  if (Math.abs(tx - ox) < SNAP_TOL) {
                   if (txName === 'left')   { snappedX = ox; snappedW = tr.right - ox; vGuide = true; vGuidePos = ox; }
                    if (txName === 'right')  { snappedW = ox - tr.left; vGuide = true; vGuidePos = ox; }
                  }
                }
              }
            }
            if (SNAP_CENTERS) {
              for (const [txName, tx] of [['centerX', tr.centerX]]) {
                for (const ox of [or.centerX]) {
                  if (Math.abs(tx - ox) < SNAP_TOL) {
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
            if (SNAP_EDGES) {
              for (const [tyName, ty] of [['top', tr.top], ['bottom', tr.bottom]]) {
                for (const oy of [or.top, or.bottom]) {
                  if (Math.abs(ty - oy) < SNAP_TOL) {
                    if (tyName === 'top')    { snappedY = oy; snappedH = tr.bottom - oy; hGuide = true; hGuidePos = oy; }
                    if (tyName === 'bottom') { snappedH = oy - tr.top; hGuide = true; hGuidePos = oy; }
                  }
                }
              }
            }
            if (SNAP_CENTERS) {
              for (const [tyName, ty] of [['centerY', tr.centerY]]) {
                for (const oy of [or.centerY]) {
                 if (Math.abs(ty - oy) < SNAP_TOL) {
                    const newY = oy - (tr.bottom - tr.top)/2;
                    snappedY = newY;
                    snappedH = tr.bottom - tr.top;
                    hGuide = true; hGuidePos = oy;
                  }
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
