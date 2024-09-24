import React from 'react'
import { AnchorButtonVariantProps, anchorButton } from '../../styled-system/recipes'
import fastClick from '../util/fastClick'
import Loader from './Loader'

interface ActionButtonProps {
  title: string
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void
  /** Render button with fg and bg colors inverted. */
  isLoading?: boolean
  isDisabled?: boolean
}

/**
 * Action Button with default thin variant. Used in Modals.
 */
export const ActionButton = ({
  title,
  inActive,
  inverse,
  small,
  thin = true,
  isLoading,
  isDisabled,
  onClick,
  ...restProps
}: ActionButtonProps & AnchorButtonVariantProps & React.HTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a
      className={anchorButton({
        inActive,
        small,
        actionButton: true,
        thin,
        isDisabled,
        inverse,
      })}
      {...(onClick && !isDisabled ? fastClick(onClick) : null)}
      {...restProps}
    >
      {/* TODO: Animate on loader toggle. */}
      {isLoading && <Loader size={35} style={{ marginRight: '15px' }} />}
      {title}
    </a>
  )
}
