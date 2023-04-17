/* eslint-disable */
// couple page scrolling behavior to player
class PageScrollCoupling {
  constructor(Matter, engine, player) {
    const optimalYMin = 0.25 * window.innerHeight;
    const optimalYMax = 0.75 * window.innerHeight;

    Matter.Events.on(engine, 'afterUpdate', () => {
      const currScrollY = window.scrollY;
      const playerY = player.position.y;
      if (playerY - currScrollY < optimalYMin) {
        const scrollY = player.position.y - optimalYMin;
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      } else if (playerY - currScrollY > optimalYMax) {
        const scrollY = player.position.y - optimalYMax;
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    });
  }
}

class PageWorld {
  shapeOpacity = 0;
  elmsUsedForBodies = [];
  typeCorrectionsMaps = null;

  constructor(options) {
    this.Matter = options.Matter;
    this.canvasW = options.canvasW;
    this.canvasH = options.canvasH;
  }

  createWallsAndGround() {
    const t = 60; // thickness
    const options = {
      isStatic: true,
      render: {
        opacity: this.shapeOpacity,
      },
    };
    const groundOptions = {
      ...options,
      render: {
        fillStyle: 'black',
        opacity: 1,
      },
    };
    const ground = this.Matter.Bodies.rectangle(this.canvasW / 2, this.canvasH + 25, this.canvasW, t, groundOptions);
    const ceiling = this.Matter.Bodies.rectangle(this.canvasW / 2, 0 - t / 2, this.canvasW, t, options);
    const leftWall = this.Matter.Bodies.rectangle(0 - t / 2, this.canvasH / 2, t, this.canvasH, options);
    const rightWall = this.Matter.Bodies.rectangle(this.canvasW + t / 2, this.canvasH / 2, t, this.canvasH, options);

    return [ground, ceiling, leftWall, rightWall];
  }

  // wrap span around text node; later, also check here if we need to add a spans for each character within this span
  wrapTextNodeWithSpan(textNode) {
    const span = document.createElement('span');
    span.textContent = textNode.nodeValue;
    textNode.replaceWith(span);
    return span;
  }

  // recursively call child nodes of elm, wrap them with span; return spans array
  wrapElmTextNodesWithSpans(elm, elmSpans) {
    elm.childNodes.forEach((childNode) => {
      const nodeType = childNode.nodeType;
      if (nodeType === 3) {
        // it's a text node
        const span = this.wrapTextNodeWithSpan(childNode);
        elmSpans.push(span);
      } else if (nodeType === 1) {
        // element node
        this.wrapElmTextNodesWithSpans(childNode, elmSpans);
      }
    });
  }

  // replace all the text nodes in elements matched by selector by span with text
  // and return all the spans
  createSpansForTextNodes(selectors) {
    const spans = [];
    selectors.forEach((selector) => {
      const elms = document.querySelectorAll(selector);
      elms.forEach((elm) => {
        // when elm is matched by multiple selectors,
        // make sure we only create bodies for it once
        if (this.elmsUsedForBodies.includes(elm)) {
          return;
        }
        this.wrapElmTextNodesWithSpans(elm, spans);
      });
    });
    return spans;
  }

  // divide text content of a span into spans per word
  createWordSpans(parentSpan) {
    // these spans will always include only one text node
    const textNode = parentSpan.childNodes[0];
    const text = textNode.nodeValue;
    const words = text.split(' ');
    const spans = words.map(word => {
      const span = document.createElement('span');
      span.setAttribute('data-ee-char-group', 'regular');
      span.textContent = word + ' ';
      return span;
    });
    textNode.replaceWith(...spans);
    return spans;
  }

  createLineSpan(currLineText) {
    const span = document.createElement('span');
    span.setAttribute('data-ee-line-group', '');
    span.textContent = currLineText;
    return span;
  }

  // create a span per line of text
  // this is better because player then moves more smoothly
  // and we use less spans in total
  createLineSpans(parentSpan) {
    const wordSpans = this.createWordSpans(parentSpan);
    const lineSpans = [];
    let currLineText = '';
    let lastTop = null;
    wordSpans.forEach(wordSpan => {
      const top = wordSpan.offsetTop;
      if (top === lastTop) {
        // still on the same line
        currLineText += wordSpan.textContent
      } else {
        if (currLineText) {
          const span = this.createLineSpan(currLineText);
          lineSpans.push(span);
        }
        currLineText = wordSpan.textContent;
        lastTop = top;
      }
    });
    const span = this.createLineSpan(currLineText);
    lineSpans.push(span);
    parentSpan.replaceChildren(...lineSpans);
    return lineSpans;
  }

  // divide text content of a span up into spans for ascenders, descenders etc
  createCharacterGroupSpans(parentSpan) {
    // these spans will always include only one text node
    const textNode = parentSpan.childNodes[0];
    const text = textNode.nodeValue;
    const asc = '[A-Zbdfhklt\']+'; // matching list for ascenders
    const desc = '[gjpqy]+'; // matching list for descenders
    const exclAscDesc = '[^A-Z^b^d^f^h^k^l^t^g^j^p^q^y]+'; // matching list for excluding ascenders and descenders
    const regex = new RegExp(`(${asc})|(${desc})|(${exclAscDesc})`, 'g');
    const matches = text.match(regex);

    // match individual parts to type of match
    const ascRegex = new RegExp(asc);
    const descRegex = new RegExp(desc);
    const spans = matches.map((text) => {
      let charGroup = 'regular';
      if (text.match(ascRegex)) {
        charGroup = 'asc';
      } else if (text.match(descRegex)) {
        charGroup = 'desc';
      }
      const span = document.createElement('span');
      span.setAttribute('data-ee-char-group', charGroup);
      span.textContent = text;
      return span;
    });
    textNode.replaceWith(...spans);
    return spans;
  }

  // try to get corrections to fit box snuggly around text
  // get correction for height of ascenders
  // so we can make player walk on top of lowercase letters
  getTypeCorrections(elm, styles) {
    // use corrections map with correction factors per font, per character group
    // char group can be asc (ascender), desc (descender), regular
    const charGroup = elm.getAttribute('data-ee-char-group') || 'regular';

    // find corrections map, based on font
    const firstFont = styles['font-family']?.split(',')[0] || '';
    const fontName = firstFont.toLowerCase();
    const correctionsMap = this.typeCorrectionsMaps[fontName] || this.typeCorrectionsMaps.default;
    // get correction factors for current character group
    const correctionFactors = correctionsMap[charGroup];

    const fontSize = parseFloat(styles['font-size']);
    // line-height doesn't seem to affect the excess areas at top and bottom
    const topCorrection = fontSize * correctionFactors.top;
    const heightCorrection = fontSize * correctionFactors.height;

    return {
      topCorrection,
      heightCorrection,
    };
  }

  createBodyForElm(elm) {
    const styles = getComputedStyle(elm);
    const radiusInPx = [
      styles['border-top-left-radius'],
      styles['border-top-right-radius'],
      styles['border-bottom-right-radius'],
      styles['border-bottom-left-radius'],
    ];
    const radius = radiusInPx.map((r) => parseFloat(r));
    const chamfer = {
      radius,
    };

    const options = {
      isStatic: true,
      chamfer,
      render: {
        fillStyle: 'red',
        opacity: this.shapeOpacity,
      },
      label: 'platform',
    };

    // get pos relative to viewport
    const { width, height, top, left } = elm.getBoundingClientRect();
    let topCorrection = 0;
    let heightCorrection = 0;
    if (elm.tagName === 'SPAN') {
      const corrections = this.getTypeCorrections(elm, styles);
      topCorrection = corrections.topCorrection;
      heightCorrection = corrections.heightCorrection;
    }
    const correctedTop = top + topCorrection;
    const correctedHeight = height + heightCorrection;
    const x = left + width / 2;
    const y = correctedTop + correctedHeight / 2;

    const body = this.Matter.Bodies.rectangle(x, y, width, correctedHeight, options);

    this.elmsUsedForBodies.push(elm);

    return body;
  }

  addTextLevelBodies(bodies, selectors) {
    const textLevelSpans = this.createSpansForTextNodes(selectors);
    textLevelSpans.forEach((span) => {
      // check of the font-size is big enough to want to take height of
      // capitals, ascenders and descenders into account
      const fontSize = parseFloat(getComputedStyle(span).fontSize);
      const fontSizeThreshold = 24; // above this, adjust heights
      if (fontSize >= fontSizeThreshold) {
        const characterGroupSpans = this.createCharacterGroupSpans(span);
        characterGroupSpans.forEach((charGroupSpan) => {
          bodies.push(this.createBodyForElm(charGroupSpan));
        });
      } else {
        const lineSpans = this.createLineSpans(span);
        lineSpans.forEach((lineSpan) => {
          bodies.push(this.createBodyForElm(lineSpan));
        });
      }
    });
    return textLevelSpans;
  }

  addElementLevelBodies(bodies, selectors) {
    // possible optimization: handle element-level selectors first
    // and then check if text-level selectors don't fall within element-level
    selectors.forEach((selector) => {
      // console.log('selector:', selector);
      const elms = document.querySelectorAll(selector);
      elms.forEach((elm) => {
        const childNodes = elm.childNodes;
        if (childNodes.length === 1 && childNodes[0].nodeType === 3) {
          // If we don't want block-level text elements, because
          // their bounding box is wider than the actual text.
          // Could also be that we have a flex-item that is too high
          // Insert span so we have inline element to bounce off
          const span = this.wrapTextNodeWithSpan(childNodes[0]);
          bodies.push(this.createBodyForElm(span));
        } else {
          bodies.push(this.createBodyForElm(elm));
        }
      });
    });
  }

  createBodiesForHtmlElements() {
    const selectors = {
      textLevel: ['h1', 'h2', 'h3', 'h4', 'p'],
      elementLevel: ['button', '.o-card--balloon', 'a', 'th', 'td', 'input', 'label', 'img', '.elm-level'],
    };
    const bodies = [];
    this.typeCorrectionsMaps = new TypeCorrectionsMaps();

    this.addTextLevelBodies(bodies, selectors.textLevel);
    this.addElementLevelBodies(bodies, selectors.elementLevel);

    return bodies;
  }
}

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

/* eslint-disable */
const STATE = {
  stand: 'stand',
  jump: 'jump',
  walk: 'walk',
  fall: 'fall',
  brake: 'brake',
};
class Player {
  isInTheAir = true;
  playerBody = null;
  playerSpriteBody = null;
  lastDir = 1;
  walkCycleIdx = 0;
  walkUpdateIdx = 0;
  walkUpdateEveryNth = 5;
  accelerationX = 0.25;
  maxSpeedX = 5;
  totalJumpForce = 0;
  maxJumpForce = 0.045; // will be set to negative in applyForceUp, but jump force is easier to reason about when it's all positive
  keyLeftIsDown = false;
  keyRightIsDown = false;
  keySpaceIsDown = false;
  keySpaceWasUpAfterJumpStart = false;

  constructor(engine, render, SPRITES) {
    this.engine = engine;
    this.render = render;
    this.walkCycleLength = SPRITES.walk.l.length;
    this.SPRITES = SPRITES;
    this.createBody();
    this.initCollisionDetection();
    this.initKeyboardControls();
    Matter.Events.on(engine, 'afterUpdate', () => {
      this.updateHandler();
    });
  }

  createPlayerSpriteBody(x, y, size) {
    const options = {
      label: 'playerShape',
      render: {
        sprite: {
          texture: this.SPRITES.stand.r,
          xScale: 1,
          yScale: 1,
        },
      },
    };
    const playerShape = Matter.Bodies.rectangle(x, y, size, size, options);
    return playerShape;
  }

  createFloorSensorBody(x, y, size) {
    // create floor sensor so we can distinguish between player standing on top
    // of something and just colliding with another shape
    const sensorW = size -4;
    const sensorH = 10;
    const sensorOptions = {
      label: 'floorSensor',
      render: {fillStyle: 'transparent' },
    };
    const floorSensorBody = Matter.Bodies.rectangle(x, y + size/2 - sensorH/2, sensorW, sensorH, sensorOptions);
    return floorSensorBody;
  }

  createBody() {
    const size = 32; // size of player sprite
    const x = this.render.options.width / 2 - 250;
    const y = size / 2 + 1; // ceiling ends at 0; put top of player at y=1
    this.playerSpriteBody = this.createPlayerSpriteBody(x, y, size);
    const floorSensorBody = this.createFloorSensorBody(x, y, size);

    this.playerBody = Matter.Body.create({
      label: 'player',
      parts: [this.playerSpriteBody, floorSensorBody],
      restitution: 0,
      friction: 0,
      frictionAir: 0, // frictionAir doesn't work so good for slowing down - better do set deceleration ourselves
      inertia: Infinity,
      mass: 1,
    })
    // console.log('this.playerBody:', this.playerBody);
  }

  // when activeCollision is happening, check if one of the collision pairs
  // is the player
  checkInTheAir(evt) {
    evt.pairs.forEach((pair) => {
      let ply;
      if (pair.bodyA.label === 'floorSensor') {
        ply = pair.bodyA;
      } else if (pair.bodyB.label === 'floorSensor') {
        ply = pair.bodyB;
      }
      if (ply) {
        // player is on the ground again
        this.removeActiveCollisionDetection();
        this.isInTheAir = false;
        // prevent any more force from being applied; otherwise, if you jump, keep
        // space down and hit a ceiling before maxForce is applied, force will still
        // be applied when player is already going down
        // totalJumpForce will be adjusted automatically at start of new jump
        this.totalJumpForce = this.maxJumpForce;
      }
    });
  }

  removeActiveCollisionDetection() {
    Matter.Events.off(this.engine, 'collisionActive');
  }

  addActiveCollisionDetection() {
    Matter.Events.on(this.engine, 'collisionActive', (evt) => {
      this.checkInTheAir(evt);
    });
  }

  initCollisionDetection() {
    this.addActiveCollisionDetection();
    Matter.Events.on(this.engine, 'collisionEnd', () => {
      this.isInTheAir = true;
      this.addActiveCollisionDetection();
    });
  }

  getXSpeed() {
    return Matter.Body.getVelocity(this.playerBody).x;
  }

  // set only x-vector of velocity vector; leave y-vector as is
  setXSpeed(xSpeed) {
    const ySpeed = Matter.Body.getVelocity(this.playerBody).y;
    Matter.Body.setVelocity(this.playerBody, { x: xSpeed, y: ySpeed });
  }

  applyForceUp(forceY) {
    const forceUp = -1 * forceY;
    const b = this.playerBody;
    Matter.Body.applyForce(b, { x: b.position.x, y: b.position.y }, { x: 0, y: forceUp });
  }

  jump() {
    // use collision
    // https://github.com/liabru/matter-js/issues/665

    if (!this.isInTheAir) {
      const forceY = 0.03; // will be made negative in applyForceUp
      this.applyForceUp(forceY);
      this.totalJumpForce = forceY;
      this.keySpaceWasUpAfterJumpStart = false;
    }
  }

  moveX(dir) {
    this.setXSpeed(10 * dir);
  }

  updateSpeedX() {
    let newSpeed = 0;
    const currSpeed = this.getXSpeed();

    if (this.keyLeftIsDown) {
      newSpeed = currSpeed - this.accelerationX;
      newSpeed = Math.max(newSpeed, -1 * this.maxSpeedX);
    } else if (this.keyRightIsDown) {
      newSpeed = currSpeed + this.accelerationX;
      newSpeed = Math.min(newSpeed, this.maxSpeedX);
    } else if (currSpeed < 0) {
      // no key pressed, slow down
      newSpeed = currSpeed + this.accelerationX;
      newSpeed = Math.min(newSpeed, 0);
    } else if (currSpeed > 0) {
      // no key pressed, slow down
      newSpeed = currSpeed - this.accelerationX;
      newSpeed = Math.max(newSpeed, 0);
    }

    this.setXSpeed(newSpeed);
    if (newSpeed !== 0) {
      // remember last direction for standing pose
      this.lastDir = newSpeed / Math.abs(newSpeed);
    }
  }

  updateForceY() {
    if (this.keySpaceIsDown && this.isInTheAir && !this.keySpaceWasUpAfterJumpStart) {
      // we need to check if key wasn't released after jump started,
      // otherwise you could re-apply force if max wasn't reached
      const applicableForceLeft = this.maxJumpForce - this.totalJumpForce;
      const forceIncrement = 0.0005;
      if (applicableForceLeft >= forceIncrement) {
        // using Math.min() led to problems with js inaccurate rounding
        // apply default extra force, unless less is left to reach max force
        // const forceIncrement = Math.min(0.001, applicableForceLeft);
        this.applyForceUp(forceIncrement);
        this.totalJumpForce += forceIncrement;
      }
    }
  }

  initKeyboardControls() {
    document.body.addEventListener('keydown', (evt) => {
      const keyCode = evt.code;
      switch (keyCode) {
        case 'Space':
          evt.preventDefault();
          this.keySpaceIsDown = true;
          this.jump();
          break;
        case 'ArrowLeft':
          this.keyLeftIsDown = true;
          break;
        case 'ArrowRight':
          this.keyRightIsDown = true;
          break;
      }
    });

    document.body.addEventListener('keyup', (evt) => {
      const keyCode = evt.code;
      switch (keyCode) {
        case 'Space':
          this.keySpaceIsDown = false;
          this.keySpaceWasUpAfterJumpStart = true;
          break;
        case 'ArrowLeft':
          this.keyLeftIsDown = false;
          break;
        case 'ArrowRight':
          this.keyRightIsDown = false;
          break;
      }
    });
  }

  getWalkTexture(xSpeed) {
    if (xSpeed > 0 && this.keyLeftIsDown) {
      return this.SPRITES.brake.l;
    } else if (xSpeed < 0 && this.keyRightIsDown) {
      return this.SPRITES.brake.r;
    }

    if (this.walkUpdateIdx === 0) {
      this.walkCycleIdx++;
      if (this.walkCycleIdx === this.walkCycleLength) {
        this.walkCycleIdx = 0;
      }
    }
    this.walkUpdateIdx++;
    if (this.walkUpdateIdx === this.walkUpdateEveryNth) {
      this.walkUpdateIdx = 0;
    }
    // xSpeed is never 0, because then we wouldn't be
    // within this function
    const dir = this.mapSpeedToLetter(xSpeed);
    return this.SPRITES.walk[dir][this.walkCycleIdx];
  }

  // map speed to direction letter for images
  mapSpeedToLetter(xSpeed) {
    return xSpeed < 0 ? 'l' : 'r';
  }

  setSprite(state, xSpeed) {
    const currTexture = this.playerSpriteBody.render.sprite.texture;
    let newTexture;
    const lastDirLetter = this.mapSpeedToLetter(this.lastDir);
    switch (state) {
      case STATE.stand:
        newTexture = this.SPRITES.stand[lastDirLetter];
        break;
      case STATE.jump:
        newTexture = this.SPRITES.jump[lastDirLetter];
        break;
      case STATE.fall:
        newTexture = this.SPRITES.fall;
        break;
      case STATE.walk:
        newTexture = this.getWalkTexture(xSpeed);
    }
    if (newTexture && newTexture !== currTexture) {
      this.playerSpriteBody.render.sprite.texture = newTexture;
    }
  }

  updateSprite() {
    const xSpeed = this.getXSpeed();
    if (this.isInTheAir) {
      this.setSprite(STATE.jump, xSpeed);
    } else if (xSpeed === 0) {
      this.setSprite(STATE.stand, xSpeed);
    } else {
      this.setSprite(STATE.walk, xSpeed);
    }
  }

  updateHandler() {
    this.updateSpeedX();
    this.updateForceY();
    this.updateSprite();
  }
}

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

class TypeCorrectionsMap {
  constructor(options) {
    const defaults = {
      totalHeight: 44, // total height of span
      ascTop: 8, // top of char with ascender
      ascHeight: 29, // height of char with ascender
      regularTop: 16, // top of regular char
      regularHeight: 21, // height of regular char
      descHeight: 29, // height of char with descender
      // no need for descenderTop, will be same as regularTop
    }
    const config = Object.assign(defaults, options);
    const regular = {
      top: config.regularTop / config.totalHeight,
      height: (config.regularHeight - config.totalHeight) / config.totalHeight,
    }
    const asc = {
      top: config.ascTop / config.totalHeight,
      height: (config.ascHeight  - config.totalHeight) / config.totalHeight,
    }
    const desc = {
      top: config.regularTop / config.totalHeight,
      height: (config.descHeight - config.totalHeight) / config.totalHeight,
    }

    return {
      regular,
      asc,
      desc,
    };
  }
}
class TypeCorrectionsMaps {
  configs = {
    default: null,
    helveticaneue: {
      totalHeight: 48, // total height of span
      ascTop: 0, // top of char with ascender
      ascHeight: 34, // height of char with ascender
      regularTop: 9, // top of regular char
      regularHeight: 25 , // height of regular char
      descHeight: 34, // height of char with descender
    }
  };

  constructor() {
    const typeCorrectionsMaps = {};
    for (const fontName in this.configs) {
      const fontConfig = this.configs[fontName];
      typeCorrectionsMaps[fontName] = new TypeCorrectionsMap(fontConfig);
    }
    return typeCorrectionsMaps;
  }
}
/* eslint-disable */
// import { PlatformRevealer } from './modules/PlatformRevealer.js';
// import { PageWorld } from './modules/PageWorld.js';
// import { Player } from './modules/Player.js';
// import { SpriteManager } from './modules/SpriteManager.js';
// import { PageScrollCoupling } from './modules/PageScrollCoupling.js';

let Composite;
let Engine;
let Render;
let Runner;

let engine;
let render;
let canvasContainer;
const containerId = 'mario-canvas-container';
let canvasW = 0;
let canvasH = 0;

// player vars
let player;

const createAliases = () => {
  ({ Composite, Engine, Render, Runner } = Matter);
};

const initRender = () => {
  render = Render.create({
    element: canvasContainer,
    engine,
    options: {
      width: canvasW,
      height: canvasH,
      wireframes: false,
      background: 'transparent',
    },
  });
  canvasContainer.querySelector('canvas').style.pointerEvents = 'none';
};

const initWorld = (SPRITES) => {
  const pageWorldOptions = {
    Matter,
    canvasW,
    canvasH,
  };
  const pageWorld = new PageWorld(pageWorldOptions);
  const wallsAndGround = pageWorld.createWallsAndGround();
  const elms = pageWorld.createBodiesForHtmlElements();

  player = new Player(engine, render, SPRITES).playerBody;

  const allBodies = [...wallsAndGround, ...elms, player];
  Composite.add(engine.world, allBodies);
};

// make sure body has full height (to cover cases where it has been set to 100%, but content is higher)
const setBodyHeight = () => {
  const htmlElm = document.body.parentNode;
  htmlElm.style.minHeight = '100%';
  htmlElm.style.height = 'auto';
  document.body.style.minHeight = '100dvh';
  document.body.style.height = 'auto';
};

// add css for making canvas display: block;
// otherwise giving it 100% height gives scrollbars
const setCanvasDisplay = () => {
  const styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  const styleSheet = styleEl.sheet;
  styleSheet.insertRule(`#${containerId} canvas { display: block; }`);
}

const addCanvasContainer = () => {
  canvasW = document.body.offsetWidth;
  canvasH = document.body.offsetHeight;
  canvasContainer = document.createElement('div');
  canvasContainer.id = containerId;
  const styles = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    width: 0,
    zIndex: 9999999999999999,
  };
  for (const s in styles) {
    canvasContainer.style[s] = styles[s];
  }
  document.body.appendChild(canvasContainer);
}

const initCanvas = () => {
  setBodyHeight();
  setCanvasDisplay();
  addCanvasContainer();
};

const initGame = (spriteBaseUrl) => {
  initCanvas();
  engine = Engine.create();
  const spriteManager = new SpriteManager(spriteBaseUrl);
  initRender();
  initWorld(spriteManager.SPRITES);

  const runner = Runner.create();
  Runner.run(runner, engine);

  Render.run(render);
};

const reset = () => {
  // remove Matter and canvas container from previous instance
  Matter = null;
  document.getElementById(containerId)?.remove();
  init();
};

// add event listeners for communication with app
const addEventListeners = () => {
  document.body.addEventListener('reset.easterEggGame', reset, { once: true });
};

const loadMatter = () => {
  const loadingPromise = new Promise((resolve, reject) => {
    const matterUrl = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
    const script = document.createElement('script');
    script.src = matterUrl;
    script.addEventListener('load', resolve);
    script.addEventListener('error', (err) => reject(err));
    document.body.appendChild(script);
  });
  return loadingPromise;
};

const init = () => {
  const spriteBaseUrl = 'https://jaron.nl/playground/mario-anywhere/sprites/';
  loadMatter()
    .then(() => {
      window.scrollTo({ top: 0, behavior: 'instant'});
      createAliases();
      initGame(spriteBaseUrl);
      addEventListeners();
      new PageScrollCoupling(Matter, engine, player);
      new PlatformRevealer(render);
    })
    .catch((err) => {
      // eslint-disable-next-line
      console.log('can not load', err);
    });
};

console.clear();
init();
