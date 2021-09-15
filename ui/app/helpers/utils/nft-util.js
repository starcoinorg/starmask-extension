import { ethers } from 'ethers';

const { arrayify } = ethers.utils;

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
        return reject(new Error('invalid token code'));
      },
    );
  });
  Object.keys(metaInfo).forEach(
    (key) => (metaInfo[key] = Buffer.from(arrayify(metaInfo[key])).toString()),
  );
  return Promise.resolve(metaInfo);
}
