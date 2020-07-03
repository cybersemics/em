import {
  IPFS_GATEWAY,
} from '../constants'

/** Gets the published url of a given IPFS CID. Use Infura so that newly added content through the Infura API is immediately available. */
export const getPublishUrl = (cid: string) =>
  `${window.location.protocol}//${window.location.host}/?publish&src=${IPFS_GATEWAY}/ipfs/${cid}`
