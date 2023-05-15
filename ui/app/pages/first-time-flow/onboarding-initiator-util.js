import extension from 'extensionizer';
import log from 'loglevel';
import browser from 'webextension-polyfill';

const returnToOnboardingInitiatorTab = async (onboardingInitiator) => {
  const tab = await new Promise((resolve) => {
    browser.tabs.update(
      onboardingInitiator.tabId,
      { active: true }
    ).then((tab) => {
      if (tab) {
        resolve(tab);
      } else {
        // silence console message about unchecked error
        if (browser.runtime.lastError) {
          log.debug(browser.runtime.lastError);
        }
        resolve();
      }
    });
  });

  if (tab) {
    window.close();
  } else {
    // this case can happen if the tab was closed since being checked with `extension.tabs.get`
    log.warn(
      `Setting current tab to onboarding initiator has failed; falling back to redirect`,
    );
    window.location.assign(onboardingInitiator.location);
  }
};

export const returnToOnboardingInitiator = async (onboardingInitiator) => {
  const tab = await new Promise((resolve) => {
    // eslint-disable-next-line no-shadow
    browser.tabs.get(onboardingInitiator.tabId).then((tab) => {
      if (tab) {
        resolve(tab);
      } else {
        // silence console message about unchecked error
        if (browser.runtime.lastError) {
          log.debug(browser.runtime.lastError);
        }
        resolve();
      }
    });
  });

  if (tab) {
    await returnToOnboardingInitiatorTab(onboardingInitiator);
  } else {
    window.location.assign(onboardingInitiator.location);
  }
};
