// Avisa al fondo cuando escribiste algo en la página, para que esa pestaña
// no se suspenda y no pierdas texto sin guardar.
(() => {
  let dirty = false;
  const send = (value) => {
    try {
      chrome.runtime.sendMessage({ dirty: value }).catch(() => {});
    } catch {
      // La extensión se recargó: no hay a quién avisar.
    }
  };
  const set = (value) => {
    if (dirty === value) return;
    dirty = value;
    send(value);
  };

  addEventListener('input', (e) => e.isTrusted && set(true), true);
  addEventListener('submit', () => set(false), true);
  addEventListener('pagehide', () => dirty && send(false), true);
  addEventListener('pageshow', (e) => e.persisted && dirty && send(true), true);
})();
