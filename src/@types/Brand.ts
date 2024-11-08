declare const BrandSymbol: unique symbol

/**
 * A "Brand" type is a nominal type that disallows implicit conversion.
 * See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.
 */
interface Brand<T> {
  [BrandSymbol]: T
}

export default Brand
