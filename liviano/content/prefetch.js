// Pro: precarga la página de un enlace cuando el mouse se posa sobre él,
// para que la navegación se sienta instantánea.
// Solo enlaces del mismo sitio, sin parámetros (?...) y sin nada que parezca
// cerrar sesión: precargar no debe disparar acciones.
(() => {
  if (!HTMLScriptElement.supports?.('speculationrules')) return;
  const rules = {
    prefetch: [
      {
        where: {
          and: [
            { href_matches: '/*' },
            {
              not: {
                selector_matches: [
                  'a[href*="?"]',
                  'a[href*="logout" i]',
                  'a[href*="log-out" i]',
                  'a[href*="signout" i]',
                  'a[href*="sign-out" i]',
                  'a[href*="salir" i]',
                  'a[href*="sesion" i]',
                  'a[download]',
                  'a[rel~="nofollow"]',
                ].join(', '),
              },
            },
          ],
        },
        eagerness: 'moderate',
      },
    ],
  };
  const el = document.createElement('script');
  el.type = 'speculationrules';
  el.textContent = JSON.stringify(rules);
  (document.head || document.documentElement).append(el);
})();
