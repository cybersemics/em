import reactMinistore from './react-ministore'
import storageModel from './storageModel'

/** A ministore for whether the Formatting Bar pickers show their descriptions. Shared by every picker, so toggling the info button in one shows or hides the description in all of them. Initialized from and persisted to local storage. */
const formattingBarPopoverInfoStore = reactMinistore(storageModel.get('formattingBarPopoverInfoOpen'))

// persist the toggle so it survives a reload
formattingBarPopoverInfoStore.subscribe(() =>
  storageModel.set('formattingBarPopoverInfoOpen', formattingBarPopoverInfoStore.getState()),
)

export default formattingBarPopoverInfoStore
