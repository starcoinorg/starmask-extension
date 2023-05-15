import log from 'loglevel';
import { checkForError } from './util';
import browser from 'webextension-polyfill';
import { checkForLastError } from '../../../shared/modules/browser-runtime.utils';

/**
 * A wrapper around the extension's storage local API
 */
export default class ExtensionStore {
  /**
   * @constructor
   */
  constructor() {
    this.isSupported = Boolean(browser.storage.local);
    if (!this.isSupported) {
      log.error('Storage local API not available.');
    }
  }

  /**
   * Returns all of the keys currently saved
   * @returns {Promise<*>}
   */
  async get() {
    if (!this.isSupported) {
      return undefined;
    }
    const result = await this._get();
    // extension.storage.local always returns an obj
    // if the object is empty, treat it as undefined
    if (isEmpty(result)) {
      return undefined;
    }
    return result;
  }

  /**
   * Sets the key in local state
   * @param {Object} state - The state to set
   * @returns {Promise<void>}
   */
  async set(state) {
    return this._set(state);
  }

  /**
   * Returns all of the keys currently saved
   * @private
   * @returns {Object} the key-value map from local storage
   */
  _get() {
    const { local } = browser.storage;
    return new Promise((resolve, reject) => {
      local.get(null).then((/** @type {any} */ result) => {
        const err = checkForLastError();
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Sets the key in local state
   * @param {Object} obj - The key to set
   * @returns {Promise<void>}
   * @private
   */
  _set(obj) {
    const { local } = browser.storage;
    return new Promise((resolve, reject) => {
      local.set(obj).then(() => {
        const err = checkForLastError();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * Returns whether or not the given object contains no keys
 * @param {Object} obj - The object to check
 * @returns {boolean}
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}
