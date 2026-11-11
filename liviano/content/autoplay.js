// Eco y Extremo: ningún video o audio arranca solo.
// Se permite reproducir en cuanto el usuario interactúa con la página.
// Corre en el mundo de la página (MAIN) para poder interceptar play().
(() => {
  const allowed = () => navigator.userActivation.hasBeenActive;

  // Reproducción iniciada por código, incluso en elementos fuera del documento.
  // Se rechaza igual que lo hace el navegador, así los sitios ya saben manejarlo.
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (!allowed()) {
      return Promise.reject(new DOMException('Reproducción automática bloqueada', 'NotAllowedError'));
    }
    return play.apply(this, args);
  };

  // Reproducción iniciada por el atributo autoplay.
  document.addEventListener(
    'play',
    (e) => {
      if (e.target instanceof HTMLMediaElement && !allowed()) e.target.pause();
    },
    true
  );
})();
