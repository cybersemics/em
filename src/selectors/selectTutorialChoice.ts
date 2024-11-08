import State from '../@types/State'
import { TUTORIAL_CONTEXT1_PARENT } from '../constants'
import getSettingMemoized from './getSetting'

/** Returns the choice that the user has made in Tutorial 2: To Do, Journal, or Book/Podcast. */
const selectTutorialChoice = (state: State) => {
  const choice = +(getSettingMemoized(state, 'Tutorial Choice') || 0)
  // guard against invalid tutorialChoice and tutorialStep in case Settings/Tutorial Step is corrupted
  return (isNaN(choice) ? 0 : choice) as keyof typeof TUTORIAL_CONTEXT1_PARENT
}

export default selectTutorialChoice
