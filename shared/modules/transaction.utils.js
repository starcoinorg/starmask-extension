import { defaultNetworksData } from '../../ui/app/pages/settings/networks-tab/networks-tab.constants';

/**
 * Check if a transaction matches the current network
 * @param {Object} transaction - the transaction object
 * @param {string} chainId - the current chain ID (hex string)
 * @param {Object|string} networkId - the current network ID (can be object {name, id} or string)
 * @returns {boolean} true if transaction matches the network
 */
export function transactionMatchesNetwork(transaction, chainId, networkId) {
  // Check chainId first if it exists
  if (typeof transaction.chainId !== 'undefined') {
    const matches = transaction.chainId === chainId;
    if (!matches) {
      console.log('transactionMatchesNetwork: chainId mismatch', {
        txId: transaction.id,
        txChainId: transaction.chainId,
        currentChainId: chainId,
        txChainIdType: typeof transaction.chainId,
        currentChainIdType: typeof chainId
      });
    }
    return matches;
  }
  
  // Handle object comparison for metamaskNetworkId
  // networkId from chain.id RPC is an object: { name: chainId, id: Number }
  const txNetworkId = transaction.metamaskNetworkId;
  
  let result;
  if (typeof txNetworkId === 'object' && txNetworkId !== null &&
      typeof networkId === 'object' && networkId !== null) {
    // Compare by name (chainId string) or id (numeric chain id)
    result = txNetworkId.name === networkId.name || txNetworkId.id === networkId.id;
  } else if (typeof txNetworkId === 'object' && txNetworkId !== null) {
    // Handle mixed comparisons (object vs string/number)
    result = txNetworkId.name === networkId || txNetworkId.id === networkId;
  } else if (typeof networkId === 'object' && networkId !== null) {
    result = txNetworkId === networkId.name || txNetworkId === networkId.id;
  } else {
    // Fallback to direct comparison for primitive types
    result = txNetworkId === networkId;
  }
  
  if (!result) {
    console.log('transactionMatchesNetwork: networkId mismatch', {
      txId: transaction.id,
      txNetworkId,
      currentNetworkId: networkId,
      txNetworkIdType: typeof txNetworkId,
      currentNetworkIdType: typeof networkId
    });
  }
  
  return result;
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
  let ticker;
  let providerType;
  if (rpcPrefs.blockExplorerUrl) {
    blockExplorerUrl = rpcPrefs.blockExplorerUrl;
    ticker = rpcPrefs.ticker
    providerType = rpcPrefs.providerType
  } else if (transaction.chainId) {
    const rpcPref = defaultNetworksData.find(
      (rpcInfo) => rpcInfo.chainId === transaction.chainId,
    ) || {};
    ticker = rpcPref.ticker
    providerType = rpcPref.providerType
    blockExplorerUrl = rpcPref.blockExplorerUrl || '';
  }

  if (ticker === 'STC') {
    blockExplorerUrl = `${ blockExplorerUrl.replace(/\/+$/u, '') }/transactions/detail/${ transaction.hash }`;
  } else {
    blockExplorerUrl = `${ blockExplorerUrl.replace(/\/+$/u, '') }/txn/${ transaction.hash }?network=${ providerType }`;
  }

  return blockExplorerUrl
}
