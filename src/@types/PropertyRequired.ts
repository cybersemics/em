/** Makes given properties required and makes remaining properties optional. */
type PropertyRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>

export default PropertyRequired
