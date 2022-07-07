/** A link that creates a new thought.
 *
 * @param type {button|bullet} Default: bullet.
 */
import classNames from 'classnames'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import createThought from '../action-creators/createThought'
import cursorBack from '../action-creators/cursorBack'
import setCursor from '../action-creators/setCursor'
import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import asyncFocus from '../device/asyncFocus'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { getChildrenRanked } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import { store } from '../store'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'
import unroot from '../util/unroot'

interface NewThoughtProps {
  show?: boolean
  path: SimplePath
  cursor?: Path | null
  showContexts?: boolean
  label?: string
  value?: string
  type?: string
}

interface OnClickOptions {
  distance: number
  path: SimplePath
  showContexts?: boolean
  value: string
}

interface NewThoughtDispatchProps {
  onClick?: (options: OnClickOptions) => void
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: NewThoughtProps) => {
  const { cursor } = state
  const children = getChildrenRanked(state, head(props.path))
  return {
    cursor,
    show: !children.length || children[children.length - 1].value !== '',
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: Dispatch) => ({
  onClick: ({ distance, showContexts, path, value }: OnClickOptions) => {
    const state = store.getState()

    // do not preventDefault or stopPropagation as it prevents cursor

    // do not allow clicks if hidden by autofocus
    if (distance > 0) {
      dispatch(cursorBack())
      return
    }

    const newRank = getNextRank(state, head(path))

    const newThoughtId = createId()

    dispatch(
      createThought({
        path,
        addAsContext: showContexts,
        rank: newRank,
        value,
        id: newThoughtId,
      }),
    )

    asyncFocus()

    dispatch(
      setCursor({
        path: appendToPath(path, newThoughtId),
        offset: getTextContentFromHTML(value).length,
      }),
    )
  },
})

/** An input element for a new thought that mimics a normal thought. */
const NewThought = ({
  show,
  path,
  cursor,
  onClick,
  showContexts,
  label,
  value = '',
  type = 'bullet',
}: NewThoughtProps & NewThoughtDispatchProps) => {
  const depth = unroot(path).length
  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth - 1)) : 0

  return show ? (
    <ul style={{ marginTop: 0 }} className={'children-new distance-from-cursor-' + distance}>
      <li className='child leaf'>
        {type === 'bullet' ? <span className='bullet' /> : null}
        <div className='thought'>
          <a
            className={classNames({
              placeholder: type === 'bullet',
              button: type === 'button',
              'button-variable-width': type === 'button',
            })}
            onClick={() => onClick && onClick({ distance, showContexts, path, value })}
          >
            {label || <>Add a {showContexts ? 'context' : 'thought'}</>}
          </a>
        </div>
      </li>
    </ul>
  ) : null
}

export default connect(mapStateToProps, mapDispatchToProps)(NewThought)
