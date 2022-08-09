import React from 'react';
import {
  imageSourceUrls,
} from '../../../helpers/utils/nft-util';


const renderPicture = (image, imageData) => {
  const imageSources = (imageUrl) => {
    const urls = imageSourceUrls(imageUrl);
    return urls.map((url, index) => (
      <source key={`${ imageUrl }-${ index }`} srcSet={url} />
    ));
  };

  const picture = (
    <picture>
      {image && imageSources(image)}
      {imageData && <source key="imageData" srcSet={imageData} />}
      <img src="/images/imagenotfound.svg" />
    </picture>
  );
  return picture;
}

const NFTIdentifierCard = ({ nft }) => {
  const item = nft.items[0];
  return (
    <div className="nft-list__photo-card">
      {renderPicture(item.image, item.imageData)}
      <div className="nft-list__photo-card_body">{item.name}</div>
      <div className="nft-list__photo-card_description">
        {item.description}
      </div>
    </div>
  );
}

export default NFTIdentifierCard;
