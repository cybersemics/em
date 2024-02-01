import classNames from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'
import themeColors from '../selectors/themeColors'
import fastClick from '../util/fastClick'
import Loader from './Loader'

interface ActionButtonProps {
  title: string
  active?: boolean
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void
  inActive?: boolean
  small?: boolean
  /** Render button with fg and bg colors inverted. */
  inverse?: boolean
  isLoading?: boolean
  isDisabled?: boolean
}

/**
 * Action Button.
 */
export const ActionButton = ({
  title,
  active,
  inActive,
  inverse,
  small,
  isLoading,
  isDisabled,
  onClick,
  ...restProps
}: ActionButtonProps & React.HTMLAttributes<HTMLAnchorElement>) => {
  const colors = useSelector(themeColors)
  return (
    <a
      className={classNames({
        button: true,
        'button-active': active,
        'button-inactive': inActive,
        'button-small': small,
        'action-button': true,
        disabled: isDisabled,
      })}
      style={
        inverse
          ? {
              backgroundColor: colors.gray15,
              border: `solid 1px ${colors.gray50}`,
              color: colors.fg,
            }
          : undefined
      }
      {...(onClick && !isDisabled ? fastClick(onClick) : null)}
      {...restProps}
    >
      {/* TODO: Animate on loader toggle. */}
      {isLoading && <Loader size={35} style={{ marginRight: '15px' }} />}
      {title}
    </a>
  )
}
