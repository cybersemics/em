import React from 'react'
import Loader from './Loader'
import tw, { styled } from 'twin.macro'

interface ActionButtonProps {
  title: string
  active?: boolean
  inActive?: boolean
  small?: boolean
  isLoading?: boolean
  disabled?: boolean
}

const ButtonContainer = styled.button<{ small?: boolean }>`
  min-width: 120px;
  border-radius: 99px;
  text-decoration: none;

  ${tw`
    inline-block
    px-8 py-2
    my-0.5
    border-r-2
    border-none
    text-base
    bg-white
    cursor-pointer

    active:(
      bg-gray-600
      dark:bg-gray-400
    )
  
    disabled:(
      opacity-50
      bg-white
      text-black
      cursor-auto
    )
  `}

  // Variants
  // TODO: Add size props instead
  ${props => props.small && tw`py-0.5 px-0`}
`

/**
 * Action Button.
 */
export const ActionButton = ({
  title,
  small,
  isLoading,
  disabled,
  onClick,
  style,
  ...restProps
}: ActionButtonProps & React.HTMLAttributes<HTMLButtonElement>) => (
  <ButtonContainer disabled={disabled} small={small} onClick={!disabled ? onClick : undefined} {...restProps}>
    {/* TODO: Animate on loader toggle. */}
    {isLoading && <Loader size={35} style={{ marginRight: '15px' }} />}
    {title}
  </ButtonContainer>
)
