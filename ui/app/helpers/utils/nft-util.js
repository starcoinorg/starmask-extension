import { ethers } from 'ethers';
import { bcs, utils } from '@starcoin/starcoin';

const { arrayify, hexlify } = ethers.utils;

export const GENESIS_NFT_IMAGE = '';

export function decodeNFTMeta(hex) {
  return Buffer.from(arrayify(hex)).toString();
}

export async function getNFTGalleryInfo(meta, body) {
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
        if (result === null && body) {
          return global.ethQuery.sendAsync(
            {
              method: 'state.get_resource',
              params: ['0x1', `0x1::NFT::NFTTypeInfo<${meta}, ${body}>`, { decode: true }],
            },
            (error2, result2) => {
              if (error2) {
                return reject(error2);
              }
              if (result2 && result2.json) {
                return resolve(result2.json.meta);
              }
              return reject(new Error('invalid nft meta'));
            },
          );
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

  const payloadInHex = await generateScriptFunctionPayloadHex(
    functionId,
    tyArgs,
    args,
    rpcUrl,
  );

  return payloadInHex;
}

export async function generateTransferNFTPayloadHex(
  meta,
  body,
  id,
  to,
  rpcUrl,
) {
  const functionId = '0x1::NFTGalleryScripts::transfer';
  const tyArgs = [meta, body];
  const args = [id, to];

  const payloadInHex = await generateScriptFunctionPayloadHex(
    functionId,
    tyArgs,
    args,
    rpcUrl,
  );

  return payloadInHex;
}

async function generateScriptFunctionPayloadHex(
  functionId,
  tyArgs,
  args,
  rpcUrl,
) {
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

export function imageSourceUrls(imageUrl) {
  const ipfsGatewayAPIs = [
    'https://ipfs.infura.io:5001/api/v0/cat?arg=',
    // 'https://dweb.link',
    // 'https://cloudflare-ipfs.com',
    // 'https://gateway.pinata.cloud',
  ];
  const urls = [];
  if (imageUrl && imageUrl.length && imageUrl.indexOf('ipfs') === 0) {
    const hash = imageUrl.split('//')[1];
    ipfsGatewayAPIs.forEach((api) => urls.push(`${api}${hash}`));
  } else {
    urls.push(imageUrl);
  }
  return urls;
}
