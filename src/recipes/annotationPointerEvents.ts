import { cva } from '../../styled-system/css'

/**
 * A typesafe way to override pointerEvents: none on the ThoughtAnnotationWrapper component.
 *
 * ThoughtAnnotationWrapper sets pointerEvents: 'none' to allow clicks to pass through
 * to the editable text below. Interactive children (like UrlIconLink) can use this recipe
 * with override: true to restore pointer events and become clickable.
 *
 * When a thought is hidden (isVisible: false), the wrapper prevents this override using
 * CSS to ensure hidden thoughts are not clickable.
 */
const annotationPointerEvents = cva({
  base: {
    pointerEvents: 'none',
  },
  variants: {
    override: {
      true: {
        pointerEvents: 'auto',
      },
    },
    disableChildren: {
      true: {
        '& > *': {
          pointerEvents: 'none',
        },
      },
    },
  },
})

export default annotationPointerEvents
