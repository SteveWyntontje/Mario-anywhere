// when we get more, import from different files
const playerSprites = [
  '/mario/r-stand.png',
  '/mario/r-1.png',
  '/mario/r-2.png',
  '/mario/r-3.png',
  '/mario/r-jump.png',
  '/mario/r-brake.png',
  '/mario/l-stand.png',
  '/mario/l-1.png',
  '/mario/l-2.png',
  '/mario/l-3.png',
  '/mario/l-jump.png',
  '/mario/l-brake.png',
  '/mario/fall.png',
];

const spriteImages = [...playerSprites];

const SPRITES = {
  stand: {
    l: '/mario/l-stand.png',
    r: '/mario/r-stand.png',
  },
  jump: {
    l: '/mario/l-jump.png',
    r: '/mario/r-jump.png',
  },
  brake: {
    l: '/mario/l-brake.png',
    r: '/mario/r-brake.png',
  },
  walk: {
    // l: ['/mario/l-1.png', '/mario/l-2.png', '/mario/l-3.png', '/mario/l-2.png'],
    l: ['/mario/l-1.png', '/mario/l-2.png', '/mario/l-3.png'],
    // r: ['/mario/r-1.png', '/mario/r-2.png', '/mario/r-3.png', '/mario/r-2.png'],
    r: ['/mario/r-1.png', '/mario/r-2.png', '/mario/r-3.png'],
  },
  fall: '/mario/fall.png',
};

export { spriteImages, SPRITES };
