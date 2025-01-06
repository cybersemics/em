import store from '../stores/app'

/** Dispatches actions on the global store in an act block. */
const skipTutorial = () => {
  store.dispatch([
    // skip tutorial
    { type: 'tutorial', value: false },

    // close welcome modal
    { type: 'closeModal' },
  ])
}

export default skipTutorial
