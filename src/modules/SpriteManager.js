class SpriteManager {
  playerSprites = [
    'r-stand.png',
    'r-1.png',
    'r-2.png',
    'r-3.png',
    'r-jump.png',
    'r-brake.png',
    'l-stand.png',
    'l-1.png',
    'l-2.png',
    'l-3.png',
    'l-jump.png',
    'l-brake.png',
    'fall.png',
  ];

  // create new array in case we want to add other sprites than just player
  spriteImages = [...this.playerSprites];

  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.preloadSprites();
    this.SPRITES = this.createActionSprites();
  }

  // return path to filename, based on baseUrl
  p(fileName) {
    const playerSpriteFolder = 'mario/';
    return this.baseUrl + playerSpriteFolder + fileName;
  }

  preloadSprites() {
    // put sprites into hidden div to make sure they're loaded
    const id = 'sprite-preloader';
    if (!document.getElementById(id)) {
      const holder = document.createElement('div');
      holder.id = id;
      holder.style.display = 'none';
      holder.setAttribute('data-mario-ignore', '');
      this.spriteImages.forEach((imgPath) => {
        const img = document.createElement('img');
        img.src = this.p(imgPath);
        holder.appendChild(img);
      });
      document.body.appendChild(holder);
    }
  }

  // create sprites or sprite-sequences per action (stand, jump, ...)
  createActionSprites() {
    return {
      stand: {
        l: this.p('l-stand.png'),
        r: this.p('r-stand.png'),
      },
      jump: {
        l: this.p('l-jump.png'),
        r: this.p('r-jump.png'),
      },
      brake: {
        l: this.p('l-brake.png'),
        r: this.p('r-brake.png'),
      },
      walk: {
        l: [this.p('l-1.png'), this.p('l-2.png'), this.p('l-3.png')],
        r: [this.p('r-1.png'), this.p('r-2.png'), this.p('r-3.png')],
      },
      fall: this.p('fall.png'),
    };
  }
}
