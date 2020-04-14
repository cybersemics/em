
import TutorialStepStart from './TutorialStepStart'
import TutorialStepFirstThought from './TutorialStepFirstThought'
import TutorialStepFirstThoughtEnter from './TutorialStepFirstThoughtEnter'
import TutorialStepSecondThought from './TutorialStepSecondThought'
import TutorialStepSecondThoughtEnter from './TutorialStepSecondThoughtEnter'
import TutorialStepSubThought from './TutorialStepSubThought'
import TutorialStepSubThoughtEnter from './TutorialStepSubThoughtEnter'
import TutorialStepAutoExpand from './TutorialStepAutoExpand'
import TutorialStepAutoExpandExpand from './TutorialStepAutoExpandExpand'
import TutorialStepSuccess from './TutorialStepSuccess'
import Tutorial2StepStart from './Tutorial2StepStart'
import Tutorial2StepChoose from './Tutorial2StepChoose'
import Tutorial2StepContext1Parent from './Tutorial2StepContext1Parent'
import Tutorial2StepContext1 from './Tutorial2StepContext1'
import Tutorial2StepContext1SubThought from './Tutorial2StepContext1SubThought'
import Tutorial2StepContext2Parent from './Tutorial2StepContext2Parent'
import Tutorial2StepContext2 from './Tutorial2StepContext2'
import Tutorial2StepContext2Subthought from './Tutorial2StepContext2Subthought'
import Tutorial2StepContextViewSelect from './Tutorial2StepContextViewSelect'
import Tutorial2StepContextViewToggle from './Tutorial2StepContextViewToggle'
import Tutorial2StepContextViewOpen from './Tutorial2StepContextViewOpen'
import Tutorial2StepContextViewExamples from './Tutorial2StepContextViewExamples'
import Tutorial2StepSuccess from './Tutorial2StepSuccess'

// constants
import {
  TUTORIAL2_STEP_CHOOSE,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_SUCCESS,
} from '../../constants'

export default {

  [TUTORIAL_STEP_START]: TutorialStepStart,

  [TUTORIAL_STEP_FIRSTTHOUGHT]: TutorialStepFirstThought,

  [TUTORIAL_STEP_FIRSTTHOUGHT_ENTER]: TutorialStepFirstThoughtEnter,

  [TUTORIAL_STEP_SECONDTHOUGHT]: TutorialStepSecondThought,

  [TUTORIAL_STEP_SECONDTHOUGHT_ENTER]: TutorialStepSecondThoughtEnter,

  [TUTORIAL_STEP_SUBTHOUGHT]: TutorialStepSubThought,

  [TUTORIAL_STEP_SUBTHOUGHT_ENTER]: TutorialStepSubThoughtEnter,

  [TUTORIAL_STEP_AUTOEXPAND]: TutorialStepAutoExpand,

  [TUTORIAL_STEP_AUTOEXPAND_EXPAND]: TutorialStepAutoExpandExpand,

  [TUTORIAL_STEP_SUCCESS]: TutorialStepSuccess,

  // Part II: Connected Thoughts

  [TUTORIAL2_STEP_START]: Tutorial2StepStart,

  [TUTORIAL2_STEP_CHOOSE]: Tutorial2StepChoose,

  [TUTORIAL2_STEP_CONTEXT1_PARENT]: Tutorial2StepContext1Parent,

  [TUTORIAL2_STEP_CONTEXT1]: Tutorial2StepContext1,

  [TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT]: Tutorial2StepContext1SubThought,

  [TUTORIAL2_STEP_CONTEXT2_PARENT]: Tutorial2StepContext2Parent,

  [TUTORIAL2_STEP_CONTEXT2]: Tutorial2StepContext2,

  [TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT]: Tutorial2StepContext2Subthought,

  [TUTORIAL2_STEP_CONTEXT_VIEW_SELECT]: Tutorial2StepContextViewSelect,

  [TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE]: Tutorial2StepContextViewToggle,

  [TUTORIAL2_STEP_CONTEXT_VIEW_OPEN]: Tutorial2StepContextViewOpen,

  [TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES]: Tutorial2StepContextViewExamples,

  [TUTORIAL2_STEP_SUCCESS]: Tutorial2StepSuccess,

}
