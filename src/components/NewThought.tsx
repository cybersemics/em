/** A link that creates a new thought.
 *
 * @param type {button|bullet} Default: bullet.
 */
import React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { appendToPath, asyncFocus, getTextContentFromHTML, hashContext, pathToContext, unroot } from '../util'
import { getNextRank, getChildrenRanked } from '../selectors'
import { cursorBack, createThought, setCursor } from '../action-creators'
import { Path, SimplePath, State } from '../@types'

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
  const children = getChildrenRanked(state, pathToContext(props.path))
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

    const context = pathToContext(path)
    const newRank = getNextRank(state, pathToContext(path))

    dispatch(
      createThought({
        context,
        addAsContext: showContexts,
        rank: newRank,
        value,
      }),
    )

    asyncFocus()

    dispatch(
      setCursor({
        path: appendToPath(path, { id: hashContext(unroot([...pathToContext(path), value])), rank: newRank, value }),
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
  const context = pathToContext(path)
  const depth = unroot(context).length
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
