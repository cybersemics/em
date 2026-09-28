import ministore from './ministore'

/** The maximum size of the thoughtIndex before freeThoughts kicks in to free memory. A constant in production; a ministore so that a test can lower it and resetStores restores it afterwards. */
// e.g. Art • Buddhist Art • :: • Regions • China • Period • Era of North-South division • North • East • Northern Qi
// = 455 thoughts loaded into memory
const freeThoughtsThresholdStore = ministore(500)

export default freeThoughtsThresholdStore
