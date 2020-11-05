import React from 'react'
import { connect } from 'react-redux'
import { theme } from '../selectors'
import { State } from '../util/initialState'
import { Icon } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light'
})

/** A redo icon. */
const RedoIcon = ({ dark, fill, size = 18, style }: Icon) =>
  <svg version='1.1' className={'icon'} xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill || (dark ? 'white' : 'black')} style={style} viewBox='0 -50 600 600'>
    <path d='m502.121094 1.214844c-5.972656-2.453125-12.863282-1.109375-17.429688 3.476562l-57.597656 57.601563c-47.488281-39.210938-108.417969-62.292969-171.09375-62.292969-141.164062 0-256 114.835938-256 256s114.835938 256 256 256c68.332031 0 132.609375-26.644531 180.96875-75.03125 8.34375-8.339844 8.34375-21.820312 0-30.164062-8.339844-8.339844-21.820312-8.339844-30.164062 0-40.296876 40.320312-93.867188 62.527343-150.804688 62.527343-117.632812 0-213.332031-95.699219-213.332031-213.332031s95.699219-213.332031 213.332031-213.332031c51.414062 0 101.332031 18.496093 140.777344 49.917969l-50.75 50.773437c-4.585938 4.585937-5.929688 11.457031-3.476563 17.429687 2.472657 5.972657 8.296875 9.878907 14.78125 9.878907h138.667969c8.832031 0 16-7.167969 16-16v-138.667969c0-6.484375-3.902344-12.308594-9.878906-14.785156zm0 0'></path>
  </svg>

export default connect(mapStateToProps)(RedoIcon)
