import Range = require("semver/classes/range");
import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return true if version is less than all the versions possible in the range.
 */
declare function ltr(
    version: string | SemVer,
    range: string | Range,
    optionsOrLoose?: boolean | semver.RangeOptions,
): boolean;

export = ltr;
