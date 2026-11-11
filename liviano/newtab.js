// Nueva pestaña de Liviano: un buscador, tus sitios más usados y el modo. Nada más.
// No hace ninguna petición de red: los íconos salen de la caché del navegador.

const MODES = ['eco', 'pro', 'extremo'];
const modeButtons = [...document.querySelectorAll('.modes button')];
const sleepBtn = document.getElementById('sleep');

function showMode(mode) {
  if (!MODES.includes(mode)) mode = 'pro';
  document.body.dataset.mode = mode;
  for (const b of modeButtons) b.setAttribute('aria-checked', String(b.dataset.mode === mode));
  try {
    localStorage.setItem('mode', mode);
  } catch {
    // Sin almacenamiento local: solo se pierde el pintado instantáneo.
  }
}

// Pinta al instante con el último modo conocido y después confirma el real.
try {
  showMode(localStorage.getItem('mode') ?? 'pro');
} catch {
  showMode('pro');
}
chrome.storage.local.get({ mode: 'pro' }).then((s) => showMode(s.mode));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mode) showMode(changes.mode.newValue);
});
// El recorte del motor depende del lanzador y solo cambia al reabrir. En
// Chrome de Google no hay lanzador, así que ahí no se muestra el aviso.
const hasLauncher = !navigator.userAgentData?.brands.some((b) => b.brand === 'Google Chrome');
for (const b of modeButtons) {
  b.addEventListener('click', () => {
    if (b.dataset.mode === document.body.dataset.mode) return;
    chrome.storage.local.set({ mode: b.dataset.mode });
    if (hasLauncher) document.getElementById('hint').hidden = false;
  });
}

// --- Solo texto -----------------------------------------------------------
const textBtn = document.getElementById('toggleText');
let noImages = false;
function showText(value) {
  noImages = value;
  textBtn.textContent = value ? 'Solo texto: sí' : 'Solo texto: no';
}
showText(false);
chrome.storage.local.get({ noImages: false }).then((s) => showText(s.noImages));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.noImages) showText(Boolean(changes.noImages.newValue));
});
textBtn.addEventListener('click', () => chrome.storage.local.set({ noImages: !noImages }));

// --- Buscador -------------------------------------------------------------
function toUrl(text) {
  if (/^[a-z][a-z\d+.-]*:\/\/\S+$/i.test(text)) return text;
  if (/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/i.test(text)) return 'https://' + text;
  return null;
}

document.getElementById('search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('q').value.trim();
  if (!text) return;
  const url = toUrl(text);
  if (url) {
    try {
      await chrome.tabs.update({ url });
      return;
    } catch {
      // Dirección no válida: se busca como texto.
    }
  }
  // Usa el buscador predeterminado del navegador.
  chrome.search.query({ text, disposition: 'CURRENT_TAB' });
});

// --- Sitios más visitados -------------------------------------------------
function siteName(site) {
  try {
    return new URL(site.url).hostname.replace(/^www\./, '');
  } catch {
    return site.title || site.url;
  }
}

// Ocultos por defecto; se muestran con el botón del pie. Si están ocultos,
// ni siquiera se le pide la lista al navegador.
const sitesNav = document.getElementById('sites');
const toggleBtn = document.getElementById('toggleSites');
let sitesLoaded = false;

async function loadSites() {
  sitesLoaded = true;
  const sites = await chrome.topSites.get();
  const links = sites
    .filter((s) => /^https?:\/\//i.test(s.url))
    .slice(0, 8)
    .map((site) => {
      const a = document.createElement('a');
      a.href = site.url;
      a.title = site.title || site.url;

      const icon = document.createElement('div');
      icon.className = 'icon';
      const img = document.createElement('img');
      img.width = 20;
      img.height = 20;
      img.alt = '';
      img.src = `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(site.url)}&size=32`;
      icon.append(img);

      const label = document.createElement('span');
      label.textContent = siteName(site);
      a.append(icon, label);
      return a;
    });
  sitesNav.replaceChildren(...links);
}

function showSites(visible) {
  sitesNav.hidden = !visible;
  toggleBtn.textContent = visible ? 'Ocultar sitios' : 'Mostrar sitios';
  if (visible && !sitesLoaded) loadSites();
}

showSites(false);
chrome.storage.local.get({ showSites: false }).then((s) => showSites(s.showSites));
toggleBtn.addEventListener('click', () => {
  const visible = sitesNav.hidden;
  showSites(visible);
  chrome.storage.local.set({ showSites: visible });
});

// --- Pestañas suspendidas -------------------------------------------------
async function showSleeping() {
  const n = (await chrome.tabs.query({ discarded: true })).length;
  sleepBtn.textContent =
    n === 0 ? 'Suspender las demás pestañas' : `${n} ${n === 1 ? 'suspendida' : 'suspendidas'} · Suspender las demás`;
}
sleepBtn.addEventListener('click', async () => {
  sleepBtn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ cmd: 'discardOthers' });
  } catch {
    // El fondo no respondió: se muestra el estado real igual.
  }
  await showSleeping();
  sleepBtn.disabled = false;
});
showSleeping();
