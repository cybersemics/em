import classNames from 'classnames'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { createThoughtActionCreator as createThought } from '../actions/createThought'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import asyncFocus from '../device/asyncFocus'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { getChildrenRanked } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import fastClick from '../util/fastClick'
import head from '../util/head'
import unroot from '../util/unroot'

interface NewThoughtProps {
  path: SimplePath
  showContexts?: boolean
  label?: string
  value?: string
  type?: string
}

/** An input element for a new thought that mimics a normal thought. */
const NewThought = ({ path, showContexts, label, value = '', type = 'bullet' }: NewThoughtProps) => {
  const depth = unroot(path).length
  const cursor = useSelector(state => state.cursor)
  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth - 1)) : 0
  const dispatch = useDispatch()
  const show = useSelector((state: State) => {
    const children = getChildrenRanked(state, head(path))
    return !children.length || children[children.length - 1].value !== ''
  })

  /** Handles the click event. */
  const onClick = useCallback(() => {
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
  }, [dispatch, distance, path, value])

  return show ? (
    <ul style={{ marginTop: 0 }} className={'children-new'}>
      <li className='child leaf'>
        {type === 'bullet' ? <span className='bullet' /> : null}
        <div className='thought'>
          <a
            className={classNames({
              placeholder: type === 'bullet',
              button: type === 'button',
              'button-variable-width': type === 'button',
            })}
            {...fastClick(onClick)}
          >
            {label || <>Add a {showContexts ? 'context' : 'thought'}</>}
          </a>
        </div>
      </li>
    </ul>
  ) : null
}

export default NewThought
