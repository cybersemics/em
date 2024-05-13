import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import strip from '../util/strip'
import editThought from './editThought'
import editing from './editing'
import newThought from './newThought'

/** Atomically insert multiple new thoughts. Excludes empty lines. */
const insertMultipleThoughts = _.curryRight(
  (state: State, { simplePath, lines }: { simplePath: SimplePath; lines: string[] }) =>
    reducerFlow(
      lines
        // strip lines
        .map(line => strip(line))
        // filter out empty lines
        .filter(x => x)
        // insert new thought
        .map(line => (state: State) => newThought(state, { value: line })),
    )(state),
)

/** Imports iOS speech-to-text as sepaate thoughts. Supports spoken "newline" to create a new thought. NOOP if speech-to-text is not detected. */
const importSpeechToText = _.curryRight(
  (state: State, { simplePath, value }: { simplePath: SimplePath; value: string }) => {
    // check for separate lines created via speech-to-text newlines
    // only after blur can we safely convert newlines to new thoughts without interrupting speeach-to-text
    const lines = value
      .split(/<div>/g)
      .map(line => line.replace('</div>', ''))
      .slice(1)

    if (lines.length === 0) return state

    const rank = getThoughtById(state, head(simplePath)).rank

    reducerFlow([
      // edit original thought to first line
      editThought({
        oldValue: value,
        newValue: lines[0],
        rankInContext: rank,
        path: simplePath,
      }),
      // insert remaining lines
      insertMultipleThoughts({ simplePath, lines: lines.slice(1) }),
      // set editing to false again, since inserting thoughts enables edit mode
      // TODO: There is a call to setCursor with editing: true that invalidates this line
      editing({ value: false }),
    ])(state)
  },
)

/** Action-creator for importSpeechToText. */
export const importSpeechToTextActionCreator =
  (payload: Parameters<typeof importSpeechToText>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'importSpeechToText', ...payload })

export default importSpeechToText
