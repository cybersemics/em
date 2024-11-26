import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the minor version number.
 */
declare function minor(version: string | SemVer, optionsOrLoose?: boolean | semver.Options): number;

export = minor;
