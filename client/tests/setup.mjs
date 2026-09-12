import { JSDOM } from "jsdom";
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { url: "http://localhost:5173/", pretendToBeVisual: true },
);
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "Node",
  "sessionStorage",
  "localStorage",
])
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    configurable: true,
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
globalThis.requestAnimationFrame = (callback) =>
  setTimeout(() => callback(performance.now()), 16);
globalThis.cancelAnimationFrame = clearTimeout;
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: async (value) => {
      globalThis.copiedText = value;
    },
  },
});
