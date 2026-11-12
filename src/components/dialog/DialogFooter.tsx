import { MotionValue, motion } from 'motion/react'
import { PropsWithChildren } from 'react'

/** The area below the dialog's glass sheet, for content that sits outside the glass, such as keyboard hints. Takes its own opacity, since an opacity on a shared ancestor would also fade the glass blur and break its alignment. */
const DialogFooter = ({ children, opacity }: PropsWithChildren<{ opacity?: MotionValue<number> }>) => (
  <motion.div style={{ opacity }}>{children}</motion.div>
)

export default DialogFooter
