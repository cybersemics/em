import Index from '../@types/IndexType'

/** Groups the entries of an object based on a categorizer function. */
const groupObjectBy = <T>(obj: Index<T>, categorizer: (key: string, value: T) => string) =>
  Object.entries(obj).reduce(
    (accum, [key, value]) => {
      const group = categorizer(key, value)
      return {
        ...accum,
        [group]: {
          ...accum[group],
          [key]: value,
        },
      }
    },
    {} as Index<Index<T> | undefined>,
  )

export default groupObjectBy
