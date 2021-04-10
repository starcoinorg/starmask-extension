import setupSentry from './lib/setupSentry';

// setup sentry error reporting
global.sentry = setupSentry({
  release: process.env.STARMASK_VERSION,
  getState: () => global.getSentryState?.() || {},
});
