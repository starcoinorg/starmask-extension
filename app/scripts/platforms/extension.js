import extension from 'extensionizer';
import { getEnvironmentType, checkForError } from '../lib/util';
import { ENVIRONMENT_TYPE_BACKGROUND } from '../../../shared/constants/app';
import { TRANSACTION_STATUSES } from '../../../shared/constants/transaction';
import { getBlockExplorerUrlForTx } from '../../../shared/modules/transaction.utils';
import browser from 'webextension-polyfill';

export default class ExtensionPlatform {
  //
  // Public
  //
  reload() {
    browser.runtime.reload();
  }

  isPopup() {
    const views = browser.extension.getViews({ type: 'popup' });
    return views.length > 0;
  }

  openTab(options) {
    return new Promise((resolve, reject) => {
      browser.tabs.create(options).then((newTab) => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve(newTab);
      });
    });
  }

  openWindow(options) {
    return new Promise((resolve, reject) => {
      browser.windows.create(options, (newWindow) => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve(newWindow);
      });
    });
  }

  focusWindow(windowId) {
    return new Promise((resolve, reject) => {
      browser.windows.update(windowId, { focused: true }, () => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve();
      });
    });
  }

  updateWindowPosition(windowId, left, top) {
    return new Promise((resolve, reject) => {
      browser.windows.update(windowId, { left, top }, () => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve();
      });
    });
  }

  getLastFocusedWindow() {
    return new Promise((resolve, reject) => {
      browser.windows.getLastFocused((windowObject) => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve(windowObject);
      });
    });
  }

  closeCurrentWindow() {
    return browser.windows.getCurrent((windowDetails) => {
      return browser.windows.remove(windowDetails.id);
    });
  }

  getVersion() {
    return browser.runtime.getManifest().version;
  }

  openExtensionInBrowser(route = null, queryString = null) {
    let extensionURL = browser.runtime.getURL('home.html');

    if (queryString) {
      extensionURL += `?${ queryString }`;
    }

    if (route) {
      extensionURL += `#${ route }`;
    }
    this.openTab({ url: extensionURL });
    if (getEnvironmentType() !== ENVIRONMENT_TYPE_BACKGROUND) {
      window.close();
    }
  }

  getPlatformInfo(cb) {
    try {
      browser.runtime.getPlatformInfo((platform) => {
        cb(null, platform);
      });
    } catch (e) {
      cb(e);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  showTransactionNotification(txMeta, rpcPrefs) {
    const { status, txReceipt: { status: receiptStatus, success } = {}, metamaskNetworkId: { name: network } } = txMeta;
    if (status === TRANSACTION_STATUSES.CONFIRMED) {
      // There was an on-chain failure
      (['devnet', 'testnet', 'mainnet'].includes(network) ? !success : receiptStatus !== 'Executed')
        ? this._showFailedTransaction(
          txMeta,
          'Transaction encountered an error.',
        )
        : this._showConfirmedTransaction(txMeta, rpcPrefs);
    } else if (status === TRANSACTION_STATUSES.FAILED) {
      this._showFailedTransaction(txMeta);
    }
  }

  getAllWindows() {
    return new Promise((resolve, reject) => {
      browser.windows.getAll((windows) => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve(windows);
      });
    });
  }

  getActiveTabs() {
    return new Promise((resolve, reject) => {
      browser.tabs.query({ active: true }).then((tabs) => {
        const error = checkForError();
        if (error) {
          return reject(error);
        }
        return resolve(tabs);
      });
    });
  }

  currentTab() {
    return new Promise((resolve, reject) => {
      browser.tabs.getCurrent().then((tab) => {
        const err = checkForError();
        if (err) {
          reject(err);
        } else {
          resolve(tab);
        }
      });
    });
  }

  switchToTab(tabId) {
    return new Promise((resolve, reject) => {
      browser.tabs.update(tabId, { highlighted: true }).then((tab) => {
        const err = checkForError();
        if (err) {
          reject(err);
        } else {
          resolve(tab);
        }
      });
    });
  }

  closeTab(tabId) {
    return new Promise((resolve, reject) => {
      browser.tabs.remove(tabId, () => {
        const err = checkForError();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  _showConfirmedTransaction(txMeta, rpcPrefs) {
    this._subscribeToNotificationClicked();

    const url = getBlockExplorerUrlForTx(txMeta, rpcPrefs);
    const nonce = parseInt(txMeta.txParams.nonce, 16);
    const title = 'Confirmed transaction';
    const { metamaskNetworkId: { name: network } } = txMeta;

    const message = `Transaction ${ nonce } confirmed! ${ url.length ? `View on ${ ['devnet', 'testnet', 'mainnet'].includes(network) ? 'Aptos Explorer' : 'StcScan' }` : '' }`;
    this._showNotification(title, message, url);
  }

  _showFailedTransaction(txMeta, errorMessage) {
    const nonce = parseInt(txMeta.txParams.nonce, 16);
    const title = 'Failed transaction';
    const message = `Transaction ${ nonce } failed! ${ errorMessage || txMeta.err.message }`;
    this._showNotification(title, message);
  }

  _showNotification(title, message, url) {
    browser.notifications.create(url, {
      type: 'basic',
      title,
      iconUrl: browser.runtime.getURL('../../images/icon-64.png'),
      message,
    });
  }

  _subscribeToNotificationClicked() {
    if (!browser.notifications.onClicked.hasListener(this._viewOnStcscan)) {
      browser.notifications.onClicked.addListener(this._viewOnStcscan);
    }
  }

  _viewOnStcscan(txId) {
    if (txId.startsWith('https://')) {
      browser.tabs.create({ url: txId });
    }
  }
}
