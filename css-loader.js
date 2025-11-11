// CSS loader to ignore CSS imports in Node.js
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id.endsWith('.css')) {
    return; // Return nothing for CSS imports
  }
  return originalRequire.apply(this, arguments);
};
