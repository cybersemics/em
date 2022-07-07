/* eslint-disable react-hooks/rules-of-hooks */
import { shallowEqual, useSelector } from 'react-redux'
import State from '../@types/State'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'

/** Helper hook that allows web and native to share selectors for the footer component. */
export const useFooterUseSelectors = () => {
  return useSelector(
    (state: State) => ({
      authenticated: state.authenticated,
      user: state.user,
      status: state.status,
      tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
      isPushing: state.isPushing,
      isTutorialOn: isTutorial(state),
      fontSize: state.fontSize,
      isPushQueueEmpty: state.pushQueue.length === 0,
    }),
    shallowEqual,
  )
}
