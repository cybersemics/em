interface Flavoring<FlavorT> {
  _type?: FlavorT
}

/**
 * A "Flavor" type is a nominal type that allows implicit conversation of objects with the same shape.
 * See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.
 */
type Flavor<T, FlavorT> = T & Flavoring<FlavorT>

export default Flavor
