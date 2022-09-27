import {
  HALLEY,
  HALLEY_CHAIN_ID,
  MAINNET,
  MAINNET_CHAIN_ID,
  PROXIMA,
  PROXIMA_CHAIN_ID,
  BARNARD,
  BARNARD_CHAIN_ID,
  DEVNET,
  DEVNET_CHAIN_ID,
} from '../../../../../shared/constants/network';

const defaultNetworksData = [
  {
    labelKey: MAINNET,
    iconColor: '#29B6AF',
    providerType: MAINNET,
    rpcUrl: 'https://main-seed.starcoin.org',
    chainId: MAINNET_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'https://stcscan.io/main',
  },
  {
    labelKey: BARNARD,
    iconColor: '#FF4A8D',
    providerType: BARNARD,
    rpcUrl: 'https://barnard-seed.starcoin.org',
    chainId: BARNARD_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'https://stcscan.io/barnard',
  },
  {
    labelKey: HALLEY,
    iconColor: '#3099f2',
    providerType: HALLEY,
    rpcUrl: 'https://halley-seed.starcoin.org',
    chainId: HALLEY_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'https://stcscan.io/halley',
  },
  {
    labelKey: PROXIMA,
    iconColor: '#9064FF',
    providerType: PROXIMA,
    rpcUrl: 'https://proxima-seed.starcoin.org',
    chainId: PROXIMA_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'https://stcscan.io/proxima',
  },
  {
    labelKey: DEVNET,
    iconColor: '#F6C343',
    providerType: DEVNET,
    rpcUrl: 'https://fullnode.devnet.aptoslab.com',
    chainId: DEVNET_CHAIN_ID,
    ticker: 'APT',
    blockExplorerUrl: 'https://explorer.aptoslabs.com/',
  },
];

export { defaultNetworksData };
