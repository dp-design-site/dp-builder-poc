/*
 DP Configurator — Library Panel (v0.2)
 File: js/ui/library.js

 Changes in v0.2:
 - Simplified to a single category "Елементи" with one starter item: Window (window-basic)
 - Added live ghost preview when dragging over canvas (exact size/position under cursor)
 - Kept compatibility with existing move/resize/snap systems and global dp.registerWidget

 Usage from app.js (no DOMContentLoaded here by design):
   LibraryUI.mount({
     container: "#library-panel",   // the sidebar container in index.html
     canvas: "#canvas",             // the main drawing surface container
   });

 Requirements in index.html:
   <div id="library-panel"></div>
   <div id="canvas"></div>

 Notes:
 - We rely on native HTML5 D&D for library → canvas only.
 - We show a .widget-ghost on the canvas during dragover to preview placement.
 - We do NOT hijack your internal drag/resize logic; after drop we create a
   positioned .widget and hand control back to your existing systems.
 - ALT-snap modifier etc. remain fully in your snap/constraints code.
*/

(function (global) {
  const DEFAULT_CATEGORIES = [
    {
      id: "cat-widgets",
      name: "Елементи",
      items: [
        { id: "window-basic", label: "Window", w: 120, h: 60 },
      ],
    },
  ];

  /**
   * Internal: state for the Library module
   */
  const S = {
    cfg: {
      container: null, // CSS selector or Element for the sidebar
      canvas: null,    // CSS selector or Element for the canvas surface
    },
    categories: [],
    els: {
      sidebar: null,
      canvas: null,
      ghost: null,
    },
  };

  /**
   * Mount the Library UI into the provided containers.
   * @param {{container:string|Element, canvas:string|Element, categories?:Array}} options
   */
  function mount(options) {
    if (!options) throw new Error("LibraryUI.mount: options are required");

    S.cfg.container = resolveEl(options.container);
    S.cfg.canvas = resolveEl(options.canvas);

    if (!S.cfg.container) throw new Error("LibraryUI.mount: container not found");
    if (!S.cfg.canvas) throw new Error("LibraryUI.mount: canvas not found");

    S.categories = Array.isArray(options.categories) && options.categories.length
      ? options.categories
      : clone(DEFAULT_CATEGORIES);

    // Render sidebar structure
    S.els.sidebar = renderSidebar(S.cfg.container, S.categories);

    // Wire D&D on canvas target
    wireCanvasDnD(S.cfg.canvas);

    // Minimal keyboard affordance: collapse/expand with Enter/Space on headers
    S.els.sidebar.addEventListener("keydown", onSidebarKeydown);
  }

  /** Resolve CSS selector or return element directly */
  function resolveEl(ref) {
    if (!ref) return null;
    if (typeof ref === "string") return document.querySelector(ref);
    return ref; // assume Element
  }

  /** Create sidebar DOM */
  function renderSidebar(container, categories) {
    container.innerHTML = ""; // clean

    const sidebar = el("div", { class: "dp-lib sidebar" });

    // Header / toggle bar
    const header = el("div", { class: "dp-lib-header" }, [
      el("span", { class: "dp-lib-title", text: "Библиотека" }),
      el("button", { class: "dp-lib-collapse", title: "Свий / Разгъни", "aria-label": "Toggle" }, [
        svgChevron()
      ])
    ]);

    header.querySelector(".dp-lib-collapse").addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });

    const searchWrap = el("div", { class: "dp-lib-search" }, [
      el("input", {
        class: "dp-lib-search-input",
        type: "search",
        placeholder: "Търси елемент…",
        "aria-label": "Search library",
      })
    ]);

    const listWrap = el("div", { class: "dp-lib-list" });

    for (const cat of categories) {
      const section = renderCategory(cat);
      listWrap.appendChild(section);
    }

    sidebar.appendChild(header);
    sidebar.appendChild(searchWrap);
    sidebar.appendChild(listWrap);

    // Simple search filter
    searchWrap.querySelector("input").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      filterLibrary(listWrap, q);
    });

    container.appendChild(sidebar);
    return sidebar;
  }

  function filterLibrary(listWrap, query) {
    const items = listWrap.querySelectorAll(".dp-lib-item");
    items.forEach((it) => {
      const name = (it.getAttribute("data-name") || "").toLowerCase();
      it.style.display = !query || name.includes(query) ? "" : "none";
    });
  }

  function renderCategory(cat) {
    const section = el("section", { class: "dp-lib-section", "data-cat": cat.id });

    const header = el("header", { class: "dp-lib-section-header", tabindex: 0 }, [
      el("span", { class: "dp-lib-section-title", text: cat.name }),
      el("button", { class: "dp-lib-section-toggle", title: "Покажи/Скрий" }, [ svgChevron() ])
    ]);

    const grid = el("div", { class: "dp-lib-grid" });
    for (const item of cat.items) {
      const card = renderItemCard(item, cat);
      grid.appendChild(card);
    }

    header.querySelector(".dp-lib-section-toggle").addEventListener("click", () => {
      section.classList.toggle("collapsed");
    });

    header.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        section.classList.toggle("collapsed");
      }
    });

    section.appendChild(header);
    section.appendChild(grid);
    return section;
  }

  function renderItemCard(item, cat) {
    const card = el("div", {
      class: "dp-lib-item",
      draggable: true,
      title: item.label,
      "data-id": item.id,
      "data-name": item.label,
      "data-cat": cat.id,
      "data-w": item.w,
      "data-h": item.h,
      tabindex: 0,
    }, [
      el("div", { class: "dp-lib-item-thumb" }, [
        // Placeholder thumb; you can swap with SVGs from assets/icons later
        el("div", { class: "thumb-rect" }),
      ]),
      el("div", { class: "dp-lib-item-name", text: item.label })
    ]);

    // HTML5 drag start → setTransfer data
    card.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.effectAllowed = "copy";
      const payload = {
        type: "dp-lib-item",
        item: {
          id: item.id,
          label: item.label,
          cat: cat.id,
          w: item.w,
          h: item.h,
        },
      };
      ev.dataTransfer.setData("application/json", JSON.stringify(payload));
    });

    // Keyboard: Enter to start a pseudo-drag by placing in the center of canvas
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        // Fallback insert at canvas center
        const canvas = S.cfg.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = rect.width / 2 - (item.w || 100) / 2;
        const y = rect.height / 2 - (item.h || 60) / 2;
        createWidgetOnCanvas({ x, y, item });
      }
    });

    return card;
  }

  /**
   * Wire drop target on the canvas + ghost preview
   */
  function wireCanvasDnD(canvas) {
    canvas.addEventListener("dragover", (ev) => {
      // Allow drop
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";

      try {
        const json = ev.dataTransfer.getData("application/json");
        if (!json) return;
        const data = JSON.parse(json);
        if (!data || data.type !== "dp-lib-item") return;

        // Show/update ghost following cursor
        const canvasRect = canvas.getBoundingClientRect();
        const x = ev.clientX - canvasRect.left;
        const y = ev.clientY - canvasRect.top;
        ensureGhost();
        updateGhostPosition(x, y, data.item);
        canvas.classList.add('dp-drop-over');
      } catch(_) { /* ignore */ }
    });

    canvas.addEventListener("dragleave", () => {
      removeGhost();
      canvas.classList.remove('dp-drop-over');
    });

    canvas.addEventListener("drop", (ev) => {
      ev.preventDefault();
      canvas.classList.remove('dp-drop-over');
      try {
        const json = ev.dataTransfer.getData("application/json");
        if (!json) { removeGhost(); return; }
        const data = JSON.parse(json);
        if (!data || data.type !== "dp-lib-item") { removeGhost(); return; }

        const canvasRect = canvas.getBoundingClientRect();
        const x = ev.clientX - canvasRect.left;
        const y = ev.clientY - canvasRect.top;
        removeGhost();
        createWidgetOnCanvas({ x, y, item: data.item });
      } catch (e) {
        console.warn("LibraryUI.drop: parse error", e);
        removeGhost();
      }
    });
  }

  /** Ensure there is a single ghost element on canvas */
  function ensureGhost() {
    if (S.els.ghost && S.els.ghost.isConnected) return S.els.ghost;
    const g = el('div', { class: 'widget-ghost' });
    S.cfg.canvas.appendChild(g);
    S.els.ghost = g;
    return g;
  }

  /** Update ghost size/position to follow cursor (centered under pointer) */
  function updateGhostPosition(x, y, item) {
    const g = ensureGhost();
    const w = toInt(item?.w, 120);
    const h = toInt(item?.h, 80);
    const left = Math.round(x - w / 2);
    const top  = Math.round(y - h / 2);
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    g.style.left = left + 'px';
    g.style.top  = top + 'px';
  }

  /** Remove ghost from canvas */
  function removeGhost() {
    if (S.els.ghost && S.els.ghost.parentNode) {
      S.els.ghost.parentNode.removeChild(S.els.ghost);
    }
    S.els.ghost = null;
  }

  /**
   * Create a new widget in the canvas at (x, y) using the provided library item meta
   */
  function createWidgetOnCanvas({ x, y, item }) {
    const canvas = S.cfg.canvas;
    if (!canvas) return;

    const w = toInt(item.w, 120);
    const h = toInt(item.h, 80);

    const widget = el("div", {
      class: "widget", // IMPORTANT: keep compatible with your systems
      "data-type": item.id,
      style: `position:absolute; left:${Math.round(x)}px; top:${Math.round(y)}px; width:${w}px; height:${h}px;`,
    }, [
      el("div", { class: "widget-title", text: item.label || item.id }),
    ]);

    canvas.appendChild(widget);

    // Optional hook: let the app register this widget (handles, selection, etc.)
    try {
      if (global.dp && typeof global.dp.registerWidget === "function") {
        global.dp.registerWidget(widget);
      }
    } catch (e) {
      console.debug("dp.registerWidget not available yet", e);
    }

    // Fire an event so other modules (snap/constraints) can react if needed
    const evt = new CustomEvent("dp:create-widget", { detail: { widget, item } });
    canvas.dispatchEvent(evt);

    return widget;
  }

  /** Save a ready widget configuration back to the Library (stub for later) */
  function saveCustomToLibrary({ name, snapshot, categoryId = "cat-widgets" }) {
    // snapshot may contain: geometry, params, style, constraints refs, etc.
    const cat = S.categories.find(c => c.id === categoryId);
    if (!cat) return false;
    const id = slugify(name);
    cat.items.push({ id, label: name, w: snapshot.w || 120, h: snapshot.h || 80, snapshot });

    // Re-render only that category grid for now (simple approach)
    const section = S.cfg.container.querySelector(`[data-cat="${categoryId}"]`);
    if (section) {
      const grid = section.querySelector(".dp-lib-grid");
      grid.appendChild(renderItemCard({ id, label: name, w: snapshot.w, h: snapshot.h }, cat));
    }
    return true;
  }

  /** Add a new category at runtime */
  function addCategory({ id, name }) {
    if (!id || !name) return false;
    if (S.categories.some(c => c.id === id)) return true;
    const cat = { id, name, items: [] };
    S.categories.push(cat);

    const listWrap = S.cfg.container.querySelector(".dp-lib-list");
    listWrap.appendChild(renderCategory(cat));
    return true;
  }

  /** Add a new item to a category */
  function addItem(categoryId, item) {
    const cat = S.categories.find(c => c.id === categoryId);
    if (!cat) return false;
    cat.items.push(item);

    const section = S.cfg.container.querySelector(`[data-cat="${categoryId}"]`);
    if (section) {
      section.querySelector(".dp-lib-grid").appendChild(renderItemCard(item, cat));
    }
    return true;
  }

  // ===== Helpers =====
  function onSidebarKeydown(ev) {
    // future: global key handling for the sidebar
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else node.setAttribute(k, v);
      }
    }
    if (children && children.length) {
      for (const ch of children) node.appendChild(ch);
    }
    return node;
  }

  function svgChevron() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M8.12 9.29L12 13.17l3.88-3.88 1.41 1.41L12 16l-5.29-5.29 1.41-1.42z");
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  function toInt(v, d = 0) { v = parseInt(v, 10); return Number.isFinite(v) ? v : d; }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function slugify(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

  // Public API
  const API = {
    mount,
    addCategory,
    addItem,
    saveCustomToLibrary,
  };

  global.LibraryUI = API;
})(window);
