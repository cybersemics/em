import * as pluralize from 'pluralize'

/**
 * Making character 's' will just become an empty value ''.
 * Skip it else it will cause "s" character to have same no of context as empty thoughts in the entire tree. */
export const singularize = (s: string) => s !== 's' ? pluralize.singular(s) : s
