/* eslint-disable react-hooks/rules-of-hooks */
import { shallowEqual, useSelector } from 'react-redux'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'

/** Helper hook that allows web and native to share selectors for the footer component. */
export const useFooterUseSelectors = () => {
  return useSelector(
    state => ({
      authenticated: state.authenticated,
      tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
      isTutorialOn: isTutorial(state),
      fontSize: state.fontSize,
    }),
    shallowEqual,
  )
}
