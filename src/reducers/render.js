/** Forces a full re-render. */
export default ({ dataNonce }) => ({
  dataNonce: dataNonce + 1
})
