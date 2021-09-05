export const MAINNET = 'main';
export const BARNARD = 'barnard';
export const PROXIMA = 'proxima';
export const HALLEY = 'halley';
export const NETWORK_TYPE_RPC = 'rpc';

export const MAINNET_NETWORK_ID = '1';
export const BARNARD_NETWORK_ID = '251';
export const PROXIMA_NETWORK_ID = '252';
export const HALLEY_NETWORK_ID = '253';
export const LOCALHOST_NETWORK_ID = '254';

export const MAINNET_CHAIN_ID = '0x1';
export const BARNARD_CHAIN_ID = '0xfb';
export const PROXIMA_CHAIN_ID = '0xfc';
export const HALLEY_CHAIN_ID = '0xfd';
export const LOCALHOST_CHAIN_ID = '0xfe';

/**
 * The largest possible chain ID we can handle.
 * Explanation: https://gist.github.com/rekmarks/a47bd5f2525936c4b8eee31a16345553
 */
export const MAX_SAFE_CHAIN_ID = 4503599627370476;

export const MAINNET_DISPLAY_NAME = 'Starcoin Mainnet';
export const BARNARD_DISPLAY_NAME = 'Barnard';
export const PROXIMA_DISPLAY_NAME = 'Proxima';
export const HALLEY_DISPLAY_NAME = 'Halley';

export const INFURA_PROVIDER_TYPES = [MAINNET, BARNARD, PROXIMA, HALLEY];

export const TEST_CHAINS = [
  BARNARD_CHAIN_ID,
  PROXIMA_CHAIN_ID,
  HALLEY_CHAIN_ID,
];

export const NETWORK_TYPE_TO_ID_MAP = {
  [BARNARD]: { networkId: BARNARD_NETWORK_ID, chainId: BARNARD_CHAIN_ID },
  [PROXIMA]: { networkId: PROXIMA_NETWORK_ID, chainId: PROXIMA_CHAIN_ID },
  [HALLEY]: { networkId: HALLEY_NETWORK_ID, chainId: HALLEY_CHAIN_ID },
  [MAINNET]: { networkId: MAINNET_NETWORK_ID, chainId: MAINNET_CHAIN_ID },
};

export const NETWORK_TO_NAME_MAP = {
  [MAINNET]: MAINNET_DISPLAY_NAME,
  [BARNARD]: BARNARD_DISPLAY_NAME,
  [PROXIMA]: PROXIMA_DISPLAY_NAME,
  [HALLEY]: HALLEY_DISPLAY_NAME,

  [BARNARD_NETWORK_ID]: BARNARD_DISPLAY_NAME,
  [PROXIMA_NETWORK_ID]: PROXIMA_DISPLAY_NAME,
  [HALLEY_NETWORK_ID]: HALLEY_DISPLAY_NAME,
  [MAINNET_NETWORK_ID]: MAINNET_DISPLAY_NAME,

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
