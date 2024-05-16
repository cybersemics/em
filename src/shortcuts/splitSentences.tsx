import _ from 'lodash'
import { Dispatch } from 'react'
import { Action } from 'redux'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { splitSentencesActionCreator as splitSentences } from '../actions/splitSentences'
import { HOME_TOKEN } from '../constants'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import splitSentence from '../util/splitSentence'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <svg
    version='1.1'
    width={size}
    height={size}
    fill={fill}
    style={{ ...style, paddingTop: '8px' }}
    viewBox='0 0 110 115'
  >
    <g transform='scale(1.3)'>
      <path d='M68.841,14.24c-1.239,0.056-2.31,1.267-2.253,2.506c0.084,1.238,1.268,2.337,2.506,2.252h8.533   L49.072,47.606H16.489c-1.239,0.057-2.309,1.268-2.253,2.506c0.056,1.239,1.267,2.337,2.506,2.253H49.1l28.555,28.636h-8.562   c-1.238-0.027-2.394,1.127-2.394,2.365c0,1.268,1.155,2.394,2.394,2.394h14.278c1.268,0,2.394-1.126,2.394-2.394V69.063   c0.028-1.268-1.126-2.45-2.422-2.422c-1.239,0-2.365,1.154-2.337,2.422v8.56L53.408,50l27.599-27.65v8.588   c0,1.238,1.126,2.394,2.365,2.394c1.268,0,2.394-1.155,2.394-2.394V16.633c0-1.267-1.126-2.393-2.394-2.393H68.841z' />
    </g>
  </svg>
)

const splitSentencesShortcut: Shortcut = {
  id: 'splitSentences',
  label: 'Split Sentences',
  description: 'Splits multiple sentences in a single thought into separate thoughts.',
  keyboard: { key: 's', meta: true, shift: true },
  svg: Icon,
  canExecute: getState => !!getState().cursor,
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
    // check if splitSentences creates duplicates
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
