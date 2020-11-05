import React from 'react'
import { connect } from 'react-redux'
import { theme } from '../selectors'
import { State } from '../util/initialState'
import { Icon } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light'
})

/** An Undo icon. */
const UndoIcon = ({ dark, fill, size = 18, style }: Icon) =>
  <svg version='1.1' className={'icon'} xmlns='http://www.w3.org/2000/svg' x='0px' y='0px' width={size} height={size} fill={fill || (dark ? 'white' : 'black')} style={style} viewBox='0 -50 600 600'>
    <path d='m256 .00390625c-62.675781 0-123.605469 23.08203175-171.09375 62.26953175l-57.597656-57.597657c-4.585938-4.566406-11.457032-5.933593-17.429688-3.457031-5.972656 2.472656-9.878906 8.296875-9.878906 14.785156v138.664063c0 8.832031 7.167969 16 16 16h138.667969c6.484375 0 12.308593-3.902344 14.785156-9.875 2.472656-5.972657 1.109375-12.84375-3.480469-17.429688l-50.75-50.773437c39.445313-31.425782 89.363282-49.921875 140.777344-49.921875 117.632812 0 213.335938 95.703125 213.335938 213.335937 0 117.628906-95.703126 213.332032-213.335938 213.332032-56.9375 0-110.503906-22.207032-150.804688-62.527344-8.339843-8.34375-21.824218-8.34375-30.164062 0-8.34375 8.339844-8.34375 21.824218 0 30.164062 48.363281 48.382813 112.640625 75.03125 180.96875 75.03125 141.164062 0 256-114.839844 256-256 0-141.164062-114.835938-255.99999975-256-255.99999975zm0 0'></path>
  </svg>

export default connect(mapStateToProps)(UndoIcon)
