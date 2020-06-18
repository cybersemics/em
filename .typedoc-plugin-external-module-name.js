/** 
 * Custom mapping function for documentation modules.
 * 
 * @param explicit - Value, if the module has an explicit annotation, i.e., @module explicit
 * @param implicit - The plugin's default mapping
 * @param path - The path to the file 
 */
module.exports = (explicit, implicit, path) => {
    if (explicit && path.includes("modulesInfo")) return explicit

    if (implicit !== "."){
        const match = path.match(RegExp(`${implicit}/.*`))[0]
        const endIndex = match.lastIndexOf(".")
        return match.slice(0,endIndex).replace(/\//g, ".")
    } else {
        if(explicit === "app") return explicit
        const match = path.match(/src\/.*\./)[0]
        if (match) return match.replace(/src/,"app").replace(".","").replace(/\//g, ".")
    }
}