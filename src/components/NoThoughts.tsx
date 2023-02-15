import React from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import State from '../@types/State'
import { isTouch } from '../browser'
import { TUTORIAL_STEP_FIRSTTHOUGHT } from '../constants'
import getSetting from '../selectors/getSetting'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import offlineStatusStore from '../stores/offlineStatusStore'
import GestureDiagram from './GestureDiagram'
import LoadingEllipsis from './LoadingEllipsis'

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
if (!newThoughtShortcut) {
  throw new Error('newThought shortcut not found.')
}

/** An absolutely centered LoadingEllipsis. */
const CenteredLoadingEllipsis = ({ text }: { text?: string }) => (
  <div className='absolute-center'>
    <i className='text-note'>
      <LoadingEllipsis text={text} />
    </i>
  </div>
)

/** Display platform-specific instructions of how to create a thought when a context has no thoughts. */
const NoThoughts = ({ isTutorial }: { isTutorial?: boolean }) => {
  /*
    Determining when to show the loader is nontrivial due to many loading states of local and remote, connection and authentication status, and pending thoughts.

    state.status and state.isLoading are very fragile. They are coupled to pull, updateThoughts, and NoThoughts.

    Related:
    - https://github.com/cybersemics/em/issues/1344
    - https://github.com/cybersemics/em/pull/1345
  */
  const isLoading = useSelector((state: State) => state.isLoading)
  const status = offlineStatusStore.useState()

  const tutorialStep = useSelector((state: State) => +(getSetting(state, 'Tutorial Step') || 0))

  const colors = useSelector(themeColors)

  return (
    <div className='new-thought-instructions'>
      {
        // show nothing during the preconnecting phase (See: useOfflineStatus)
        status === 'preconnecting' ? null : status === 'connecting' || isLoading ? (
          // show loading ellipsis when loading
          <CenteredLoadingEllipsis text={status === 'connecting' ? 'Connecting' : 'Loading'} />
        ) : // tutorial no children
        // show special message when there are no children in tutorial
        isTutorial ? (
          tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isTouch ? (
            <div className='center-in-content'>
              <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
            </div>
          ) : // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
          null
        ) : (
          // default
          <>
            <span style={{ userSelect: 'none' }}>
              {isTouch ? (
                <span className='gesture-container'>
                  Swipe{' '}
                  <GestureDiagram path={newThoughtShortcut.gesture as GesturePath} size={30} color={colors.gray66} />
                </span>
              ) : (
                <span>Hit the Enter key</span>
              )}{' '}
              to add a new thought.
            </span>
          </>
        )
      }
    </div>
  )
}

const NoThoughtsMemo = React.memo(NoThoughts)
NoThoughtsMemo.displayName = 'NoThoughts'

export default NoThoughtsMemo
