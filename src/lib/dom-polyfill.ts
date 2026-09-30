/**
 * Minimal Headless DOM Polyfills for pdfjs-dist in Node.js 20.
 * pdfjs-dist requires DOMMatrix, Path2D, and ImageData when running without @napi-rs/canvas.
 */
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m21 = 0;
    m22 = 1;
    m41 = 0;
    m42 = 0;
    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = init[0];
        this.b = init[1];
        this.c = init[2];
        this.d = init[3];
        this.e = init[4];
        this.f = init[5];
      }
    }
    multiply(other: any) {
      return this;
    }
    translate(x = 0, y = 0) {
      return this;
    }
    scale(x = 1, y = x) {
      return this;
    }
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {};
}

export {};
