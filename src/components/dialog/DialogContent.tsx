import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

/**
 * Content for dialog box.
 */
const DialogContent: React.FC<PropsWithChildren> = ({ children }) => {
  const dialogClasses = dialogRecipe()

  return (
    <div className={dialogClasses.content}>
      {children}
      {/* 
          The 'gradient' slot provides a visual cue that the dialog is scrollable.
          This spacer div at the end of the content, styled by 'contentBottomSpacer', 
          adds a small buffer to ensure the last piece of actual content 
          is clearly visible above where the gradient effect begins.
      */}
      <div className={dialogClasses.contentBottomSpacer} />
    </div>
  )
}

export default DialogContent
