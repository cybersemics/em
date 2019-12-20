// checks if string contains URL
// eslint-disable-next-line no-useless-escape
export const isURL = s => /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/i.test(s)
