import Range = require("semver/classes/range");
import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return true if the version satisfies the range.
 */
declare function satisfies(
    version: string | SemVer,
    range: string | Range,
    optionsOrLoose?: boolean | semver.RangeOptions,
): boolean;

export = satisfies;
