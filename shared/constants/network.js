export const STC_SYMBOL = 'STC';
export const APTOS_SYMBOL = 'APT';

export const MAINNET = 'main';
export const BARNARD = 'barnard';
export const PROXIMA = 'proxima';
export const HALLEY = 'halley';

export const DEVNET = 'devnet';

export const NETWORK_TYPE_RPC = 'rpc';

export const MAINNET_NETWORK_ID = '1';
export const BARNARD_NETWORK_ID = '251';
export const PROXIMA_NETWORK_ID = '252';
export const HALLEY_NETWORK_ID = '253';
export const LOCALHOST_NETWORK_ID = '254';

export const DEVNET_NETWORK_ID = '31';

export const MAINNET_CHAIN_ID = '0x1';
export const BARNARD_CHAIN_ID = '0xfb';
export const PROXIMA_CHAIN_ID = '0xfc';
export const HALLEY_CHAIN_ID = '0xfd';
export const LOCALHOST_CHAIN_ID = '0xfe';

export const DEVNET_CHAIN_ID = '0x1f';

export const getRpcUrl = ({ network, impl }) =>
  impl === APTOS_SYMBOL ? `https://fullnode.${ network }.aptoslabs.com` : `https://${ network }-seed.starcoin.org`;

export const MAINNET_RPC_URL = getRpcUrl({ network: MAINNET, impl: STC_SYMBOL });
export const BARNARD_RPC_URL = getRpcUrl({ network: BARNARD, impl: STC_SYMBOL });
export const PROXIMA_RPC_URL = getRpcUrl({ network: PROXIMA, impl: STC_SYMBOL });
export const HALLEY_RPC_URL = getRpcUrl({ network: HALLEY, impl: STC_SYMBOL });
export const DEVNET_RPC_URL = getRpcUrl({ network: DEVNET, impl: APTOS_SYMBOL });
export const LOCALHOST_RPC_URL = 'http://localhost:9850';

/**
 * The largest possible chain ID we can handle.
 * Explanation: https://gist.github.com/rekmarks/a47bd5f2525936c4b8eee31a16345553
 */
export const MAX_SAFE_CHAIN_ID = 4503599627370476;

export const MAINNET_DISPLAY_NAME = 'Starcoin Mainnet';
export const BARNARD_DISPLAY_NAME = 'Barnard';
export const PROXIMA_DISPLAY_NAME = 'Proxima';
export const HALLEY_DISPLAY_NAME = 'Halley';
export const DEVNET_DISPLAY_NAME = 'Aptos DevNet';

export const INFURA_PROVIDER_TYPES = [MAINNET, BARNARD, PROXIMA, HALLEY, DEVNET];

export const TEST_CHAINS = [
  BARNARD_CHAIN_ID,
  PROXIMA_CHAIN_ID,
  HALLEY_CHAIN_ID,
  DEVNET_CHAIN_ID,
];

export const NETWORK_TYPE_TO_ID_MAP = {
  [BARNARD]: { networkId: BARNARD_NETWORK_ID, chainId: BARNARD_CHAIN_ID },
  [PROXIMA]: { networkId: PROXIMA_NETWORK_ID, chainId: PROXIMA_CHAIN_ID },
  [HALLEY]: { networkId: HALLEY_NETWORK_ID, chainId: HALLEY_CHAIN_ID },
  [MAINNET]: { networkId: MAINNET_NETWORK_ID, chainId: MAINNET_CHAIN_ID },
  [DEVNET]: { networkId: DEVNET_NETWORK_ID, chainId: DEVNET_CHAIN_ID },
};

export const NETWORK_TO_NAME_MAP = {
  [MAINNET]: MAINNET_DISPLAY_NAME,
  [BARNARD]: BARNARD_DISPLAY_NAME,
  [PROXIMA]: PROXIMA_DISPLAY_NAME,
  [HALLEY]: HALLEY_DISPLAY_NAME,
  [DEVNET]: DEVNET_DISPLAY_NAME,

  [BARNARD_NETWORK_ID]: BARNARD_DISPLAY_NAME,
  [PROXIMA_NETWORK_ID]: PROXIMA_DISPLAY_NAME,
  [HALLEY_NETWORK_ID]: HALLEY_DISPLAY_NAME,
  [MAINNET_NETWORK_ID]: MAINNET_DISPLAY_NAME,
  [DEVNET_NETWORK_ID]: DEVNET_DISPLAY_NAME,

  [BARNARD_CHAIN_ID]: BARNARD_DISPLAY_NAME,
  [PROXIMA_CHAIN_ID]: PROXIMA_DISPLAY_NAME,
  [HALLEY_CHAIN_ID]: HALLEY_DISPLAY_NAME,
  [MAINNET_CHAIN_ID]: MAINNET_DISPLAY_NAME,
  [DEVNET_CHAIN_ID]: DEVNET_DISPLAY_NAME,
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

export const CHAIN_ID_TO_RPC_URL_MAP = {
  [MAINNET_CHAIN_ID]: MAINNET_RPC_URL,
  [BARNARD_CHAIN_ID]: BARNARD_RPC_URL,
  [PROXIMA_CHAIN_ID]: PROXIMA_RPC_URL,
  [HALLEY_CHAIN_ID]: HALLEY_RPC_URL,
  [LOCALHOST_CHAIN_ID]: LOCALHOST_RPC_URL,
  [DEVNET_CHAIN_ID]: DEVNET_RPC_URL,
};
