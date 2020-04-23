/** Gets the published url of a given IPFS CID */
export const getPublishUrl = (cid: string) =>
  `${window.location.protocol}//${window.location.host}/?publish&src=ipfs.io/ipfs/${cid}`
