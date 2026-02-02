interface StyleProperty {
  name: string
  value: string
}

const blackColors = ['#000000', '#000', 'rgb(0,0,0)', 'rgba(0,0,0,1)', 'black']
const whiteColors = ['#ffffff', '#fff', 'rgb(255,255,255)', 'rgba(255,255,255,1)', 'white']

/** Check given value is black. */
const isColorBlack = (value: string) => blackColors.includes(value.replace(/\s/g, ''))

/** Check given value is white. */
const isColorWhite = (value: string) => whiteColors.includes(value.replace(/\s/g, ''))

const allowedStyleProperties = [
  {
    property: 'color',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      const background = styleProperties.find(property => property.name.startsWith('background'))
      return !((isColorBlack(styleProperty.value) || isColorWhite(styleProperty.value)) && !background)
    },
  },
  {
    property: 'font',
    test: (styleProperty: StyleProperty) => {
      if (styleProperty.value === 'normal' || +styleProperty.value <= 400) {
        return false
      }
      return ['font-style', 'font-weight'].includes(styleProperty.name)
    },
  },
  {
    property: 'background',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      const color = styleProperties.find(property => property.name === 'color')
      return !(isColorWhite(styleProperty.value) && !color)
    },
  },
  {
    property: 'background-color',
    test: (styleProperty: StyleProperty, styleProperties: StyleProperty[]) => {
      const color = styleProperties.find(property => property.name === 'color')
      return !(isColorWhite(styleProperty.value) && !color)
    },
  },
  {
    property: 'text',
    test: (styleProperty: StyleProperty) => {
      if (styleProperty.value === 'none') {
        return false
      }
      return ['text-decoration'].includes(styleProperty.name)
    },
  },
]

/** Parse style string, returns array of StyleProperty. */
const parseStyleString = (styleString: string): StyleProperty[] => {
  return styleString
    .trim()
    .split(';')
    .filter(x => x.length > 0)
    .map(styleProperty => {
      const style = styleProperty.split(':')
      return {
        name: style[0].trim().toLowerCase(),
        value: style[1]?.trim().toLowerCase(),
      }
    })
}

/** Parse and strip style attribute, returns stripped style attribute string. */
const stripStyleAttribute = (style: string) => {
  const styles = parseStyleString(style)
  return styles.reduce((acc, property) => {
    const styleProperty = allowedStyleProperties.find(allowedStyleProperty =>
      property.name.startsWith(allowedStyleProperty.property),
    )
    if (styleProperty && (!styleProperty.test || styleProperty.test(property, styles))) {
      return (
        acc + `${property.name}: ${property.name === 'font-weight' && +property.value >= 500 ? 700 : property.value};`
      )
    }
    return acc
  }, '')
}

export default stripStyleAttribute
