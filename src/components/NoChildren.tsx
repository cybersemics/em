
import React from 'react'
import { motion } from 'framer-motion'
import { Path } from '../types'
import GestureDiagram from './GestureDiagram'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts'
import { isMobile } from '../browser'
import { headValue } from '../util'

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')

const framerTransition = { duration: 0.1 }

/** A message that says there are no children in this context. */
const NoChildren = ({ allowSingleContext, childrenLength, thoughtsRanked }: { allowSingleContext: boolean, childrenLength: number, thoughtsRanked: Path }) =>
  <motion.div
    layout
    className='children-subheading text-note text-small'
    style={{ marginLeft: '1.5rem' }}
    transition={framerTransition}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}>

    This thought is not found in any {childrenLength === 0 ? '' : 'other'} contexts.<br /><br />

    <span>{isMobile
      ? <span className='gesture-container'>Swipe <GestureDiagram path={subthoughtShortcut.gesture} size={30} color='darkgray' /></span>
      : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard)}</span>
    } to add "{headValue(thoughtsRanked)}" to a new context.
    </span>

    <br />{allowSingleContext
      ? 'A floating context... how interesting.'
      : <span>{isMobile
        ? <span className='gesture-container'>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture} size={30} color='darkgray'/* mtach .children-subheading color */ /></span>
        : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard)}</span>
      } to return to the normal view.</span>
    }
  </motion.div>

export default NoChildren
