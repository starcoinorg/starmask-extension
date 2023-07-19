const sass = require('gulp-sass')(require('sass'));

module.exports = {
  render: (opts, callback) => {
    // sass wants its arguments to come from the same Realm as itself
    // bridgeJson and bridgeFn are added via patch-package to make this possible
    sass.render(JSON.parse(JSON.stringify(opts)), ((...args) => callback(...args)));
  },
  renderSync: () => {
    throw new Error('sass-wrapper - renderSync not supported');
  },
};
