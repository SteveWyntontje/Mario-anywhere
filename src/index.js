import { initPlatformRevealer } from './platformRevealer.js';
import { Player } from './Player.js';
import { spriteImages } from './sprites/index.js';
import { initWebsiteView } from './websiteView.js';

let Bodies;
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

const shapeOpacity = 0;

// player vars
let player;

const elmsUsedForBodies = [];

const createAliases = () => {
  ({ Bodies, Composite, Engine, Render, Runner } = Matter);
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

const createWallsAndGround = () => {
  const t = 60; // thickness
  const options = {
    isStatic: true,
    render: {
      opacity: shapeOpacity,
    },
  };
  const groundOptions = {
    ...options,
    render: {
      fillStyle: 'black',
      opacity: 1,
    },
  };
  const ground = Bodies.rectangle(canvasW / 2, canvasH + 25, canvasW, t, groundOptions);
  const ceiling = Bodies.rectangle(canvasW / 2, 0 - t / 2, canvasW, t, options);
  const leftWall = Bodies.rectangle(0 - t / 2, canvasH / 2, t, canvasH, options);
  const rightWall = Bodies.rectangle(canvasW + t / 2, canvasH / 2, t, canvasH, options);

  return [ground, ceiling, leftWall, rightWall];
};

// try to get corrections to fit box snuggly around text
// get correction for height of ascenders
// so we can make player walk on top of lowercase letters
const getTypeCorrections = (elm, styles) => {
  // corrections map with correction factors per font, per character group
  const correctionMaps = {
    // default is same as arial - that's what chrome appears to use
    default: {
      regular: {
        top: 16 / 53,
        height: -26 / 53,
      },
      asc: {
        top: 8 / 53,
        height: -18 / 53,
      },
      desc: {
        top: 16 / 53,
        height: -16 / 53,
      },
    },
    helveticaneue: {
      regular: {
        top: 8 / 48,
        height: -22 / 48,
      },
      asc: {
        top: 0,
        height: -14 / 48,
      },
      desc: {
        top: 8 / 48,
        height: -13 / 48,
      },
    },
  };
  // char group can be asc (ascender), desc (descender), regular
  const charGroup = elm.getAttribute('data-ee-char-group') || 'regular';
  // console.log('charGroup:', charGroup);

  // find corrections map, based on font
  const firstFont = styles['font-family']?.split(',')[0] || '';
  const fontName = firstFont.toLowerCase();
  // const correctionFactor = correctionMaps[fontName] || correctionMaps.default;
  const correctionsMap = correctionMaps[fontName] || correctionMaps.default;
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
};

const createBodyForElm = (elm) => {
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
      opacity: shapeOpacity,
    },
    label: 'platform',
  };

  // get pos relative to viewport
  const { width, height, top, left } = elm.getBoundingClientRect();
  let topCorrection = 0;
  let heightCorrection = 0;
  if (elm.tagName === 'SPAN') {
    const corrections = getTypeCorrections(elm, styles);
    topCorrection = corrections.topCorrection;
    heightCorrection = corrections.heightCorrection;
  }
  const correctedTop = top + topCorrection;
  const correctedHeight = height + heightCorrection;
  const x = left + width / 2;
  const y = correctedTop + correctedHeight / 2;

  const body = Bodies.rectangle(x, y, width, correctedHeight, options);

  elmsUsedForBodies.push(elm);

  return body;
};

// divide text content of a span up into spans for ascenders, descenders etc
const createCharacterGroupSpans = (parentSpan) => {
  // these spans will always only include a text node
  const textNode = parentSpan.childNodes[0];
  const text = textNode.nodeValue;
  const asc = '[A-Zbdfhklt]+'; // matching list for ascenders
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
};

// wrap span around text node; later, also check here if we need to add a spans for each character within this span
const wrapTextNodeWithSpan = (textNode) => {
  const span = document.createElement('span');
  span.textContent = textNode.nodeValue;
  textNode.replaceWith(span);
  return span;
};

// recursively call child nodes of elm, wrap them with span; return spans array
const wrapElmTextNodesWithSpans = (elm, elmSpans) => {
  elm.childNodes.forEach((childNode) => {
    const nodeType = childNode.nodeType;
    if (nodeType === 3) {
      // it's a text node
      const span = wrapTextNodeWithSpan(childNode);
      elmSpans.push(span);
    } else if (nodeType === 1) {
      // element node
      wrapElmTextNodesWithSpans(childNode, elmSpans);
    }
  });
};

// replace all the text nodes in elements matched by selector by span with text
// and return all the spans
const createSpansForTextNodes = (selectors) => {
  const spans = [];
  selectors.forEach((selector) => {
    const elms = document.querySelectorAll(selector);
    elms.forEach((elm) => {
      // when elm is matched by multiple selectors,
      // make sure we only create bodies for it once
      if (elmsUsedForBodies.includes(elm)) {
        return;
      }
      wrapElmTextNodesWithSpans(elm, spans);
    });
  });
  return spans;
};

const createBodiesForHtmlElements = () => {
  const selectors = {
    textLevel: ['h1', 'h2'],
    elementLevel: ['button', '.o-card--balloon', 'p', 'a', 'th', 'td'],
  };
  const bodies = [];

  // create spans for elements we want to use at text level
  const textLevelSpans = createSpansForTextNodes(selectors.textLevel, true);
  textLevelSpans.forEach((span) => {
    // check of the font-size is big enough to want to take height of
    // capitals, ascenders and descenders into account
    const fontSize = parseFloat(getComputedStyle(span).fontSize);
    const fontSizeThreshold = 24; // above this, adjust heights
    if (fontSize >= fontSizeThreshold) {
      const characterGroupSpans = createCharacterGroupSpans(span);
      characterGroupSpans.forEach((charGroupSpan) => {
        bodies.push(createBodyForElm(charGroupSpan));
      });
    } else {
      bodies.push(createBodyForElm(span));
    }
  });

  selectors.elementLevel.forEach((selector) => {
    console.log('selector:', selector);
    const elms = document.querySelectorAll(selector);
    elms.forEach((elm) => {
      const childNodes = elm.childNodes;
      if (childNodes.length === 1 && childNodes[0].nodeType === 3) {
        // If we don't want block-level text elements, because
        // their bounding box is wider than the actual text.
        // Could also be that we have a flex-item that is too high
        // Insert span so we have inline element to bounce off
        const span = wrapTextNodeWithSpan(childNodes[0]);
        bodies.push(createBodyForElm(span));
      } else {
        bodies.push(createBodyForElm(elm));
      }
    });
  });

  return bodies;
};

const initWorld = () => {
  const wallsAndGround = createWallsAndGround();
  const elms = createBodiesForHtmlElements();
  player = new Player(engine, render).playerBody;

  const allBodies = [...wallsAndGround, ...elms, player];
  Composite.add(engine.world, allBodies);
};

const preloadSprites = () => {
  // put sprites into hidden div to make sure they're loaded
  const id = 'sprite-preloader';
  if (!document.getElementById(id)) {
    const holder = document.createElement('div');
    holder.id = id;
    holder.style.display = 'none';
    spriteImages.forEach((imgPath) => {
      const img = document.createElement('img');
      img.src = imgPath;
      holder.appendChild(img);
    });
    document.body.appendChild(holder);
  }
};

// make sure body has full height (to cover cases where it has been set to 100%, but content is higher)
const setBodyHeight = () => {
  const htmlElm = document.body.parentNode;
  htmlElm.style.minHeight = '100%';
  htmlElm.style.height = 'auto';
  document.body.style.minHeight = '100%';
  document.body.style.height = 'auto';
};

const initCanvas = () => {
  setBodyHeight();
  canvasW = document.body.offsetWidth;
  canvasH = document.body.offsetHeight;
  canvasContainer = document.createElement('div');
  canvasContainer.id = containerId;
  document.body.appendChild(canvasContainer);
  const styles = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    width: 0,
    zIndex: 1000,
  };
  for (const s in styles) {
    canvasContainer.style[s] = styles[s];
  }
};

const initGame = () => {
  initCanvas();
  engine = Engine.create();
  preloadSprites();
  initRender();
  initWorld();

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
  loadMatter()
    .then(() => {
      createAliases();
      initGame();
      addEventListeners();
      initPlatformRevealer(render);
      initWebsiteView(engine, player);
    })
    .catch((err) => {
      // eslint-disable-next-line
      console.log('can not load', err);
    });
};

console.clear();
init();
