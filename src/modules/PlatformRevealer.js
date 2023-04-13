class PlatformRevealer {
  platformsAreVisible = false;

  constructor(render) {
    this.render = render;
    const revealBtn = this.addRevealButton();

    revealBtn.addEventListener('click', () => {
      revealBtn.blur();
      this.togglePlatformVisibility();
    });
  }

  addRevealButton() {
    const btnId = 'mario-platform-revealer';
    document.getElementById(btnId)?.remove();
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.textContent = '?';
    btn.title = 'Toggle platform visibility';
    document.body.appendChild(btn);

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
      zIndex: 1000000, 
    };
    for (const s in styles) {
      btn.style[s] = styles[s];
    }
    return btn;
  }

  togglePlatformVisibility() {
    this.platformsAreVisible = !this.platformsAreVisible;
    const opacity = this.platformsAreVisible ? 0.2 : 0;
    this.render.engine.world.bodies.forEach((body) => {
      if (body.label === 'platform') {
        body.render.opacity = opacity;
      }
    });
  }
}
