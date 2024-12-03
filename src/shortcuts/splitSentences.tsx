import _ from 'lodash'
import { Dispatch } from 'react'
import { Action } from 'redux'
import Command from '../@types/Command'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { splitSentencesActionCreator as splitSentences } from '../actions/splitSentences'
import SplitSentencesIcon from '../components/icons/SplitSentencesIcon'
import { HOME_TOKEN } from '../constants'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
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
    const value = headValue(state, cursor!)
    const sentences = splitSentence(value)

    if (!sentences || sentences.length <= 1) {
      dispatch(
        alert('Cannot split sentences: thought is an empty thought or has only one sentence.', {
          clearDelay: 3000,
        }),
      )
      return
    }

    const showContexts = cursor && isContextViewActive(state, rootedParentOf(state, cursor))
    const path =
      cursor &&
      (showContexts && cursor.length > 2
        ? parentOf(parentOf(cursor))
        : !showContexts && cursor.length > 1
          ? parentOf(cursor)
          : [HOME_TOKEN])
    const siblings = path && getAllChildrenAsThoughts(state, head(path)).map(({ value }) => value)
    const duplicates = _.intersection(sentences, siblings)
    if (duplicates.length !== 0) {
      dispatch(
        alert('Cannot split sentences: splitting creates duplicates.', {
          clearDelay: 3000,
        }),
      )
      return
    }

    dispatch(splitSentences())
  },
}

export default splitSentencesShortcut
