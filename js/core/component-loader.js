// js/core/component-loader.js

// Универсална loader функция с Promise!
function loadComponent(selector, url) {
  return new Promise(async (resolve, reject) => {
    const mount = document.querySelector(selector);
    if (!mount) return reject();
    const resp = await fetch(url);
    if (!resp.ok) return reject();
    const html = await resp.text();
    mount.innerHTML = html;
    // Изпълни скриптовете
    const scripts = mount.querySelectorAll("script");
    scripts.forEach(s => {
      const newScript = document.createElement('script');
      if (s.type) newScript.type = s.type;
      newScript.textContent = s.textContent;
      document.body.appendChild(newScript);
      s.remove();
    });
    // Вмъкни стиловете
    const styles = mount.querySelectorAll("style");
    styles.forEach(style => {
      document.head.appendChild(style);
    });
    resolve();
  });
}
