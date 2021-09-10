import styled from 'styled-components'
import tw from 'twin.macro'

const colors = {
  blue: tw`text-blue-400`,
  gray: tw`text-gray-500 dark:text-gray-300`,
  normal: tw`text-black dark:text-white`,
}

const variants = {
  text: tw`no-underline`,
  link: tw`underline`,
}

/**
 * Text Link.
 */
const TextLink = styled.a<{ variant?: 'text' | 'link'; colorVariant?: 'blue' | 'gray' | 'normal' }>`
  ${tw`
    cursor-pointer
    outline-none
    text-blue-400
    font-normal
    text-base
    border-none
    bg-transparent

  `}

  ${props => colors[props.colorVariant || 'normal']}
  ${props => variants[props.variant || 'link']}

  // Disabled styling as this component can often be used as button too.
  ${tw`
    disabled:(
      text-opacity-30
      cursor-not-allowed
    )
  `}
`

export default TextLink
