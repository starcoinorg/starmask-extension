import { ethErrors } from 'eth-rpc-errors';
import { omit } from 'lodash';
import { MESSAGE_TYPE } from '../../../../../shared/constants/app';
import {
  STC_SYMBOL,
  APTOS_SYMBOL,
  CHAIN_ID_TO_TYPE_MAP,
  NETWORK_TO_NAME_MAP,
  CHAIN_ID_TO_RPC_URL_MAP,
  NETWORK_CHAIN_ID_TO_NAME_MAP,
} from '../../../../../shared/constants/network';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../../../../shared/modules/network.utils';
import log from 'loglevel';

const switchStarcoinChain = {
  methodNames: [MESSAGE_TYPE.SWITCH_STARCOIN_CHAIN],
  implementation: switchEthereumChainHandler,
  hookNames: {
    getCurrentChainId: true,
    findCustomRpcBy: true,
    setProviderType: true,
    updateRpcTarget: true,
    requestUserApproval: true,
  },
};
export default switchStarcoinChain;

function findExistingNetwork(chainId, findCustomRpcBy, networkType) {
  if (chainId in CHAIN_ID_TO_TYPE_MAP) {
    const name = NETWORK_CHAIN_ID_TO_NAME_MAP[networkType][chainId]
    return {
      chainId,
      ticker: networkType === 'STARCOIN' ? STC_SYMBOL : APTOS_SYMBOL,
      nickname: NETWORK_TO_NAME_MAP[name],
      rpcUrl: CHAIN_ID_TO_RPC_URL_MAP[name],
      type: name,
    };
  }

  return findCustomRpcBy({ chainId });
}

async function switchEthereumChainHandler(
  req,
  res,
  _next,
  end,
  {
    getCurrentChainId,
    findCustomRpcBy,
    setProviderType,
    updateRpcTarget,
    requestUserApproval,
  },
) {
  if (!req.params?.[0] || typeof req.params[0] !== 'object') {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected single, object parameter. Received:\n${ JSON.stringify(
          req.params,
        ) }`,
      }),
    );
  }

  const { origin } = req;

  const { chainId } = req.params[0];

  const { networkType = 'STARCOIN' } = req.params[0];

  const otherKeys = Object.keys(omit(req.params[0], ['chainId', 'networkType']));

  if (otherKeys.length > 0) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Received unexpected keys on object parameter. Unsupported keys:\n${ otherKeys }`,
      }),
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

  if (!isPrefixedFormattedHexString(_chainId)) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${ chainId }`,
      }),
    );
  }

  if (!isSafeChainId(parseInt(_chainId, 16))) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Invalid chain ID "${ _chainId }": numerical value greater than max safe value. Received:\n${ chainId }`,
      }),
    );
  }

  const requestData = findExistingNetwork(_chainId, findCustomRpcBy, networkType);
  if (requestData) {
    const currentChainId = getCurrentChainId();

    if (currentChainId === _chainId) {
      res.result = null;
      return end();
    }
    try {
      const approvedRequestData = await requestUserApproval({
        origin,
        type: MESSAGE_TYPE.SWITCH_STARCOIN_CHAIN,
        requestData,
      });
      if (chainId in CHAIN_ID_TO_TYPE_MAP) {
        setProviderType(approvedRequestData.type);
      } else {
        await updateRpcTarget(approvedRequestData);
      }
      res.result = null;
    } catch (error) {
      return end(error);
    }
    return end();
  }
  return end(
    ethErrors.provider.custom({
      code: 4902, // To-be-standardized "unrecognized chain ID" error
      message: `Unrecognized chain ID "${ chainId }". Try adding the chain using ${ MESSAGE_TYPE.ADD_ETHEREUM_CHAIN } first.`,
    }),
  );
}
