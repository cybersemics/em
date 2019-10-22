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
  AsyncFocus,
  cursorBack,
  getChildrenWithRank,
  getNextRank,
  rankItemsSequential,
  restoreSelection,
  unrank,
  unroot,
} from '../util.js'

const asyncFocus = AsyncFocus()

export const NewItem = connect(({ cursor }, props) => {
  const children = getChildrenWithRank(props.contextRanked)
  return {
    cursor,
    show: !children.length || children[children.length - 1].key !== ''
  }
})(({ show, contextRanked, cursor, showContexts, label, value='', type = 'bullet', dispatch }) => {

  const context = unrank(contextRanked)
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
    <li className='thought leaf'>
      {type === 'bullet' ? <span className='bullet' /> : null}
      <div className='thought'>
        <a className={classNames({
            placeholder: type ==='bullet',
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

            const newRank = getNextRank(contextRanked)

            dispatch({
              type: 'newItemSubmit',
              context,
              addAsContext: showContexts,
              rank: newRank,
              value
            })

            globals.disableOnFocus = true
            asyncFocus.enable()
            setTimeout(() => {
              globals.disableOnFocus = false
              restoreSelection(rankItemsSequential(unroot(context)).concat({ key: value, rank: newRank }), { offset: value.length })
            }, RENDER_DELAY)

          }}
        >{label || <React.Fragment>Add a {showContexts ? 'context' : 'thought'}</React.Fragment>}</a>
      </div>
    </li>
  </ul> : null
})

