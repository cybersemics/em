import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

/**
 * Content for dialog box.
 */
const DialogContent: React.FC<PropsWithChildren> = ({ children }) => {
  const dialog = dialogRecipe()
  return (
    <div className={dialog.content}>
      <div className={dialog.contentInner}>
        {children}
        <div className={dialog.contentBottomSpacer} />
      </div>
    </div>
  )
}

export default DialogContent
