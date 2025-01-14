import React, { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { deleteResumableFile } from '../actions/importFiles'
import { isTouch } from '../browser'
import { AlertType } from '../constants'
import useCombinedRefs from '../hooks/useCombinedRefs'
import usePositionFixed from '../hooks/usePositionFixed'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import CloseButton from './CloseButton'

export type PopupBaseProps = PropsWithChildren<
  {
    // used to cancel imports
    importFileId?: string
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    anchorFromBottom?: boolean
    anchorOffset?: number
    cssRaw?: SystemStyleObject
    circledCloseButton?: boolean
    showXOnHover?: boolean
  } & Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>
>

/** A popup component that can be dismissed. */
const PopupBase = React.forwardRef<HTMLDivElement, PopupBaseProps>(
  (
    {
      children,
      importFileId,
      onClose,
      cssRaw,
      style,
      anchorFromBottom,
      anchorOffset,
      circledCloseButton,
      showXOnHover,
      ...props
    },
    ref,
  ) => {
    const dispatch = useDispatch()

    const fontSize = useSelector(state => state.fontSize)
    const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
    const positionFixedStyles = usePositionFixed({ fromBottom: anchorFromBottom, offset: anchorOffset })
    const useSwipeToDismissProps = useSwipeToDismiss({
      // dismiss after animation is complete to avoid touch events going to the Toolbar
      onDismissEnd: () => {
        dispatch(alert(null))
      },
    })

    const combinedRefs = useCombinedRefs(isTouch ? [useSwipeToDismissProps.ref, ref] : [ref])

    return (
      <div
        className={css(
          showXOnHover && {
            '&:hover': {
              '& [data-close-button]': {
                visibility: 'visible',
              },
            },
          },
          cssRaw,
        )}
        {...(isTouch ? useSwipeToDismissProps : null)}
        ref={combinedRefs}
        // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
        style={{
          ...positionFixedStyles,
          fontSize,
          ...(isTouch ? useSwipeToDismissProps.style : null),
          ...style,
        }}
        {...props}
      >
        {children}
        {importFileId && (
          <a
            onClick={() => {
              deleteResumableFile(importFileId!)
              syncStatusStore.update({ importProgress: 1 })
              onClose?.()
            }}
          >
            cancel
          </a>
        )}
        {multicursor && (
          <a
            {...fastClick(() => {
              dispatch(clearMulticursors())
              onClose?.()
            })}
          >
            cancel
          </a>
        )}
        {onClose ? (
          <CloseButton
            circled={circledCloseButton}
            cssRaw={showXOnHover ? { visibility: 'hidden' } : undefined}
            onClose={onClose}
            disableSwipeToDismiss
          />
        ) : null}
      </div>
    )
  },
)

PopupBase.displayName = 'Popup'

export default PopupBase
