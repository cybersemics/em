/** Returns the thoughts for the context that has already been encoded (such as Firebase keys) */
export default (state, contextEncoded) =>
  (state.contextIndex[contextEncoded] || {}).thoughts || []
