const MODES = {
  eco: {
    name: 'Eco',
    points: [
      'Bloquea anuncios y rastreadores',
      'Suspende pestañas sin usar a los 10 min',
      'Sin animaciones, autoplay ni precarga de páginas',
    ],
  },
  pro: {
    name: 'Pro',
    points: [
      'Bloquea anuncios y rastreadores',
      'Suspende pestañas sin usar a los 30 min',
      'Precarga enlaces al pasar el mouse',
    ],
  },
  extremo: {
    name: 'Extremo',
    points: [
      'Todo lo de Eco, sin traductor, y suspende a los 3 min',
      'Bloquea fuentes web, video/audio y marcos de terceros',
    ],
    warn: 'Puede romper sitios: usá “Pausar” donde haga falta',
  },
};
const DEFAULTS = { mode: 'pro', noImages: false, pausedHosts: [] };

const $ = (id) => document.getElementById(id);
const modeButtons = [...document.querySelectorAll('.modes button')];
let settings = { ...DEFAULTS };
let tab = null;
let host = null;

function render() {
  const mode = MODES[settings.mode] ? settings.mode : DEFAULTS.mode;
  document.body.dataset.mode = mode;
  $('badge').textContent = MODES[mode].name;
  for (const b of modeButtons) b.setAttribute('aria-checked', String(b.dataset.mode === mode));

  const items = MODES[mode].points.map((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  });
  if (MODES[mode].warn) {
    const li = document.createElement('li');
    li.className = 'warn';
    li.textContent = MODES[mode].warn;
    items.push(li);
  }
  $('points').replaceChildren(...items);

  $('noImages').checked = settings.noImages;
  $('pauseRow').hidden = !host;
  if (host) {
    $('host').textContent = host;
    $('pause').checked = settings.pausedHosts.includes(host);
  }
}

async function save(patch) {
  settings = { ...settings, ...patch };
  render();
  await chrome.storage.local.set(patch);
  $('hint').hidden = false;
}

async function refreshStats() {
  const asleep = await chrome.tabs.query({ discarded: true });
  $('asleep').textContent = asleep.length;

  let blocked = 0;
  if (tab?.id != null) {
    try {
      blocked = parseInt(await chrome.action.getBadgeText({ tabId: tab.id }), 10) || 0;
    } catch {
      blocked = 0;
    }
  }
  $('blocked').textContent = blocked;
}

for (const b of modeButtons) {
  b.addEventListener('click', () => {
    if (b.dataset.mode !== settings.mode) save({ mode: b.dataset.mode });
  });
}

$('noImages').addEventListener('change', (e) => save({ noImages: e.target.checked }));

$('pause').addEventListener('change', (e) => {
  const rest = settings.pausedHosts.filter((h) => h !== host);
  save({ pausedHosts: e.target.checked ? [...rest, host] : rest });
});

$('sleep').addEventListener('click', async () => {
  const btn = $('sleep');
  btn.disabled = true;
  let n = 0;
  try {
    n = (await chrome.runtime.sendMessage({ cmd: 'discardOthers' })) || 0;
  } catch {
    n = 0;
  }
  btn.textContent = n === 1 ? '1 pestaña suspendida' : `${n} pestañas suspendidas`;
  await refreshStats();
  setTimeout(() => {
    btn.textContent = 'Suspender las demás pestañas';
    btn.disabled = false;
  }, 1800);
});

$('reload').addEventListener('click', async () => {
  if (tab?.id != null) await chrome.tabs.reload(tab.id);
  window.close();
});

(async () => {
  const [stored, tabs] = await Promise.all([
    chrome.storage.local.get(DEFAULTS),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);
  settings = { ...DEFAULTS, ...stored };
  if (!Array.isArray(settings.pausedHosts)) settings.pausedHosts = [];
  tab = tabs[0] ?? null;
  try {
    const url = new URL(tab?.url ?? '');
    if (/^https?:$/.test(url.protocol)) host = url.hostname.replace(/^www\./, '');
  } catch {
    host = null;
  }
  render();
  refreshStats();
})();
