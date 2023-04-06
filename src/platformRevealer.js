let platformsAreVisible = false;

const revealPlatforms = (render) => {
  platformsAreVisible = !platformsAreVisible;
  const opacity = platformsAreVisible ? 0.2 : 0;
  render.engine.world.bodies.forEach((body, idx) => {
    if (body.label === 'platform') {
      body.render.opacity = opacity;
    }
  });
};

const initPlatformRevealer = (render) => {
  const elmId = 'mario-platform-revealer';
  document.getElementById(elmId)?.remove();
  const elm = document.createElement('button');
  elm.id = elmId;
  elm.textContent = '?';
  elm.title = 'Toggle platform visibility';

  document.body.appendChild(elm);
  const styles = {
    position: 'fixed',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: '40px',
    right: '5px',
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '50%',
    background: 'black',
    border: 'none',
    color: 'white',
    opacity: 0.2,
    zIndex: 1010,
  };
  for (const s in styles) {
    elm.style[s] = styles[s];
  }
  elm.addEventListener('click', () => {
    elm.blur();
    revealPlatforms(render);
  });
};

export { initPlatformRevealer };
