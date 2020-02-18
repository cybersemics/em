// checks if string contains URL
// eslint-disable-next-line no-useless-escape
export const isURL = s => /^(?:http(s)?:\/\/)?(www\.)?[a-zA-Z@:%_\+~#=]+[-\w@:%_\+~#=.]*[\w@:%_\+~#=]+[.:][\w()]{1,6}([\w-()@:%_\+~#?&//=]*)$/i.test(s)
