import React, { FC } from 'react'
import styled from 'styled-components'
import tw from 'twin.macro'

/**
 * Text Link.
 */
const TextLinkBase = styled.a<{ underline?: boolean }>`
  ${tw`
    cursor-pointer
    outline-none
    text-blue-400
    font-normal
    text-base
    border-none
    bg-transparent
  `}

  // Disabled styling as this component can often be used as button too.
  ${tw`
    disabled:(
      text-opacity-30
      cursor-not-allowed
    )
  `}

  ${props => {
    return props.underline ? tw`underline` : tw`no-underline`
  }}
`

const BlueTextLink = styled(TextLinkBase)`
  ${tw`text-blue-200`}
`

const GrayTextLink = styled(TextLinkBase)`
  ${tw`text-gray-500 dark:text-gray-500`}
`

const NormalTextLink = styled(TextLinkBase)`
  ${tw`text-black dark:text-white`}
`

const colorVariantMap = {
  blue: BlueTextLink,
  gray: GrayTextLink,
  normal: NormalTextLink,
}

// TODO: Fix this workaround
type Variant = keyof typeof colorVariantMap

// TODO: Passing typed as prop to the inner styled component seems tricky. Need to fix it.
/**
 * Text Link Component.
 */
const TextLink: FC<any> = ({ colorVariant = 'normal', underline, as, ...delegated }) => {
  const Component = colorVariantMap[colorVariant as Variant]
  return <Component as={as} underline={underline} {...delegated} />
}

export default TextLink
