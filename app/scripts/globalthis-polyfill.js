// globalThis polyfill for older browsers
(function () {
  if (typeof globalThis === 'object') return;
  if (typeof self !== 'undefined') {
    self.globalThis = self;
  } else if (typeof window !== 'undefined') {
    window.globalThis = window;
  } else if (typeof global !== 'undefined') {
    global.globalThis = global;
  }
})();
