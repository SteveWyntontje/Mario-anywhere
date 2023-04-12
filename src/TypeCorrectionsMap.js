export class TypeCorrectionsMap {
  constructor(options) {
    const defaults = {
      totalHeight: 44, // total height of span
      ascTop: 7, // top of char with ascender
      ascHeight: 29, // height of char with ascender
      regularTop: 15, // top of regular char
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
      height: (config.regularHeight - config.totalHeight) / config.totalHeight,
    }

    return {
      regular,
      asc,
      desc,
    };
  }
}