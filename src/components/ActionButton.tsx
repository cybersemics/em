import React from 'react'
import classNames from 'classnames'
import Loader from './Loader'

interface ActionButtonProps {
  title: string,
  active?: boolean,
  inActive?: boolean,
  small?: boolean,
  isLoading?: boolean,
  isDisabled?: boolean,
}

/**
 * Action Button.
 */
export const ActionButton = ({ title, active, inActive, small, isLoading, isDisabled, onClick, style, ...restProps }: ActionButtonProps & React.HTMLAttributes<HTMLAnchorElement>) => <a className={classNames({
  button: true,
  'button-active': active,
  'button-inactive': inActive,
  'button-small': small,
  'action-button': true,
  disabled: isDisabled,
})} onClick={!isDisabled ? onClick : undefined} {...restProps}>
  {/* TODO: Animate on loader toggle. */}
  {isLoading && <Loader size={35} style={{ marginRight: '15px' }}/>}
  {title}
</a>
