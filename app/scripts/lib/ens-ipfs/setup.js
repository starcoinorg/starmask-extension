import extension from 'extensionizer';
import getFetchWithTimeout from '../../../../shared/modules/fetch-with-timeout';
import resolveEnsToIpfsContentId from './resolver';
import browser from 'webextension-polyfill';

const fetchWithTimeout = getFetchWithTimeout(30000);

const supportedTopLevelDomains = ['eth'];

export default function setupEnsIpfsResolver({
  provider,
  getCurrentChainId,
  getIpfsGateway,
}) {
  // install listener
  const urlPatterns = supportedTopLevelDomains.map((tld) => `*://*.${tld}/*`);
  browser.webRequest.onErrorOccurred.addListener(webRequestDidFail, {
    urls: urlPatterns,
    types: ['main_frame'],
  });

  // return api object
  return {
    // uninstall listener
    remove() {
      browser.webRequest.onErrorOccurred.removeListener(webRequestDidFail);
    },
  };

  async function webRequestDidFail(details) {
    const { tabId, url } = details;
    // ignore requests that are not associated with tabs
    // only attempt ENS resolution on mainnet
    if (tabId === -1 || getCurrentChainId() !== '0x1') {
      return;
    }
    // parse ens name
    const { hostname: name, pathname, search, hash: fragment } = new URL(url);
    const domainParts = name.split('.');
    const topLevelDomain = domainParts[domainParts.length - 1];
    // if unsupported TLD, abort
    if (!supportedTopLevelDomains.includes(topLevelDomain)) {
      return;
    }
    // otherwise attempt resolve
    attemptResolve({ tabId, name, pathname, search, fragment });
  }

  async function attemptResolve({ tabId, name, pathname, search, fragment }) {
    const ipfsGateway = getIpfsGateway();
    browser.tabs.update(tabId, { url: `loading.html` });
    let url = `https://app.ens.domains/name/${name}`;
    try {
      const { type, hash } = await resolveEnsToIpfsContentId({
        provider,
        name,
      });
      if (type === 'ipfs-ns' || type === 'ipns-ns') {
        const resolvedUrl = `https://${hash}.${type.slice(
          0,
          4,
        )}.${ipfsGateway}${pathname}${search || ''}${fragment || ''}`;
        try {
          // check if ipfs gateway has result
          const response = await fetchWithTimeout(resolvedUrl, {
            method: 'HEAD',
          });
          if (response.status === 200) {
            url = resolvedUrl;
          }
        } catch (err) {
          console.warn(err);
        }
      } else if (type === 'swarm-ns') {
        url = `https://swarm-gateways.net/bzz:/${hash}${pathname}${
          search || ''
        }${fragment || ''}`;
      } else if (type === 'onion' || type === 'onion3') {
        url = `http://${hash}.onion${pathname}${search || ''}${fragment || ''}`;
      } else if (type === 'zeronet') {
        url = `http://127.0.0.1:43110/${hash}${pathname}${search || ''}${
          fragment || ''
        }`;
      }
    } catch (err) {
      console.warn(err);
    } finally {
      browser.tabs.update(tabId, { url });
    }
  }
}
