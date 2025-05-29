import reactMinistore from './react-ministore'

const bulletElementsStore = reactMinistore<{
  [key: string]: SVGSVGElement | null
}>({})

export default bulletElementsStore
