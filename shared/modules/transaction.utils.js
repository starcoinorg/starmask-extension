import { defaultNetworksData } from '../../ui/app/pages/settings/networks-tab/networks-tab.constants';

export function transactionMatchesNetwork(transaction, chainId, networkId) {
  if (typeof transaction.chainId !== 'undefined') {
    return transaction.chainId === chainId;
  }
  return transaction.metamaskNetworkId === networkId;
}

/**
 * build the etherscan link for a transaction by either chainId, if available
 * or metamaskNetworkId as a fallback. If rpcPrefs is provided will build the
 * url for the provided blockExplorerUrl.
 *
 * @param {Object} transaction - a transaction object from state
 * @param {string} [transaction.metamaskNetworkId] - network id tx occurred on
 * @param {string} [transaction.chainId] - chain id tx occurred on
 * @param {string} [transaction.hash] - hash of the transaction
 * @param {Object} [rpcPrefs] - the rpc preferences for the current RPC network
 * @param {string} [rpcPrefs.blockExplorerUrl] - the block explorer url for RPC
 *  networks
 * @returns {string}
 */
export function getBlockExplorerUrlForTx(transaction, rpcPrefs = {}) {
  let blockExplorerUrl;
  if (rpcPrefs.blockExplorerUrl) {
    blockExplorerUrl = rpcPrefs.blockExplorerUrl;
  } else if (transaction.chainId) {
    const rpcPref = defaultNetworksData.find(
      (rpcInfo) => rpcInfo.chainId === transaction.chainId,
    ) || {};
    blockExplorerUrl = rpcPref.blockExplorerUrl || '';
  }
  return `${blockExplorerUrl.replace(/\/+$/u, '')}/transactions/detail/${transaction.hash}`;
}
