class PageWorld {
  shapeOpacity = 0;
  elmsUsedForBodies = [];
  typeCorrectionsMaps = null;
  bodyObjAttr = 'data-mario-has-body-obj';
  fontSizeThreshold = 36;// above this size, create separate spans for capitals, ascenders and descenders
  bodies = [];// will contain all bodies

  constructor(options) {
    this.Matter = options.Matter;
    this.canvasW = options.canvasW;
    this.canvasH = options.canvasH;
  }

  createWallsAndGround() {
    const options = {
      isStatic: true,
      render: {
        opacity: this.shapeOpacity,
      },
    };
    const groundOptions = {
      ...options,
      render: {
        fillStyle: '#c84c0c',
        opacity: 1,
      },
    };
    
    const t = 60; // thickness
    const playerH = 32; // size of player sprite
    // canvasH is exact height of document, but we want to add the height of player
    // so player can just jump out of window top
    const horCenter = this.canvasW / 2;
    const visibleBottomHeight = 10;
    const ceilingTop = 0 - playerH - t;
    const ceilingCenterV = ceilingTop + 0.5 * t;
    const groundTop = this.canvasH - visibleBottomHeight;
    const groundCenterV = groundTop + 0.5 * t;
    const wallH = Math.abs(ceilingTop) + groundTop + t;
    const wallCenterV = ceilingTop + 0.5 * wallH;
    const leftWallCenterH = 0 - 0.5 * t;
    const rightWallCenterH = this.canvasW + 0.5 * t;


    // ceiling don't make it possible to jump completely out of window
    const ceiling = this.Matter.Bodies.rectangle(horCenter, ceilingCenterV, this.canvasW, t, options);
    const ground = this.Matter.Bodies.rectangle(horCenter, groundCenterV, this.canvasW, t, groundOptions);
    const leftWall = this.Matter.Bodies.rectangle(leftWallCenterH, wallCenterV, t, wallH, options);
    const rightWall = this.Matter.Bodies.rectangle(rightWallCenterH, wallCenterV, t, wallH, options);
    
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
      if (nodeType === Node.TEXT_NODE) {
        const hasOnlyWhiteSpace = Boolean(!childNode.nodeValue.match(/\S/));
        if (hasOnlyWhiteSpace) {
          return;
        }
        const span = this.wrapTextNodeWithSpan(childNode);
        elmSpans.push(span);
      } else if (nodeType === Node.ELEMENT_NODE) {
        if (this.elmHasBodyObj(childNode)) {
          return;
        }
        this.wrapElmTextNodesWithSpans(childNode, elmSpans);
      }
    });
  }
 
  // replace all the text nodes in elements matched by selector by span with text
  // and return all the spans
  createSpansForTextNodes(selector) {
    const spans = [];
    const elms = document.querySelectorAll(selector);
    elms.forEach((elm) => {
      // when elm is matched by multiple selectors,
      // make sure we only create bodies for it once
      if (this.elmHasBodyObj(elm)) {
        return;
      }
      this.wrapElmTextNodesWithSpans(elm, spans);
      // this.addBodyAttr(elm);
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
      span.setAttribute('data-mario-char-group', 'regular');
      span.textContent = word + ' ';
      return span;
    });
    textNode.replaceWith(...spans);
    return spans;
  }

  createLineSpan(currLineText) {
    const span = document.createElement('span');
    span.setAttribute('data-mario-line-group', '');
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
    const useOnlyCapsNoAsc = true;
    let asc = '[A-Zbdfhklt\']+'; // matching list for ascenders
    const desc = '[gjpqy]+'; // matching list for descenders
    let exclAscDesc = '[^A-Z^b^d^f^h^k^l^t^g^j^p^q^y]+'; // matching list for excluding ascenders and descenders
    if (useOnlyCapsNoAsc) {
      asc = '[A-Z]+'; // matching list for just capitals
      exclAscDesc = '[^A-Z^g^j^p^q^y]+'; // matching list for excluding capitals and descenders
    }
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
      span.setAttribute('data-mario-char-group', charGroup);
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
    const charGroup = elm.getAttribute('data-mario-char-group') || 'regular';

    // find corrections map, based on font
    const firstFont = styles['font-family']?.split(',')[0] || '';
    const fontName = firstFont.toLowerCase();
    const correctionsMap = this.typeCorrectionsMaps[fontName] || this.typeCorrectionsMaps.default;
    // get correction factors for current character group
    const correctionFactors = correctionsMap[charGroup];

    const fontSize = parseFloat(styles['font-size']);
    // line-height doesn't seem to affect the excess areas at top and bottom
    const top = fontSize * correctionFactors.top;
    const height = fontSize * correctionFactors.height;

    return {
      top,
      height,
    };
  }

  // get a single chamfer correction
  getChamferCorrection(size, radius) {
    const displacementBase = 76 * size / 1000;
    const fraction = size / radius;
    // calculate to what power 2 should be raised to result in fraction
    const power = Math.log2(fraction);
    // const displacement = Math.round(displacementBase / 3.5 ** power);
    const displacement = Math.round(displacementBase / 3.5 ** power);

    return displacement;
  }

  // when radius !== 0, using chamfer positions body slightly off.
  // get proper correction based on radii, width, height
  getTotalChamferCorrection(width, height, radii) {
    /*
    when elm = 1000*1000 px, and border-top-left-radius is 1000px,
    offset (dx, dy) to the top and left is 76px;
    this applies when there is only one rounded corner.
    so for cases where 1 border-radius is 100%:
    dx = 76 * width/1000
    then when r becomes 50% smaller, dx becomes 3.5x smaller
    so, when r becomes r / 2**n, dx becomes 3.5**n smaller
    */
    // calculate baseDisplacement
    // loop over four values of radii
    const dxs = [];
    const dys = [];
    for (const radius of radii) {
      dxs.push(this.getChamferCorrection(width, radius))
      dys.push(this.getChamferCorrection(height, radius))
    }
    // when elm has multiple rounded corners, the displacements they would get for
    // a single corner are added up - it's not completely accurate, but good enough
    // offsets for top and left are < 0, so those corrections are > 0
    // for bottom and right it's the opposite
    const dx = dxs[0] - dxs[1] - dxs[2] + dxs[3];
    const dy = dys[0] + dys[1] - dys[2] - dys[3];
  
   return { dx, dy};
  }

  createBodyForElm(elm) {
    const styles = getComputedStyle(elm);
    const radiusInPx = [
      styles['border-top-left-radius'],
      styles['border-top-right-radius'],
      styles['border-bottom-right-radius'],
      styles['border-bottom-left-radius'],
    ];
    const radii = radiusInPx.map((r) => parseInt(r, 10));
    const chamfer = {
      radius: radii,
    };

    const options = {
      isStatic: true,
      chamfer,
      render: {
        fillStyle: 'green',
        opacity: this.shapeOpacity,
      },
      label: 'platform',
    };

    // get pos relative to viewport
    const { width, height, top, left } = elm.getBoundingClientRect();
    let typeCorrectionTop = 0;
    let typeCorrectionHeight = 0;

    // get chamfer correction when elm has a border radius
    let chamferCorrection = { dx: 0, dy: 0 };
    if (radii.join(',') !== '0,0,0,0') {
      chamferCorrection = this.getTotalChamferCorrection(width, height, radii);
    }

    // get type corrections for spans
    if (elm.tagName === 'SPAN') {
      const typeCorrections = this.getTypeCorrections(elm, styles);
      typeCorrectionTop = typeCorrections.top;
      typeCorrectionHeight = typeCorrections.height;
    }
    const correctedTop = top + typeCorrectionTop;
    const correctedHeight = height + typeCorrectionHeight;
    const x = left + width / 2 + chamferCorrection.dx;
    const y = correctedTop + correctedHeight / 2 + chamferCorrection.dy;

    
    const body = this.Matter.Bodies.rectangle(x, y, width, correctedHeight, options);

    this.addBodyAttr(elm);

    return body;
  }

  // check if element already has a body object created for it
  // or has an ancestor with a body object
  elmHasBodyObj(elm) {
    const selector = `[${this.bodyObjAttr}]`;
    return Boolean(elm.hasAttribute(this.bodyObjAttr) || elm.closest(selector) || elm.hasAttribute('data-mario-ignore') || elm.closest('[data-mario-ignore]'));
  }

  addBodyAttr(elm) {
    elm.setAttribute(this.bodyObjAttr, '');
  }

  addTextLevelBodies(selectors) {
    const textLevelSpans = this.createSpansForTextNodes(selectors);
    textLevelSpans.forEach((span) => {
      // check of the font-size is big enough to want to take height of
      // capitals, ascenders and descenders into account
      const fontSize = parseFloat(getComputedStyle(span).fontSize);
      if (fontSize >= this.fontSizeThreshold) {
        const characterGroupSpans = this.createCharacterGroupSpans(span);
        characterGroupSpans.forEach((charGroupSpan) => {
          this.bodies.push(this.createBodyForElm(charGroupSpan));
        });
      } else {
        const lineSpans = this.createLineSpans(span);
        lineSpans.forEach((lineSpan) => {
          this.bodies.push(this.createBodyForElm(lineSpan));
        });
      }
    });
    return textLevelSpans;
  }

  // check if elm has a parent with a border radius and overflow hidden
  checkParentWithBorderRadius(elm, originalElm) {
    originalElm = originalElm || elm;
    let elmToUse = originalElm;
    const parent = elm.parentNode;
    const thresholdRadius = 50; // under this value, offset of wrongly positioned body is so small that we don't have to do correction

    if (parent.offsetWidth <= elm.offsetWidth || parent.offsetHeight <= elm.offsetHeight) {
      const styles = getComputedStyle(parent);
      if (styles.overflow === 'hidden') {
        const radiusStr = styles.borderRadius;
        const radii = radiusStr.split(' ');
        let hasRadius = false;
        for (const radius of radii) {
          if (parseInt(radius) >= thresholdRadius) {
            hasRadius = true;
            break;
          }
        }
        if (hasRadius) {
          elmToUse = parent;
        }
      }
      // if haven't found a parent with border-radius continue
      if (elmToUse === originalElm && parent !== document.body) {
        elmToUse = this.checkParentWithBorderRadius(parent, originalElm);
      }
    }
    return elmToUse;
  }

  // create bodies for elements
  addBodiesForElements(elms) {
    elms.forEach((elm) => {
      // when elm is matched by multiple selectors,
      // make sure we only create bodies for it once
      if (this.elmHasBodyObj(elm)) {
        return;
      }
      let elmToUse = elm;
      if (elm.tagName === 'IMG') {
        elmToUse = this.checkParentWithBorderRadius(elm);
      }
      this.bodies.push(this.createBodyForElm(elmToUse));
    });
  }

  // create bodies for elements that need to be treated as a solid block
  // no corrections for actual text width etc
  addBlockLevelBodies(selector) {
    const elms = document.querySelectorAll(selector);
    this.addBodiesForElements(elms);
  }

  getBorderWidth(styles, prop) {
    // value looks like 1px solid rgb(...) (always in px);
    // unless prop is 'border' and not all borders are identical, then its ''
    const borderStr = styles[prop];
    if (borderStr === '') {
      return 1;// make it return anything but zero, so we'll continue to parse props
    }
    return parseInt(styles[prop].split(' ')[0], 10);
  }

  addElementsWithBorder(elmsWithBorder, nodes) {
    nodes.forEach(node => {
      // if node isn't element, or already has body obj, stop
      if (node.nodeType !== Node.ELEMENT_NODE || this.elmHasBodyObj(node)) {
        return;
      }
      const elm = node;
      const styles = getComputedStyle(elm);
      let hasFullBorder = true;
      const borderProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
      for (const prop of borderProps) {
        if (this.getBorderWidth(styles, prop) === 0) {
          // side has no border, so no full border for element
          hasFullBorder = false;
          break;
        };
      }

      if (hasFullBorder) {
        elmsWithBorder.push(elm);
      } else {
        this.addElementsWithBorder(elmsWithBorder, elm.childNodes);
      };
    })
  }

  // add elements that have a border all around
  addBorderedBodies() {
    const elmsWithBorder = [];
    this.addElementsWithBorder(elmsWithBorder, document.body.childNodes);
    // console.log('elmsWithBorder:', elmsWithBorder);
    this.addBodiesForElements(elmsWithBorder);
  }

  createBodiesForHtmlElements() {
    // selector that define elements to be treated as a solid block
    const blockLevelSelector = '.block-level, audio, button, canvas, embed, iframe, image, img, input, object, picture, progress, select, svg, textarea, video';
    // define selector for elms where we don't want to dig down further
    // we'll only create spans per line there
    // const textLevelSelector = 'h1, h2, h3, h4, h5, h6, p, label';
    this.typeCorrectionsMaps = new TypeCorrectionsMaps();
    this.addBorderedBodies();
    this.addBlockLevelBodies(blockLevelSelector);
    this.addTextLevelBodies('body');
    return this.bodies;
  }

}
