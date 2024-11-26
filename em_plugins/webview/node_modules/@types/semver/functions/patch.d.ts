import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the patch version number.
 */
declare function patch(version: string | SemVer, optionsOrLoose?: boolean | semver.Options): number;

export = patch;
