import tw, { styled } from 'twin.macro'

const variantStyles = {
  normal: tw`
    p-2.5
    rounded-md
  `,
  fancy: tw`
    bg-gray-400
    dark:bg-gray-800
    rounded-3xl
    py-2.5 px-5
    text-lg
  `,
}

/** Input component. */
const Input = styled.input<{ inline?: boolean; variant?: 'normal' | 'fancy' }>`
  display: ${props => (props.inline ? 'inline' : 'block')};

  ${tw`
    w-full
    text-base    
    border border-solid border-gray-300

    focus:(
      outline-none
      border border-solid border-gray-600
    )

    disabled:(
      opacity-50
    )
  `}

  ${props => variantStyles[props.variant || 'normal']}
`

export default Input
