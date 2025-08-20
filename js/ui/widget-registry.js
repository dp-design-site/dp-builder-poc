/*
 DP Configurator — Widget Registry (v0.2)
 File: js/ui/widget-registry.js

 Purpose
 - Central, lightweight loader that turns a plain <div class="widget"> into a
   fully featured widget by lazy-loading its HTML/CSS/JS bundle.
 - Keeps the core app (library/snap/constraints) clean and small.
 - No module build step required. Works with classic <script> tags.

 Concept
 - Register each widget type with paths to its assets (html/css/js):
     WidgetRegistry.registerType('window-basic', {
       html: 'widgets/window-basic/window-basic.html',
       css:  'widgets/window-basic/window-basic.css',
       js:   'widgets/window-basic/window-basic.js',
       title: 'Window'
     });
 - When a widget is created (e.g. by LibraryUI), call:
     WidgetRegistry.enhance(widgetEl, 'window-basic', { label: 'Window' })
   or rely on the automatic listener for the event fired by LibraryUI:
     canvas.dispatchEvent(new CustomEvent('dp:create-widget', { detail:{ widget, item } }))
   This registry listens for that event and auto-enhances if the type is registered.

 Widget JS Contract (classic script)
 - The widget JS file must call:
     WidgetRegistry.define('window-basic', {
       init(el, options, ctx) {
         // ---setup inner behavior, attach listeners, etc.},---
       schema: { /* optional: property schema for Properties panel */ 
       getState(el) { /* optional: return serializable state */ },
       setState(el, state) { /* optional: apply state */ },
       serialize(el) { /* optional: return snapshot for save-to-library */ }
     });
 - CSS should be namespaced under .widget[data-type="window-basic"] ... to prevent leaks.

 Notes
 - This file does NOT modify other modules. It merely provides a global API and
   listens to 'dp:create-widget'.
 - If a widget type is not registered, enhance() will warn and do nothing.
*/

(function (global) {
  const DOC = document;
  const HEAD = DOC.head || DOC.getElementsByTagName('head')[0];

  // --- Internal stores ---
  const TYPES = new Map();   // type -> {html, css, js, title}
  const DEFS  = new Map();   // type -> implementation ({init, schema, ...})

  const CSS_LOADED = new Set();              // cssURL
  const HTML_CACHE = new Map();              // htmlURL -> string
  const WAITERS = new Map();                 // type -> [resolve]
  let   BASE_PATH = '';

  // --- Utilities ---
  function joinUrl(base, path) {
    if (!base) return path;
    if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
    if (!base.endsWith('/')) base += '/';
    return base + path;
  }

  function resolveUrl(url) { return joinUrl(BASE_PATH, url); }

  function fetchText(url) {
    return fetch(url, { credentials: 'same-origin' }).then(r => {
      if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`);
      return r.text();
    });
  }

  function loadCssOnce(url) {
    const abs = resolveUrl(url);
    if (CSS_LOADED.has(abs)) return Promise.resolve();
    return new Promise((res, rej) => {
      const link = DOC.createElement('link');
      link.rel = 'stylesheet';
      link.href = abs;
      link.onload = () => { CSS_LOADED.add(abs); res(); };
      link.onerror = () => rej(new Error(`CSS load error: ${abs}`));
      HEAD.appendChild(link);
    });
  }

  function ensureHtmlCached(url) {
    const abs = resolveUrl(url);
    if (HTML_CACHE.has(abs)) return Promise.resolve(HTML_CACHE.get(abs));
    return fetchText(abs).then(txt => { HTML_CACHE.set(abs, txt); return txt; });
  }

  function ensureScriptLoaded(type, url) {
    if (DEFS.has(type)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const abs = resolveUrl(url);
      const waiter = (res) => res && resolve();
      if (!WAITERS.has(type)) WAITERS.set(type, []);
      WAITERS.get(type).push(waiter);

      const script = DOC.createElement('script');
      script.src = abs;
      script.async = true;
      script.onload = () => { /* actual resolve happens via define() */ };
      script.onerror = () => reject(new Error(`JS load error: ${abs}`));
      HEAD.appendChild(script);

      // Failsafe timeout
      setTimeout(() => {
        if (!DEFS.has(type)) {
          reject(new Error(`Widget '${type}' did not call WidgetRegistry.define()`));
        }
      }, 15000);
    });
  }

  // --- Core API ---
  function registerType(type, assets) {
    if (!type) throw new Error('registerType: type is required');
    if (!assets || (!assets.html && !assets.js && !assets.css)) {
      throw new Error('registerType: assets must include at least one of html/css/js');
    }
    TYPES.set(type, { ...assets });
  }

  function listTypes() { return Array.from(TYPES.keys()); }
  function getAssets(type) { return TYPES.get(type) || null; }
  function getImpl(type) { return DEFS.get(type) || null; }
  function isDefined(type) { return DEFS.has(type); }

  function setBasePath(path) { BASE_PATH = String(path || ''); }

  function define(type, impl) {
    if (!type || !impl) throw new Error('define(type, impl) required');
    DEFS.set(type, impl);
    if (WAITERS.has(type)) {
      for (const resolve of WAITERS.get(type)) try { resolve(true); } catch(_) {}
      WAITERS.delete(type);
    }
  }

  async function ensureLoaded(type) {
    const a = TYPES.get(type);
    if (!a) throw new Error(`ensureLoaded: unknown type '${type}'`);
    const jobs = [];
    if (a.css) jobs.push(loadCssOnce(a.css));
    if (a.html) jobs.push(ensureHtmlCached(a.html));
    if (a.js) jobs.push(ensureScriptLoaded(type, a.js));
    await Promise.all(jobs);
    return true;
  }

  async function enhance(el, type, options = {}) {
    if (!el) throw new Error('enhance: element is required');
    const a = TYPES.get(type);
    if (!a) {
      console.warn(`[WidgetRegistry] Unknown type '${type}'. Did you call registerType()?`);
      return;
    }
    await ensureLoaded(type);

    // Insert HTML template (if any)
    if (a.html) {
      const html = HTML_CACHE.get(resolveUrl(a.html));
      if (typeof html === 'string') el.innerHTML = html;
    }

    // Stamp attributes/classes expected by the ecosystem
    el.classList.add('widget');
    if (!el.getAttribute('data-type')) el.setAttribute('data-type', type);

    // Call widget init if present
    const impl = DEFS.get(type);
    try {
      impl?.init?.(el, options, { type, assets: a, registry: API });
    } catch (e) {
      console.error(`[WidgetRegistry] init() failed for '${type}':`, e);
    }
  }

  // --- Auto-enhance on LibraryUI create ---
  DOC.addEventListener('dp:create-widget', (ev) => {
    try {
      const { widget, item } = ev.detail || {};
      const type = typeof item === 'string' ? item : item?.id;
      if (!widget || !type) return;
      if (!TYPES.has(type)) return; // not registered yet → skip silently
      enhance(widget, type, { label: item?.label });
    } catch (e) { console.debug('WidgetRegistry auto-enhance skipped:', e); }
  });

  // Public API
  const API = {
    registerType,
    listTypes,
    getAssets,
    getImpl,
    isDefined,
    setBasePath,
    define,
    ensureLoaded,
    enhance,
  };

  global.WidgetRegistry = API;

  // ==============================
  // Default registrations (MVP)
  // ==============================
  // If the app doesn't register types elsewhere, we provide a minimal default
  // so the first widget works out-of-the-box.
  try {
    if (!API.getAssets('window-basic')) {
      API.registerType('window-basic', {
        html: 'widgets/window-basic/window-basic.html',
        css:  'widgets/window-basic/window-basic.css',
        js:   'widgets/window-basic/window-basic.js',
        title: 'Window'
      });
    }
  } catch (e) {
    console.warn('WidgetRegistry default registration failed:', e);
  }

})(window);
