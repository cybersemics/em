/**
 * Custom module name mapping function for typedoc-plugin-external-module-name (https://github.com/christopherthielen/typedoc-plugin-external-module-name)
 * This function defines all module names and creates module hierarchy.
 * Created hierarchy are displayed in the right navbar of generated TypeDoc documentation.
 *
 * @param explicit - Value, if the module has an explicit annotation, i.e., @module explicit
 * @param implicit - The plugin's default mapping
 * @param path - The path to the file
 */
module.exports = (explicit, implicit, path) => {
    // Make index.js files root modules (e.g. action-creators.index.js => action-creators)
    if (path.includes("index.js") || path.includes("index.ts")) return implicit

    // Check for files which are placed in subdirectories of src
    if (implicit !== "."){
        const match = path.match(RegExp(`${implicit}/.*`))[0]
        const endIndex = match.lastIndexOf(".")
        // Result: directoryName.fileName (e.g. "action-creators.alert")
        return match.slice(0,endIndex).replace(/\//g, ".")
    } else {

        const match = path.match(/src\/.*\./)[0]
        // Result: app.fileName (e.g. "app.browser")
        if (match) return match.replace(/src/,"app").replace(".","").replace(/\//g, ".")
    }
}
