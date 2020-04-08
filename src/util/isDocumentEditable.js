import urlDataSource from './urlDataSource'

/* Returns true if the document can be edited.
   Currently true unless an external data source is used.
*/
export default () => !urlDataSource()
