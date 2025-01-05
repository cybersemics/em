import _ from 'lodash'
import { Dispatch } from 'react'
import { Action } from 'redux'
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { splitSentencesActionCreator as splitSentences } from '../actions/splitSentences'
import SplitSentencesIcon from '../components/icons/SplitSentencesIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import headValue from '../util/headValue'
import splitSentence from '../util/splitSentence'

const splitSentencesShortcut: Command = {
  id: 'splitSentences',
  label: 'Split Sentences',
  description: 'Splits multiple sentences in a single thought into separate thoughts.',
  keyboard: { key: 's', meta: true, shift: true },
  multicursor: true,
  svg: SplitSentencesIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: (dispatch: Dispatch<Action | Thunk>, getState) => {
    const state = getState()
    const { cursor } = state
    const value = cursor && headValue(state, cursor)
    const sentences = value ? splitSentence(value) : []

    if (sentences.length <= 1) {
      dispatch(
        alert('Cannot split sentences: thought is an empty thought or has only one sentence.', {
          clearDelay: 3000,
        }),
      )
      return
    }

    dispatch(splitSentences())
  },
}

export default splitSentencesShortcut
