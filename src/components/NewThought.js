/** A link that creates a new thought.
    @param type {button|bullet} Default: bullet.
*/

import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import globals from '../globals.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  asyncFocus,
  cursorBack,
  getChildrenWithRank,
  getNextRank,
  rankThoughtsSequential,
  restoreSelection,
  pathToContext,
  unroot,
} from '../util.js'

export const NewThought = connect(({ cursor }, props) => {
  const children = getChildrenWithRank(props.path)
  return {
    cursor,
    show: !children.length || children[children.length - 1].value !== ''
  }
})(({ show, path, cursor, showContexts, label, value = '', type = 'bullet', dispatch }) => {

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
          onClick={() => {
            // do not preventDefault or stopPropagation as it prevents cursor

            // do not allow clicks if hidden by autofocus
            if (distance > 0) {
              cursorBack()
              return
            }

            const newRank = getNextRank(path)

            dispatch({
              type: 'newThoughtSubmit',
              context,
              addAsContext: showContexts,
              rank: newRank,
              value
            })

            globals.disableOnFocus = true
            asyncFocus.enable()
            setTimeout(() => {
              globals.disableOnFocus = false
              restoreSelection(rankThoughtsSequential(unroot(context)).concat({ value, rank: newRank }), { offset: value.length })
            }, RENDER_DELAY)

          }}
        >{label || <React.Fragment>Add a {showContexts ? 'context' : 'thought'}</React.Fragment>}</a>
      </div>
    </li>
  </ul> : null
})
