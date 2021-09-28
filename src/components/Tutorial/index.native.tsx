import React from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import WithCSSTransition from './WithCSSTransition'
import { shortcutById } from '../../shortcuts'
import { headValue, once } from '../../util'
import { getParent, getSetting } from '../../selectors'
import { tutorial } from '../../action-creators'
import { GesturePath, State } from '../../@types'
import { StyleSheet } from 'react-native'

// constants
import {
  HOME_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SUBTHOUGHT,
} from '../../constants'

// components
import TutorialStepComponentMap from './TutorialStepComponentMap'
import GestureDiagram from '../GestureDiagram'
import TutorialNavigation from './TutorialNavigation.native'
import { Text } from '../Text.native'
import { View } from 'moti'
import { fadeIn } from '../../style/animations'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { commonStyles } from '../../style/commonStyles'
import { doStringsMatch } from '../../util/doStringsMatch'

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThoughtOrOutdent')
if (!newThoughtShortcut) {
  throw new Error('newThoughtOrOutdent shortcut not found.')
}

const { from, animate } = fadeIn
const { smallText, alignItemsCenter } = commonStyles

/** Tutorial component. */
const Tutorial = () => {
  let { contextViews, cursor, rootChildren, tutorialChoice, tutorialStep } = useSelector((state: State) => {
    const { contextViews, cursor } = state
    return {
      contextViews,
      cursor,
      rootChildren: getParent(state, [HOME_TOKEN])?.children,
      tutorialChoice: +(getSetting(state, 'Tutorial Choice') || 0) as keyof typeof TUTORIAL_CONTEXT1_PARENT,
      tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
    }
  })

  const { getState } = useStore<State>()
  const state = getState()

  const dispatch = useDispatch()

  rootChildren = rootChildren || []

  const tutorialStepProps = {
    cursor,
    tutorialChoice,
    rootChildren,
    contextViews,
    dispatch,
    key: Math.floor(tutorialStep),
  }

  const tutorialStepComponent =
    TutorialStepComponentMap[Math.floor(tutorialStep) as keyof typeof TutorialStepComponentMap]

  const gesture = once(
    () =>
      ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
      tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT
        ? shortcutById('newThoughtOrOutdent')?.gesture
        : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT
        ? shortcutById('newSubthought')?.gesture
        : tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
        ? shortcutById('toggleContextView')?.gesture
        : null) || null) as GesturePath | null, // Why does it add 'string' to the type union without this?
  )

  return (
    <View
      from={from}
      animate={animate}
      transition={{
        type: 'timing',
        duration: 350,
      }}
      exit={{
        opacity: 0.5,
      }}
      style={styles.container}
    >
      <TouchableOpacity style={styles.closeButton} onPress={() => dispatch(tutorial({ value: false }))}>
        <Text style={smallText}>✕ close tutorial</Text>
      </TouchableOpacity>

      {tutorialStepComponent ? (
        WithCSSTransition({ component: tutorialStepComponent, ...tutorialStepProps })
      ) : (
        <Text>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</Text>
      )}

      {(tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
        tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
        tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
        tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ||
        tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT &&
          cursor &&
          doStringsMatch(headValue(state, cursor), TUTORIAL_CONTEXT1_PARENT[tutorialChoice])) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT &&
          cursor &&
          doStringsMatch(headValue(state, cursor), TUTORIAL_CONTEXT[tutorialChoice])) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT &&
          cursor &&
          doStringsMatch(headValue(state, cursor), TUTORIAL_CONTEXT1_PARENT[tutorialChoice])) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT &&
          cursor &&
          doStringsMatch(headValue(state, cursor), TUTORIAL_CONTEXT2_PARENT[tutorialChoice])) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT &&
          cursor &&
          doStringsMatch(headValue(state, cursor), TUTORIAL_CONTEXT[tutorialChoice]))) &&
      gesture() ? (
        <View style={alignItemsCenter}>
          <GestureDiagram path={gesture()!} size={40} strokeWidth={1} arrowSize={5} />
        </View>
      ) : null}

      <TutorialNavigation tutorialStep={tutorialStep} dispatch={dispatch} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#212121', padding: 10 },
  closeButton: { opacity: 0.5, alignItems: 'flex-end', padding: 5 },
})

export default Tutorial
