import { TypeCorrectionsMap } from "./TypeCorrectionsMap.js";

export class TypeCorrectionsMaps {
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