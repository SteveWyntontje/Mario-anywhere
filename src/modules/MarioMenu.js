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
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      bottom: '1.5rem',
      right: '0.5rem',
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
    if (options.svg) {
      btn.innerHTML = options.svg;
    } else {
      btn.textContent = options.text;
    }

    btn.title = options.title;
    btn.classList.add('mario-menu-btn');
    this.menuBox.appendChild(btn);

    const styles = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '2rem',
      height: '2rem',
      borderRadius: '50%',
      borderRadius: '0.25rem',
      background: 'black',
      color: 'white',
      opacity: 0.5,
    };
    this.addStyles(btn, styles);
    document.styleSheets[0].insertRule('.mario-menu-btn:hover {opacity: 1 !important}')
    return btn;
  }

  addRevealButton() {
    const layoutStyles = 'style="position:absolute;width:2rem;"';
    const revealSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" ${layoutStyles}>
    <g>
      <path d="M6 23h20v2H6zM14 18h12v2H14zM6 13h12v2H6zM13 8h10v2H13z" style="stroke-width:0;fill:currentColor"/>
    </g>
  </svg>`;
    const options = {
      id: 'mario-platform-revealer',
      title: 'Toggle platform visibility',
      svg: revealSvg,
      text: '?',
    }
    const revealBtn = this.addButton(options);

    revealBtn.addEventListener('click', () => {
      revealBtn.blur();
      this.togglePlatformVisibility();
    });
  }

  addResetButton() {
  const layoutStyles = 'style="position:absolute;width:2rem;"';
  const resetSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" ${layoutStyles}>
  <path d="M23.79 11.5c-2.48-4.3-8-5.78-12.29-3.29l-.97.56.88-3.27-2.49 1.44-1.24 4.63 4.63 1.24 2.49-1.44-3.27-.87.97-.56c3.34-1.93 7.63-.78 9.56 2.56.94 1.62 1.18 3.51.7 5.31a6.91 6.91 0 0 1-3.26 4.25 6.949 6.949 0 0 1-5.31.7 6.91 6.91 0 0 1-4.25-3.26l-1.73 1a8.926 8.926 0 0 0 5.46 4.19c.78.21 1.56.31 2.34.31 1.56 0 3.1-.41 4.49-1.21 2.08-1.2 3.57-3.14 4.19-5.46s.3-4.75-.9-6.83Z" style="fill:currentColor;stroke-width:0"/>
</svg>`
    const options = {
      id: 'mario-reset-button',
      title: 'Reset Mario',
      text: '^',
      svg: resetSvg,
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