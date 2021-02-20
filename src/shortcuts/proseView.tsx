import React from 'react'
import { attributeEquals, simplifyPath } from '../selectors'
import { isDocumentEditable, pathToContext } from '../util'
import { toggleAttribute } from '../action-creators'
import { Icon as IconType, Shortcut } from '../types'
import { HOME_PATH } from '../constants'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill} style={style} viewBox='0 0 100 100'>
  <g>
    <path d='M97.2,24.3c-0.5-1.6-1.6-2.8-3.1-3.6l-13-6.5c-3-1.5-6.7-0.3-8.3,2.8L51.6,59.3c-0.4,0.8-0.6,1.6-0.6,2.4L50,79.9     c-0.1,2.4,1.2,4.7,3.4,5.8c0.9,0.4,1.8,0.7,2.8,0.7c1.4,0,2.8-0.5,3.9-1.4l13.9-11.6c0.7-0.6,1.2-1.2,1.6-2l21.2-42.3     C97.6,27.6,97.7,25.9,97.2,24.3z M79,21.7l10.4,5.2l-2,3.9L77,25.6L79,21.7z M57.8,77l0.4-9.4L65,71L57.8,77z M70.3,65.1     l-10.4-5.2l13.8-27.5L84,37.6L70.3,65.1z'/>
    <path d='M6.3,25.1H58c2.1,0,3.8-1.7,3.8-3.8c0-2.1-1.7-3.8-3.8-3.8H6.3c-2.1,0-3.8,1.7-3.8,3.8C2.5,23.3,4.2,25.1,6.3,25.1z'/>
    <path d='M52.3,39.6c0-2.1-1.7-3.8-3.8-3.8H6.3c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8h42.2C50.6,43.4,52.3,41.7,52.3,39.6     z'/>
    <path d='M40.5,54.1H6.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8h34.2c2.1,0,3.8-1.7,3.8-3.8S42.6,54.1,40.5,54.1z'/>
    <path d='M37.9,72.4H6.3c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8h31.6c2.1,0,3.8-1.7,3.8-3.8C41.7,74.1,40,72.4,37.9,72.4z'/>
  </g>
</svg>

const proseViewShortcut: Shortcut = {
  id: 'proseView',
  name: 'Prose View',
  description: 'Display the current context as indented paragraphs.',
  gesture: 'rudr',
  keyboard: { key: 'p', shift: true, alt: true },
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)
    const context = pathToContext(simplePath)

    dispatch(toggleAttribute({
      context,
      key: '=view',
      value: 'Prose'
    }))
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const context = pathToContext(cursor ? simplifyPath(state, cursor) : HOME_PATH)
    return attributeEquals(state, context, '=view', 'Prose')
  }
}

export default proseViewShortcut
