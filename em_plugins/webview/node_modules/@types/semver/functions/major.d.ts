import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the major version number.
 */
declare function major(version: string | SemVer, optionsOrLoose?: boolean | semver.Options): number;

export = major;
