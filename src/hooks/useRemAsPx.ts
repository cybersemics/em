import { useSelector } from 'react-redux'

/**
 * Converts a size in rem to px at the user's font size, for something sized like text that has to be given a number of pixels, such as an icon's size prop. Icon components write their size into the SVG's width and height attributes, so they cannot take rem. 1rem is the user's font size, since AppComponent sets it on the root element. See docs/liminal-ui/a11y.md.
 */
const useRemAsPx = (rem: number): number => useSelector(state => state.fontSize) * rem

export default useRemAsPx
