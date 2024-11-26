import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * The reverse of compare.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
declare function rcompare(
    v1: string | SemVer,
    v2: string | SemVer,
    optionsOrLoose?: boolean | semver.Options,
): 1 | 0 | -1;

export = rcompare;
