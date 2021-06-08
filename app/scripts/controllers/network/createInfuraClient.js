import { createScaffoldMiddleware, mergeMiddleware } from 'json-rpc-engine';
import createBlockReRefMiddleware from '@starcoin/stc-json-rpc-middleware/block-ref';
import createRetryOnEmptyMiddleware from '@starcoin/stc-json-rpc-middleware/retryOnEmpty';
import createBlockCacheMiddleware from '@starcoin/stc-json-rpc-middleware/block-cache';
import createInflightMiddleware from '@starcoin/stc-json-rpc-middleware/inflight-cache';
import createBlockTrackerInspectorMiddleware from '@starcoin/stc-json-rpc-middleware/block-tracker-inspector';
import providerFromMiddleware from '@starcoin/stc-json-rpc-middleware/providerFromMiddleware';
import createInfuraMiddleware from '@starcoin/stc-json-rpc';
import { PollingBlockTracker } from '@starcoin/stc-block-tracker';

import { NETWORK_TYPE_TO_ID_MAP } from '../../../../shared/constants/network';

export default function createInfuraClient({ network, projectId }) {
  const infuraMiddleware = createInfuraMiddleware({
    network,
    projectId,
    maxAttempts: 5,
    source: 'starmask',
  });
  const infuraProvider = providerFromMiddleware(infuraMiddleware);
  const blockTracker = new PollingBlockTracker({ provider: infuraProvider });

  const networkMiddleware = mergeMiddleware([
    createNetworkAndChainIdMiddleware({ network }),
    createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    createBlockReRefMiddleware({ blockTracker, provider: infuraProvider }),
    createRetryOnEmptyMiddleware({ blockTracker, provider: infuraProvider }),
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    infuraMiddleware,
  ]);
  return { networkMiddleware, blockTracker };
}

function createNetworkAndChainIdMiddleware({ network }) {
  if (!NETWORK_TYPE_TO_ID_MAP[network]) {
    throw new Error(`createInfuraClient - unknown network "${network}"`);
  }

  const { chainId, networkId } = NETWORK_TYPE_TO_ID_MAP[network];

  return createScaffoldMiddleware({
    eth_chainId: chainId,
    net_version: networkId,
  });
}
