import reactMinistore from './react-ministore'

/** The current max text width of column 1 in Table View for alignment. */
const col1MaxWidthStore = reactMinistore<number | null>(null)

export default col1MaxWidthStore
