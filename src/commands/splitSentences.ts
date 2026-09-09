import _ from 'lodash'
import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { splitSentencesActionCreator as splitSentences } from '../actions/splitSentences'
import SplitSentencesIcon from '../components/icons/SplitSentencesIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import selectionOffsets from '../selectors/selectionOffsets'
import headValue from '../util/headValue'
import splitSentence from '../util/splitSentence'

const splitSentencesCommand = {
  id: 'splitSentences',
  label: 'Split Sentences' as const,
  description: 'Splits multiple sentences in a single thought into separate thoughts.',
  keyboard: { key: 's', meta: true, shift: true },
  gesture: 'dlr',
  multicursor: true,
  svg: SplitSentencesIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const value = cursor ? headValue(state, cursor) : undefined
    // A collapsed selection is the caret. A thought that has no delimiter to split on is split at the caret instead.
    // The offsets only belong to the thought that owns the selection: under a multiselect, every other thought reads
    // an empty range, so it is left alone unless a delimiter splits it.
    const offsets = selectionOffsets(state)
    const caretOffset = offsets && offsets.start === offsets.end ? offsets.start : null
    const sentences = value !== undefined ? splitSentence(value, caretOffset) : []

    if (sentences.length <= 1) {
      dispatch(alert('Nothing to split.'))
      return
    }

    dispatch(splitSentences({ caretOffset }))
  },
} satisfies Command

export default splitSentencesCommand
