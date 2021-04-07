export const ROPSTEN = 'ropsten';
export const RINKEBY = 'rinkeby';
export const KOVAN = 'kovan';
export const MAINNET = 'mainnet';
export const GOERLI = 'goerli';
export const BARNARD = 'barnard';
export const PROXIMA = 'proxima';
export const HALLEY = 'halley';
export const NETWORK_TYPE_RPC = 'rpc';

export const MAINNET_NETWORK_ID = '1';
export const ROPSTEN_NETWORK_ID = '3';
export const RINKEBY_NETWORK_ID = '4';
export const GOERLI_NETWORK_ID = '5';
export const KOVAN_NETWORK_ID = '42';
export const BARNARD_NETWORK_ID = '251';
export const PROXIMA_NETWORK_ID = '2';
export const HALLEY_NETWORK_ID = '253';
export const LOCALHOST_NETWORK_ID = '254';

export const MAINNET_CHAIN_ID = '0x1';
export const ROPSTEN_CHAIN_ID = '0x3';
export const RINKEBY_CHAIN_ID = '0x4';
export const GOERLI_CHAIN_ID = '0x5';
export const KOVAN_CHAIN_ID = '0x2a';
export const BARNARD_CHAIN_ID = '0xfb';
export const PROXIMA_CHAIN_ID = '0x2';
export const HALLEY_CHAIN_ID = '0xfd';
export const LOCALHOST_CHAIN_ID = '0xfe';

/**
 * The largest possible chain ID we can handle.
 * Explanation: https://gist.github.com/rekmarks/a47bd5f2525936c4b8eee31a16345553
 */
export const MAX_SAFE_CHAIN_ID = 4503599627370476;

export const ROPSTEN_DISPLAY_NAME = 'Ropsten';
export const RINKEBY_DISPLAY_NAME = 'Rinkeby';
export const KOVAN_DISPLAY_NAME = 'Kovan';
export const MAINNET_DISPLAY_NAME = 'Ethereum Mainnet';
export const GOERLI_DISPLAY_NAME = 'Goerli';
export const BARNARD_DISPLAY_NAME = 'Barnard';
export const PROXIMA_DISPLAY_NAME = 'Proxima';
export const HALLEY_DISPLAY_NAME = 'Halley';

export const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET, GOERLI, BARNARD, PROXIMA, HALLEY];

export const TEST_CHAINS = [
  ROPSTEN_CHAIN_ID,
  RINKEBY_CHAIN_ID,
  GOERLI_CHAIN_ID,
  KOVAN_CHAIN_ID,
  BARNARD_CHAIN_ID,
  PROXIMA_CHAIN_ID,
  HALLEY_CHAIN_ID,
];

export const NETWORK_TYPE_TO_ID_MAP = {
  [ROPSTEN]: { networkId: ROPSTEN_NETWORK_ID, chainId: ROPSTEN_CHAIN_ID },
  [RINKEBY]: { networkId: RINKEBY_NETWORK_ID, chainId: RINKEBY_CHAIN_ID },
  [KOVAN]: { networkId: KOVAN_NETWORK_ID, chainId: KOVAN_CHAIN_ID },
  [GOERLI]: { networkId: GOERLI_NETWORK_ID, chainId: GOERLI_CHAIN_ID },
  [BARNARD]: { networkId: BARNARD_NETWORK_ID, chainId: BARNARD_CHAIN_ID },
  [PROXIMA]: { networkId: PROXIMA_NETWORK_ID, chainId: PROXIMA_CHAIN_ID },
  [HALLEY]: { networkId: HALLEY_NETWORK_ID, chainId: HALLEY_CHAIN_ID },
  [MAINNET]: { networkId: MAINNET_NETWORK_ID, chainId: MAINNET_CHAIN_ID },
};

export const NETWORK_TO_NAME_MAP = {
  [ROPSTEN]: ROPSTEN_DISPLAY_NAME,
  [RINKEBY]: RINKEBY_DISPLAY_NAME,
  [KOVAN]: KOVAN_DISPLAY_NAME,
  [MAINNET]: MAINNET_DISPLAY_NAME,
  [GOERLI]: GOERLI_DISPLAY_NAME,
  [BARNARD]: BARNARD_DISPLAY_NAME,
  [PROXIMA]: PROXIMA_DISPLAY_NAME,
  [HALLEY]: HALLEY_DISPLAY_NAME,

  [ROPSTEN_NETWORK_ID]: ROPSTEN_DISPLAY_NAME,
  [RINKEBY_NETWORK_ID]: RINKEBY_DISPLAY_NAME,
  [KOVAN_NETWORK_ID]: KOVAN_DISPLAY_NAME,
  [GOERLI_NETWORK_ID]: GOERLI_DISPLAY_NAME,
  [BARNARD_NETWORK_ID]: BARNARD_DISPLAY_NAME,
  [PROXIMA_NETWORK_ID]: PROXIMA_DISPLAY_NAME,
  [HALLEY_NETWORK_ID]: HALLEY_DISPLAY_NAME,
  [MAINNET_NETWORK_ID]: MAINNET_DISPLAY_NAME,

  [ROPSTEN_CHAIN_ID]: ROPSTEN_DISPLAY_NAME,
  [RINKEBY_CHAIN_ID]: RINKEBY_DISPLAY_NAME,
  [KOVAN_CHAIN_ID]: KOVAN_DISPLAY_NAME,
  [GOERLI_CHAIN_ID]: GOERLI_DISPLAY_NAME,
  [BARNARD_CHAIN_ID]: BARNARD_DISPLAY_NAME,
  [PROXIMA_CHAIN_ID]: PROXIMA_DISPLAY_NAME,
  [HALLEY_CHAIN_ID]: HALLEY_DISPLAY_NAME,
  [MAINNET_CHAIN_ID]: MAINNET_DISPLAY_NAME,
};

export const CHAIN_ID_TO_TYPE_MAP = Object.entries(
  NETWORK_TYPE_TO_ID_MAP,
).reduce((chainIdToTypeMap, [networkType, { chainId }]) => {
  chainIdToTypeMap[chainId] = networkType;
  return chainIdToTypeMap;
}, {});

export const CHAIN_ID_TO_NETWORK_ID_MAP = Object.values(
  NETWORK_TYPE_TO_ID_MAP,
).reduce((chainIdToNetworkIdMap, { chainId, networkId }) => {
  chainIdToNetworkIdMap[chainId] = networkId;
  return chainIdToNetworkIdMap;
}, {});
