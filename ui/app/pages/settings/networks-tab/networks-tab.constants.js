import {
  HALLEY,
  HALLEY_CHAIN_ID,
  MAINNET,
  MAINNET_CHAIN_ID,
  PROXIMA,
  PROXIMA_CHAIN_ID,
  BARNARD,
  BARNARD_CHAIN_ID,
} from '../../../../../shared/constants/network';

const defaultNetworksData = [
  {
    labelKey: MAINNET,
    iconColor: '#29B6AF',
    providerType: MAINNET,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    chainId: MAINNET_CHAIN_ID,
    ticker: 'ETH',
    blockExplorerUrl: 'https://etherscan.io',
  },
  {
    labelKey: BARNARD,
    iconColor: '#FF4A8D',
    providerType: BARNARD,
    rpcUrl: `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    chainId: BARNARD_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'http://explorer.starcoin.org/barnard/home',
  },
  {
    labelKey: PROXIMA,
    iconColor: '#9064FF',
    providerType: PROXIMA,
    rpcUrl: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    chainId: PROXIMA_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'http://explorer.starcoin.org/proxima/home',
  },
  {
    labelKey: HALLEY,
    iconColor: '#3099f2',
    providerType: HALLEY,
    rpcUrl: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    chainId: HALLEY_CHAIN_ID,
    ticker: 'STC',
    blockExplorerUrl: 'http://explorer.starcoin.org/halley/home',
  },
];

export { defaultNetworksData };
