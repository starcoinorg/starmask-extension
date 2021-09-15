import { ethers } from 'ethers';
import { bcs, utils } from '@starcoin/starcoin';

const { arrayify, hexlify } = ethers.utils;

export const GENESIS_NFT_IMAGE = '';

export async function getNFTGalleryInfo(meta) {
  const metaInfo = await new Promise((resolve, reject) => {
    return global.ethQuery.sendAsync(
      {
        method: 'state.get_resource',
        params: ['0x1', `0x1::NFT::NFTTypeInfoV2<${meta}>`, { decode: true }],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (result && result.json) {
          return resolve(result.json.meta);
        }
        return reject(new Error('invalid nft meta'));
      },
    );
  });
  Object.keys(metaInfo).forEach(
    (key) => (metaInfo[key] = Buffer.from(arrayify(metaInfo[key])).toString()),
  );
  return Promise.resolve(metaInfo);
}

export async function generateAcceptNFTGalleryPayloadHex(meta, body, rpcUrl) {
  const functionId = '0x1::NFTGalleryScripts::accept';
  const tyArgs = [meta, body];
  const args = [];

  const scriptFunction = await utils.tx.encodeScriptFunctionByResolve(
    functionId,
    tyArgs,
    args,
    rpcUrl,
  );

  const payloadInHex = (function () {
    const se = new bcs.BcsSerializer();
    scriptFunction.serialize(se);
    return hexlify(se.getBytes());
  })();

  return payloadInHex;
}
