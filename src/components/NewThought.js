/** A link that creates a new thought.
 *
    @param type {button|bullet} Default: bullet.
 */
import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants'

// util
import {
  asyncFocus,
  pathToContext,
  rankThoughtsSequential,
  unroot,
} from '../util'

// selectors
import {
  getNextRank,
  getThoughtsRanked,
  pathToThoughtsRanked,
} from '../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {
  const { cursor } = state
  const children = getThoughtsRanked(state, props.path)
  return {
    cursor,
    show: !children.length || children[children.length - 1].value !== ''
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = dispatch => ({
  onClick: ({ distance, showContexts, path, value }) => {

    const state = store.getState()

    // do not preventDefault or stopPropagation as it prevents cursor

    // do not allow clicks if hidden by autofocus
    if (distance > 0) {
      dispatch({ type: 'cursorBack' })
      return
    }

    const context = pathToContext(path)
    const newRank = getNextRank(state, path)

    dispatch({
      type: 'newThoughtSubmit',
      context,
      addAsContext: showContexts,
      rank: newRank,
      value,
    })

    const parentThoughtsRanked = pathToThoughtsRanked(state, context)
    const childrenNew = getThoughtsRanked(state, pathToContext(parentThoughtsRanked))
    const newThought = childrenNew[childrenNew.length - 1]

    asyncFocus()
    dispatch({
      type: 'setCursor',
      thoughtsRanked: rankThoughtsSequential(unroot(context)).concat(newThought),
      offset: value.length
    })
  }
})

/** An input element for a new thought that mimics a normal thought. */
const NewThought = ({ show, path, cursor, onClick, showContexts, label, value = '', type = 'bullet' }) => {

  const context = pathToContext(path)
  const depth = unroot(context).length
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR,
      cursor.length - depth - 1
    )
  ) : 0

  return show ? <ul
    style={{ marginTop: 0 }}
    className={'children-new distance-from-cursor-' + distance}
  >
    <li className='child leaf'>
      {type === 'bullet' ? <span className='bullet' /> : null}
      <div className='thought'>
        <a className={classNames({
          placeholder: type === 'bullet',
          button: type === 'button',
          'button-variable-width': type === 'button',
        })}
        onClick={() => onClick({ distance, showContexts, path, value })}
        >{label || <React.Fragment>Add a {showContexts ? 'context' : 'thought'}</React.Fragment>}</a>
      </div>
    </li>
  </ul> : null
}

export default connect(mapStateToProps, mapDispatchToProps)(NewThought)
