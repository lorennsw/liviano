// Liviano — service worker.
// Todo lo pesado lo hace el propio navegador (reglas declarativas, scripts
// registrados, descarte de pestañas). Este archivo solo configura y se duerme.

const MODES = {
  eco: { rulesets: ['trackers'], discardMin: 10, calm: true, autoplay: true, prefetch: false, color: '#2e9e5b' },
  pro: { rulesets: ['trackers'], discardMin: 30, calm: false, autoplay: false, prefetch: true, color: '#2f6fed' },
  extremo: { rulesets: ['trackers', 'extreme'], discardMin: 3, calm: true, autoplay: true, prefetch: false, color: '#e5484d' },
};
const RULESETS = ['trackers', 'extreme', 'images'];
const DEFAULTS = { mode: 'pro', noImages: false, pausedHosts: [] };
const PAGES = ['http://*/*', 'https://*/*'];
const ALARM = 'sweep';

async function getSettings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  if (!MODES[s.mode]) s.mode = DEFAULTS.mode;
  if (!Array.isArray(s.pausedHosts)) s.pausedHosts = [];
  return s;
}

// Una sola operación a la vez: evita carreras al registrar scripts o reglas.
let queue = Promise.resolve();
function enqueue(job) {
  const run = queue.then(job);
  queue = run.catch((err) => console.error('[Liviano]', err));
  return run;
}

const isPaused = (url, hosts) => {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return hosts.some((h) => host === h || host.endsWith('.' + h));
};

const hostPattern = (h) => (/^[\d.]+$/.test(h) || h.includes(':') ? `*://${h}/*` : `*://*.${h}/*`);

function paint(mode) {
  chrome.action.setBadgeBackgroundColor({ color: MODES[mode].color });
  chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
}

async function applySettings() {
  const s = await getSettings();
  const m = MODES[s.mode];

  // 1) Bloqueo de red: lo ejecuta el navegador, sin JavaScript por petición.
  const want = new Set(m.rulesets);
  if (s.noImages) want.add('images');
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: RULESETS.filter((id) => want.has(id)),
    disableRulesetIds: RULESETS.filter((id) => !want.has(id)),
  });

  // 2) Sitios en pausa: se les permite todo.
  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map((r) => r.id),
    addRules: s.pausedHosts.length
      ? [
          {
            id: 1,
            priority: 100,
            action: { type: 'allowAllRequests' },
            condition: { requestDomains: s.pausedHosts, resourceTypes: ['main_frame'] },
          },
        ]
      : [],
  });

  // 3) Scripts de página: solo se inyecta lo que el modo necesita.
  const exclude = s.pausedHosts.map(hostPattern);
  const tuned = (script) => (exclude.length ? { ...script, excludeMatches: exclude } : script);
  const scripts = [{ id: 'guard', matches: PAGES, js: ['content/guard.js'], runAt: 'document_start', allFrames: true }];
  if (m.calm) scripts.push(tuned({ id: 'calm', matches: PAGES, css: ['content/calm.css'], runAt: 'document_start', allFrames: true }));
  if (m.autoplay) scripts.push(tuned({ id: 'autoplay', matches: PAGES, js: ['content/autoplay.js'], runAt: 'document_start', allFrames: true, world: 'MAIN' }));
  if (m.prefetch) scripts.push(tuned({ id: 'prefetch', matches: PAGES, js: ['content/prefetch.js'], runAt: 'document_idle' }));
  await chrome.scripting.unregisterContentScripts();
  await chrome.scripting.registerContentScripts(scripts);

  // 4) Precarga del propio navegador (adivina y carga páginas antes de que
  //    hagas clic): gasta red, CPU y RAM. Eco y Extremo la apagan; Pro deja
  //    la preferencia que tengas en la configuración del navegador.
  const preload = chrome.privacy?.network?.networkPredictionEnabled;
  if (preload) {
    try {
      if (m.prefetch) await preload.clear({});
      else await preload.set({ value: false });
    } catch {
      // La controla una política o otra extensión: se deja como está.
    }
  }
  // El traductor integrado solo se apaga en Extremo.
  // (El lanzador Liviano.cmd lee estos dos ajustes del perfil para saber en
  //  qué modo quedó el navegador y arrancar el motor con el mismo recorte.)
  const translate = chrome.privacy?.services?.translationServiceEnabled;
  if (translate) {
    try {
      if (s.mode === 'extremo') await translate.set({ value: false });
      else await translate.clear({});
    } catch {
      // Igual que arriba.
    }
  }

  // 5) Contador de bloqueos en el ícono.
  await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
  paint(s.mode);
}

// Suspende pestañas que llevan demasiado tiempo sin usarse.
// force = true: suspende ya todas las que no estén en uso.
async function sweep(force = false) {
  const s = await getSettings();
  const limit = MODES[s.mode].discardMin * 60_000;
  const [{ seen = {}, dirty = {} }, tabs] = await Promise.all([
    chrome.storage.session.get(['seen', 'dirty']),
    chrome.tabs.query({}),
  ]);
  const now = Date.now();
  const nextSeen = {};
  const nextDirty = {};
  let count = 0;

  for (const t of tabs) {
    if (dirty[t.id]?.length) nextDirty[t.id] = dirty[t.id];
    const inUse = t.active || t.audible;
    const last = inUse ? now : Math.max(seen[t.id] ?? now, t.lastAccessed ?? 0);
    nextSeen[t.id] = last;

    if (inUse || t.discarded || t.pinned || nextDirty[t.id]) continue;
    if (!/^https?:/.test(t.url ?? '') || isPaused(t.url, s.pausedHosts)) continue;
    if (!force && now - last < limit) continue;
    try {
      await chrome.tabs.discard(t.id);
      count++;
    } catch {
      // La pestaña se cerró o el navegador no permite suspenderla.
    }
  }
  await chrome.storage.session.set({ seen: nextSeen, dirty: nextDirty });
  return count;
}

async function markDirty(tabId, frameId, value) {
  const { dirty = {} } = await chrome.storage.session.get('dirty');
  const frames = new Set(dirty[tabId] ?? []);
  if (value) frames.add(frameId);
  else frames.delete(frameId);
  if (frames.size) dirty[tabId] = [...frames];
  else delete dirty[tabId];
  await chrome.storage.session.set({ dirty });
}

// El lanzador (Liviano.cmd) deja en launch.json el modo recomendado para esta
// PC según su memoria. Solo se usa la primera vez: después manda lo que elijas
// adentro del navegador. En Chrome de Google no hay lanzador y no se usa.
async function adoptLaunchMode() {
  if (navigator.userAgentData?.brands.some((b) => b.brand === 'Google Chrome')) return;
  if ((await chrome.storage.local.get('mode')).mode) return;
  try {
    const res = await fetch(chrome.runtime.getURL('launch.json'), { cache: 'no-store' });
    const { mode } = await res.json();
    if (MODES[mode]) await chrome.storage.local.set({ mode });
  } catch {
    // No se abrió con el lanzador.
  }
}

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM))) chrome.alarms.create(ALARM, { periodInMinutes: 1 });
}

// Cuando el navegador carga la extensión desde el lanzador, la primera pestaña
// suele abrirse antes de que la extensión esté lista y muestra la página de
// inicio original. Se las vuelve a mandar a "nueva pestaña" para que pasen a
// la de Liviano (recargar no alcanza: conserva la página original).
async function claimNewTabs() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });
  const ours = new Set(contexts.map((c) => c.tabId));
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    const url = t.url || t.pendingUrl || '';
    if (/^chrome:\/\/(newtab|new-tab-page)\/?$/.test(url) && !ours.has(t.id)) {
      try {
        await chrome.tabs.update(t.id, { url: 'chrome://newtab/' });
      } catch {
        // La pestaña se cerró mientras tanto.
      }
    }
  }
}

// Controles por sitio en el menú del clic derecho, para no depender del panel.
const MENU_PAUSE = 'liviano-pause';
const MENU_TEXT = 'liviano-text';
async function createMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_PAUSE, title: 'Liviano: pausar o reanudar en este sitio', contexts: ['page'] });
  chrome.contextMenus.create({ id: MENU_TEXT, title: 'Liviano: activar o quitar solo texto', contexts: ['page'] });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  enqueue(async () => {
    const s = await getSettings();
    if (info.menuItemId === MENU_TEXT) {
      await chrome.storage.local.set({ noImages: !s.noImages });
    } else if (info.menuItemId === MENU_PAUSE) {
      let host;
      try {
        const url = new URL(tab?.url ?? '');
        if (!/^https?:$/.test(url.protocol)) return;
        host = url.hostname.replace(/^www\./, '');
      } catch {
        return;
      }
      const rest = s.pausedHosts.filter((h) => h !== host);
      const pausedHosts = rest.length === s.pausedHosts.length ? [...rest, host] : rest;
      await chrome.storage.local.set({ pausedHosts });
    } else {
      return;
    }
    // Aplica ya las reglas nuevas y recarga la pestaña para que se vea.
    await applySettings();
    if (tab?.id != null) chrome.tabs.reload(tab.id).catch(() => {});
  });
});

// Tareas de arranque: una sola vez por sesión del navegador, sin depender de
// en qué orden lleguen los eventos (storage.session se vacía al cerrarlo).
async function boot() {
  const { booted } = await chrome.storage.session.get('booted');
  if (booted) return;
  await chrome.storage.session.set({ booted: true });
  await ensureAlarm();
  await adoptLaunchMode();
  // Reaplica todo en cada arranque: deja reglas, scripts y ajustes del perfil
  // al día aunque la extensión se haya actualizado con el navegador cerrado.
  await applySettings();
  await createMenus();
  await claimNewTabs();
}
enqueue(boot);

chrome.runtime.onInstalled.addListener(() => {
  enqueue(applySettings);
});

// Sin cuerpo a propósito: tener el evento registrado alcanza para que el
// navegador despierte al service worker al arrancar, y ahí corre boot().
chrome.runtime.onStartup.addListener(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.keys(changes).some((k) => k in DEFAULTS)) enqueue(applySettings);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) enqueue(() => sweep());
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.cmd === 'discardOthers') {
    enqueue(() => sweep(true)).then(reply, () => reply(0));
    return true;
  }
  if (typeof msg?.dirty === 'boolean' && sender.tab) {
    enqueue(() => markDirty(sender.tab.id, sender.frameId ?? 0, msg.dirty));
  }
});
