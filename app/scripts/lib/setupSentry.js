import * as Sentry from '@sentry/browser';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';

import extractEthjsErrorMessage from './extractEthjsErrorMessage';

/* eslint-disable prefer-destructuring */
// Destructuring breaks the inlining of the environment variables
const STARMASK_DEBUG = process.env.STARMASK_DEBUG;
const STARMASK_ENVIRONMENT = process.env.STARMASK_ENVIRONMENT;
/* eslint-enable prefer-destructuring */
const SENTRY_DSN_DEV =
  'https://c504129d14e9408eb04be2e966bd2566@o568661.ingest.sentry.io/5713932';

// This describes the subset of Redux state attached to errors sent to Sentry
// These properties have some potential to be useful for debugging, and they do
// not contain any identifiable information.
export const SENTRY_STATE = {
  gas: true,
  history: true,
  starmask: {
    alertEnabledness: true,
    completedOnboarding: true,
    connectedStatusPopoverHasBeenShown: true,
    conversionDate: true,
    conversionRate: true,
    currentBlockGasLimit: true,
    currentCurrency: true,
    currentLocale: true,
    customNonceValue: true,
    defaultHomeActiveTabName: true,
    featureFlags: true,
    firstTimeFlowType: true,
    forgottenPassword: true,
    incomingTxLastFetchedBlockByChainId: true,
    ipfsGateway: true,
    isAccountMenuOpen: true,
    isInitialized: true,
    isUnlocked: true,
    metaMetricsId: true,
    metaMetricsSendCount: true,
    nativeCurrency: true,
    network: true,
    nextNonce: true,
    participateInMetaMetrics: false,
    preferences: true,
    provider: {
      nickname: true,
      ticker: true,
      type: true,
    },
    seedPhraseBackedUp: true,
    showRestorePrompt: true,
    unapprovedDecryptMsgCount: true,
    unapprovedEncryptionPublicKeyMsgCount: true,
    unapprovedMsgCount: true,
    unapprovedPersonalMsgCount: true,
    unapprovedTypedMessagesCount: true,
    useBlockie: true,
    useNonceField: true,
    usePhishDetect: true,
    welcomeScreenSeen: true,
  },
  unconnectedAccount: true,
};

export default function setupSentry({ release, getState }) {
  let sentryTarget;

  if (STARMASK_DEBUG) {
    return undefined;
  } else if (STARMASK_ENVIRONMENT === 'production') {
    if (!process.env.SENTRY_DSN) {
      throw new Error(
        `Missing SENTRY_DSN environment variable in production environment`,
      );
    }
    console.log(
      `Setting up Sentry Remote Error Reporting for '${STARMASK_ENVIRONMENT}': SENTRY_DSN`,
    );
    sentryTarget = process.env.SENTRY_DSN;
  } else {
    console.log(
      `Setting up Sentry Remote Error Reporting for '${STARMASK_ENVIRONMENT}': SENTRY_DSN_DEV`,
    );
    sentryTarget = SENTRY_DSN_DEV;
  }

  Sentry.init({
    dsn: sentryTarget,
    debug: STARMASK_DEBUG,
    environment: STARMASK_ENVIRONMENT,
    integrations: [new Dedupe(), new ExtraErrorData()],
    release,
    beforeSend: (report) => rewriteReport(report),
  });

  function rewriteReport(report) {
    try {
      // simplify certain complex error messages (e.g. Ethjs)
      simplifyErrorMessages(report);
      // modify report urls
      rewriteReportUrls(report);
      // append app state
      if (getState) {
        const appState = getState();
        if (!report.extra) {
          report.extra = {};
        }
        report.extra.appState = appState;
      }
    } catch (err) {
      console.warn(err);
    }
    return report;
  }

  return Sentry;
}

function simplifyErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    // simplify ethjs error messages
    let simplifiedErrorMessage = extractEthjsErrorMessage(errorMessage);
    // simplify 'Transaction Failed: known transaction'
    if (
      simplifiedErrorMessage.indexOf(
        'Transaction Failed: known transaction',
      ) === 0
    ) {
      // cut the hash from the error message
      simplifiedErrorMessage = 'Transaction Failed: known transaction';
    }
    return simplifiedErrorMessage;
  });
}

function rewriteErrorMessages(report, rewriteFn) {
  // rewrite top level message
  if (typeof report.message === 'string') {
    report.message = rewriteFn(report.message);
  }
  // rewrite each exception message
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (typeof item.value === 'string') {
        item.value = rewriteFn(item.value);
      }
    });
  }
}

function rewriteReportUrls(report) {
  // update request url
  report.request.url = toMetamaskUrl(report.request.url);
  // update exception stack trace
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (item.stacktrace) {
        item.stacktrace.frames.forEach((frame) => {
          frame.filename = toMetamaskUrl(frame.filename);
        });
      }
    });
  }
}

function toMetamaskUrl(origUrl) {
  const filePath = origUrl.split(window.location.origin)[1];
  if (!filePath) {
    return origUrl;
  }
  const metamaskUrl = `starmask${filePath}`;
  return metamaskUrl;
}
