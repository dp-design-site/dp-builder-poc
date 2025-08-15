// Универсална функция за зареждане на HTML компонент
async function loadComponent(selector, url) {
  const mount = document.querySelector(selector);
  if (!mount) return;
  const resp = await fetch(url);
  if (!resp.ok) return;
  const html = await resp.text();
  mount.innerHTML = html;
  // Ако компонентът има вътрешни <script> – изпълни ги
  const scripts = mount.querySelectorAll("script");
  scripts.forEach(s => {
    const newScript = document.createElement('script');
    if (s.type) newScript.type = s.type;
    newScript.textContent = s.textContent;
    document.body.appendChild(newScript);
    s.remove();
  });
  // Ако има вътрешен <style> – добави го в <head>
  const styles = mount.querySelectorAll("style");
  styles.forEach(style => {
    document.head.appendChild(style);
  });
}

// Зареди context-menu.html в <div id=\"context-menu-mount\">
loadComponent('#context-menu-mount', 'components/context-menu.html');
