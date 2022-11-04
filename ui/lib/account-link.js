import { createAccountLinkForChain } from '@metamask/etherscan-link';

export default function getAccountLink(address, chainId, rpcPrefs) {
  if (rpcPrefs.ticker === 'STC') {
    if (rpcPrefs && rpcPrefs.blockExplorerUrl) {
      return `${ rpcPrefs.blockExplorerUrl.replace(
        /\/+$/u,
        '',
      ) }/address/${ address }`;
    }
  }

  if (rpcPrefs.ticker === 'APT') {
    if (rpcPrefs && rpcPrefs.blockExplorerUrl) {
      return `${ rpcPrefs.blockExplorerUrl.replace(
        /\/+$/u,
        '',
      ) }/account/${ address }?network=${ rpcPrefs.labelKey }`;
    }
  }

  return createAccountLinkForChain(address, chainId);
}
