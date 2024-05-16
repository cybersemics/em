/**
 * Custom module name mapping function for typedoc-plugin-external-module-name
 * https://github.com/christopherthielen/typedoc-plugin-external-module-name#custom-module-name-generation
 * This function defines all module names and creates the module hierarchy.
 * Created hierarchy is displayed in the right navbar of the generated TypeDoc documentation.
 *
 * @param explicit - Value, if the module has an explicit annotation, i.e., @module explicit
 * @param implicit - The plugin's default mapping
 * @param path - The path to the file
 */
module.exports = (explicit, implicit, path) => {
  // make index.js files root modules (e.g. actions.index.js => actions)
  if (path.includes('index.js') || path.includes('index.ts')) return implicit

  // check for files which are placed in subdirectories of src
  if (implicit !== '.') {
    const matches = path.match(RegExp(`${implicit}/.*`))
    if (!matches) return
    const endIndex = matches[0].lastIndexOf('.')
    // return directoryName.fileName (e.g. "actions.alert")
    return matches[0].slice(0, endIndex).replace(/\//g, '.')
  } else {
    const matches = path.match(/src\/.*\./)[0]
    if (!matches) return
    // return app.fileName (e.g. "app.browser")
    return matches[0].replace(/src/, 'app').replace('.', '').replace(/\//g, '.')
  }
}
