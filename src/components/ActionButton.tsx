import React from 'react'
import Loader from './Loader'
import tw, { styled } from 'twin.macro'
import { css } from 'styled-components'

interface ActionButtonProps {
  title: string
  active?: boolean
  inActive?: boolean
  // small variant of the button
  small?: boolean
  isLoading?: boolean
  disabled?: boolean
  // Makes button occupy full width
  fullWidth?: boolean
}

const ButtonContainer = styled.button<{ small?: boolean; fullWidth?: boolean }>`
  min-width: 120px;
  text-decoration: none;

  ${props =>
    props.fullWidth &&
    css`
      width: 100%;
    `};

  ${tw`
    rounded-3xl
    inline-block
    px-8 py-2
    my-0.5
    border-r-2
    border-none
    text-base
    bg-black
    text-white
    dark:(bg-white text-black)
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
  fullWidth,
  onClick,
  style,
  ...restProps
}: ActionButtonProps & React.HTMLAttributes<HTMLButtonElement>) => (
  <ButtonContainer
    disabled={disabled}
    fullWidth={fullWidth}
    small={small}
    onClick={!disabled ? onClick : undefined}
    {...restProps}
  >
    {/* TODO: Animate on loader toggle. */}
    {isLoading && <Loader size={35} style={{ marginRight: '15px' }} />}
    {title}
  </ButtonContainer>
)
