export function createTokenTrackerLinkForChain(
    tokenAddress,
    blockExplorerUrl,
    holderAddress,
) {
    return `${blockExplorerUrl}/token/${tokenAddress}`;
}
