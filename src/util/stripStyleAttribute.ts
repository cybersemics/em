interface StyleProperty {
  name: string,
  value: string,
}

const blackColors = ['#000000', '#000', 'rgb(0,0,0)', 'rgba(0,0,0,1)', 'black']
const whiteColors = ['#ffffff', '#fff', 'rgb(255,255,255)', 'rgba(255,255,255,1)', 'white']

const allowedStyleProperties = [
  {
    property: 'color',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      const background = styleProperties.find(property => property.name.startsWith('background'))
      return !((blackColors.includes(styleProperty.value) || whiteColors.includes(styleProperty.value)) && !background)
    }
  },
  {
    property: 'font',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      if (styleProperty.value === 'normal') {
        return false
      }
      // Don't preserve font-size property. It doesn't look nice. Because, when we copy text from an environment whose default font size is 14px, it doesn't match our default font size.
      return !['font-size'].includes(styleProperty.name)
    }
  },
  {
    property: 'background',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      const color = styleProperties.find(property => property.name === 'color')
      return !(whiteColors.includes(styleProperty.value) && !color)
    }
  },
  { property: 'border' },
  { property: 'text' },
  { property: 'padding' },
  { property: 'word' },
  { property: 'box-shadow' },
  { property: 'color' },
  { property: 'opacity' },
  { property: 'white-space' },
]

/** Parse style string, returns array of StyleProperty. */
const parseStyleString = (styleString: string) : StyleProperty[] => {
  return styleString.trim()
    .split(';')
    .filter(x => x.length > 0)
    .map(styleProperty => {
      const style = styleProperty.split(':')
      return {
        name: style[0].trim(),
        value: style[1].trim()
      }
    })
}

/** Parse and strip style attribute, returns stripped style attribute string. */
const stripStyleAttribute = (style: string) => {
  const styles = parseStyleString(style)
  return styles.reduce((acc, property) => {
    const styleProperty = allowedStyleProperties.find(allowedStyleProperty => property.name.startsWith(allowedStyleProperty.property))
    if (styleProperty && (!styleProperty.test || styleProperty.test(property, styles))) {
      acc += `${property.name}: ${property.value};`
    }
    return acc
  }, '')
}

export default stripStyleAttribute
