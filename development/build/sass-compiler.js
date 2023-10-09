const sass = require('sass');

const bridgeJson = (target) => JSON.parse(JSON.stringify(target))
const bridgeFn = (target) => ((...args) => target(...args))

module.exports = {
  render: (opts, callback) => {
    // sass wants its arguments to come from the same Realm as itself
    // bridgeJson and bridgeFn are added via patch-package to make this possible
    sass.render(bridgeJson(opts), bridgeFn(callback));
  },
  renderSync: () => {
    throw new Error('sass-wrapper - renderSync not supported');
  },
};
