class MarioMenu {
  platformsAreVisible = false;
  menuBox = null;

  constructor(render) {
    this.render = render;
    this.addMenuBox();
    this.addRevealButton();
    this.addResetButton();
  }

  addMenuBox() {
    const box = document.createElement('div');
    const styles = {
      position: 'fixed',
      display: 'flex',
      alignItems: 'center',
      columnGap: '0.5rem',
      top: '3rem',
      right: '0.5rem',
      color: 'red',
      zIndex: 9999999999999999, 
    }
    document.body.appendChild(box);
    this.addStyles(box, styles);
    this.menuBox = box;
  }

  addButton(options) {
    const btnId = options.id;
    document.getElementById(btnId)?.remove();
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.textContent = options.text;
    btn.title = options.title;
    this.menuBox.appendChild(btn);

    const styles = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '2rem',
      height: '2rem',
      borderRadius: '50%',
      background: 'black',
      border: 'none',
      color: 'white',
      opacity: 0.2,
    };
    this.addStyles(btn, styles);
    return btn;
  }

  addRevealButton() {
    const options = {
      id: 'mario-platform-revealer',
      title: 'Toggle platform visibility',
      text: '?',
    }
    const revealBtn = this.addButton(options);

    revealBtn.addEventListener('click', () => {
      revealBtn.blur();
      this.togglePlatformVisibility();
    });
  }

  addResetButton() {
    const options = {
      id: 'mario-reset-button',
      title: 'Reset Mario',
      text: '^',
    }
    const resetBtn = this.addButton(options);

    resetBtn.addEventListener('click', () => {
      resetBtn.blur();
      const evt = new CustomEvent('resetplayer.mario');
      document.body.dispatchEvent(evt);
    });
  }

  addStyles(elm, styles) {
    for (const s in styles) {
      elm.style[s] = styles[s];
    }
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