/* eslint-disable react-hooks/rules-of-hooks */
import { useSelector } from 'react-redux'
import { getSetting, isTutorial, userSelector } from '../selectors'

import { State } from '../util/initialState'
import { useShallowEqualSelector } from './useShallowEqualSelector'

/** Helper hook that allows web and native to share selectors for the footer component. */
export const useFooterUseSelectors = () => {
  const authenticated = useSelector((state: State) => state.authenticated)
  const user = useShallowEqualSelector(userSelector)
  const status = useSelector((state: State) => state.status)
  const tutorialStep = useSelector((state: State) => +(getSetting(state, 'Tutorial Step') || 1))
  const isPushing = useSelector((state: State) => state.isPushing)
  const isTutorialOn = useSelector(isTutorial)
  const fontSize = useSelector((state: State) => state.fontSize)
  const pushQueueLength = useSelector((state: State) => state.pushQueue.length)

  return {
    authenticated,
    user,
    status,
    tutorialStep,
    isPushing,
    isTutorialOn,
    pushQueueLength,
    fontSize,
  }
}
