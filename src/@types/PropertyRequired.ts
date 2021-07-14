// Makes given properties required and makes remaining properties optional
export type PropertyRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>
