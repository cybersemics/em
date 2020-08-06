import React, { CSSProperties, RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface DropEndProps {
    innerRef: RefObject<any>,
    style: CSSProperties,
    showIndicator: boolean,
    color: string,
}

/**
 * Drop End component.
 */
const DropEnd = ({ innerRef, style, showIndicator, color }: DropEndProps) => {
  return (
    <AnimatePresence>
      <motion.div
        ref={innerRef}
        exit={{}}
        transition={{ duration: 0.3 }} // delay exit to prevent memory leak React error
        style={{
          position: 'absolute',
          transform: 'translateX(0.4rem)',
          height: '1.2rem',
          width: 'calc(100% - 0.4rem)',
          bottom: 0,
          ...style
        }}
      >
        <AnimatePresence>
          {
            showIndicator &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ background: color, position: 'initial' }}
            className='drop-hover-new'>
          </motion.div>
          }
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

export default DropEnd
