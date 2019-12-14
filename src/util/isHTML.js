// checks if string contains html elements
export const isHTML = s => /<\/?[a-z][\s\S]*>/i.test(s)
