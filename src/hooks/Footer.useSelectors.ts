/* eslint-disable react-hooks/rules-of-hooks */
import { useSelector } from 'react-redux'
import {
  isTutorial,
  authenticatedSelector,
  userSelector,
  statusSelector,
  tutorialStepSelector,
  fontSizeSelector,
  isPushingSelector,
  pushQueueLengthSelector,
} from '../selectors'

import { useShallowEqualSelector } from './useShallowEqualSelector'

/** Helper hook that allows web and native to share selectors for the footer component. */
export const useFooterUseSelectors = () => {
  const authenticated = useSelector(authenticatedSelector)
  const user = useShallowEqualSelector(userSelector)
  const status = useSelector(statusSelector)
  const tutorialStep = useSelector(tutorialStepSelector)
  const isPushing = useSelector(isPushingSelector)
  const isTutorialOn = useSelector(isTutorial)
  const fontSize = useSelector(fontSizeSelector)
  const pushQueueLength = useSelector(pushQueueLengthSelector)

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
