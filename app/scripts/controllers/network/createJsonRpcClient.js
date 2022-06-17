import { createAsyncMiddleware, mergeMiddleware } from 'json-rpc-engine';
import createFetchMiddleware from '@starcoin/stc-json-rpc-middleware/fetch';
import createBlockRefRewriteMiddleware from '@starcoin/stc-json-rpc-middleware/block-ref-rewrite';
import createBlockCacheMiddleware from '@starcoin/stc-json-rpc-middleware/block-cache';
import createInflightMiddleware from '@starcoin/stc-json-rpc-middleware/inflight-cache';
import createBlockTrackerInspectorMiddleware from '@starcoin/stc-json-rpc-middleware/block-tracker-inspector';
import providerFromMiddleware from '@starcoin/stc-json-rpc-middleware/providerFromMiddleware';
import { PollingBlockTracker } from '@starcoin/stc-block-tracker';
import { hexToDecimal } from '../../../../ui/app/helpers/utils/conversions.util';

const inTest = process.env.IN_TEST === 'true';
const blockTrackerOpts = inTest ? { pollingInterval: 30000 } : {};
const getTestMiddlewares = () => {
  return inTest ? [createEstimateGasDelayTestMiddleware()] : [];
};

export default function createJsonRpcClient({ rpcUrl, chainId }) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl });
  const blockProvider = providerFromMiddleware(fetchMiddleware);
  const blockTracker = new PollingBlockTracker({
    ...blockTrackerOpts,
    provider: blockProvider,
  });

  const networkMiddleware = mergeMiddleware([
    ...getTestMiddlewares(),
    createChainIdMiddleware(chainId),
    createBlockRefRewriteMiddleware({ blockTracker }),
    createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    fetchMiddleware,
  ]);

  return { networkMiddleware, blockTracker };
}

function createChainIdMiddleware(chainId) {
  return (req, res, next, end) => {
    if (req.method === 'chain.id') {
      res.result = { name: chainId, id: Number(hexToDecimal(chainId)) };
      return end();
    }
    return next();
  };
}

/**
 * For use in tests only.
 * Adds a delay to `eth_estimateGas` calls.
 */
function createEstimateGasDelayTestMiddleware() {
  return createAsyncMiddleware(async (req, _, next) => {
    if (req.method === 'eth_estimateGas') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return next();
  });
}
