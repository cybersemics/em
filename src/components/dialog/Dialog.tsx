import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

interface DialogProps {
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement>
}

/**
 * Dialog component.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const dialogClasses = dialogRecipe()

  /**
   * Calls the onClose function when the user clicks outside the dialog.
   */
  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /** When the user clicks outside the dialog, close the dialog. */
    const handleClickOutside = (event: MouseEvent) => {
      if (currentDialogRef && !currentDialogRef.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div ref={nodeRef} className={dialogClasses.overlay}>
      <div ref={dialogRef} className={dialogClasses.container}>
        {children}
        <div className={dialogClasses.gradient} />
      </div>
    </div>
  )
}

export default Dialog
