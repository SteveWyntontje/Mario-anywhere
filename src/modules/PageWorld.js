class PageWorld {
  shapeOpacity = 0;
  elmsUsedForBodies = [];
  typeCorrectionsMaps = null;
  bodyObjAttr = 'data-ee-has-body-obj';

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

  // check if element already has a body object created for it
  // or has an ancestor with a body object
  elmHasBodyObj(elm) {
    const selector = `[${this.bodyObjAttr}]`;
    if (elm.hasAttribute(this.bodyObjAttr)) {
      return true;
    } else {
      const closest = elm.closest(selector);
      if (closest) {
        console.log(closest);
        return true;
      }
    }
    // return Boolean(elm.hasAttribute(this.bodyObjAttr) || elm.closest(selector));
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

  // create bodies for elements that need to be treated as a solid block
  // no corrections for actual text width etc
  addBlockLevelBodies(bodies, selector) {
    const elms = document.querySelectorAll(selector);
    elms.forEach((elm) => {
      // when elm is matched by multiple selectors,
      // make sure we only create bodies for it once
      if (this.elmHasBodyObj(elm)) {
        return;
      }
      bodies.push(this.createBodyForElm(elm));
      elm.setAttribute(this.bodyObjAttr, '');
    });
  }

  addDeepestLevelBodies(bodies, selectors) {
    selectors.forEach((selector) => {
      // console.log('selector:', selector);
      const elms = document.querySelectorAll(selector);
      elms.forEach((elm) => {
        // when elm is matched by multiple selectors,
        // make sure we only create bodies for it once
        if (this.elmHasBodyObj(elm)) {
          return;
        }
        const childNodes = elm.childNodes;
        if (childNodes.length === 1 && childNodes[0].nodeType === 3) {
          // We don't want to use text-only block-level elements, like h1
          // their bounding box is wider than the actual text.
          // Could also be that we have a flex-item that is too high
          // Insert span so we have inline element to bounce off
          const span = this.wrapTextNodeWithSpan(childNodes[0]);
          bodies.push(this.createBodyForElm(span));
        } else {
          bodies.push(this.createBodyForElm(elm));
        }
        elm.setAttribute(this.bodyObjAttr, '');
      });
    });
  }

  getDeepestChild(elmOrElms) {

  }

  addBodiesFromDocumentTree(bodies) {
    // const 
  }

  createBodiesForHtmlElements() {
    // rename to endLevelSelectors - don't try to find nodes below this level?
    // e.g. for p, hn, button?
    // then inside those, still create spans per line

    // selector that define elements to be treated as a solid block
    const blockLevelSelector = '.block-level, img, video, button, input, textarea';
    // define selector for elms where we don't want to dig down further
    // we'll only create spans per line there
    const textLevelSelector = 'h1, h2, h3, h4, h5, h6, p, label';
    const deepestLevelSelectors = ['.block-level', 'p'];
    const oldSelectors = ['button', '.o-card--balloon', 'a', 'th', 'td', 'input', 'label', 'img'];

    const elementLevelSelectors = deepestLevelSelectors.concat(oldSelectors);
    const bodies = [];
    this.typeCorrectionsMaps = new TypeCorrectionsMaps();

    this.addBlockLevelBodies(bodies, blockLevelSelector);
    this.addTextLevelBodies(bodies, textLevelSelector);
    // this.addElementLevelBodies(bodies, elementLevelSelectors);
    this.addBodiesFromDocumentTree(bodies);

    return bodies;
  }

  // ######################################################################
  // ######################################################################
  // ######################################################################

  // replace all the text nodes in elements matched by selector by span with text
  // and return all the spans
  createSpansForTextNodes0(selectors) {
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

  addTextLevelBodies0(bodies, selectors) {
    const textLevelSpans = this.createSpansForTextNodes0(selectors);
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

  addElementLevelBodies0(bodies, selectors) {
    // possible optimization: handle element-level selectors first
    // and then check if text-level selectors don't fall within element-level
    selectors.forEach((selector) => {
      // console.log('selector:', selector);
      const elms = document.querySelectorAll(selector);
      elms.forEach((elm) => {
        // when elm is matched by multiple selectors,
        // make sure we only create bodies for it once
        if (this.elmHasBodyObj(elm)) {
          return;
        }
        const childNodes = elm.childNodes;
        if (childNodes.length === 1 && childNodes[0].nodeType === 3) {
          // We don't want to use text-only block-level elements, like h1
          // their bounding box is wider than the actual text.
          // Could also be that we have a flex-item that is too high
          // Insert span so we have inline element to bounce off
          const span = this.wrapTextNodeWithSpan(childNodes[0]);
          bodies.push(this.createBodyForElm(span));
        } else {
          bodies.push(this.createBodyForElm(elm));
        }
        elm.setAttribute(this.bodyObjAttr, '');
      });
    });
  }

  createBodiesForHtmlElements0() {
    const selectors = {
      textLevel: ['h1', 'h2', 'h3', 'h4', 'p'],
      elementLevel: ['button', '.o-card--balloon', 'a', 'th', 'td', 'input', 'label', 'img', '.block-level'],
    };
    const bodies = [];
    this.typeCorrectionsMaps = new TypeCorrectionsMaps();

    this.addTextLevelBodies0(bodies, selectors.textLevel);
    this.addElementLevelBodies0(bodies, selectors.elementLevel);

    return bodies;
  }
}
