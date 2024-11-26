import Range = require("semver/classes/range");
import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the lowest version in the list that satisfies the range, or null if none of them do.
 */
declare function minSatisfying<T extends string | SemVer>(
    versions: readonly T[],
    range: string | Range,
    optionsOrLoose?: boolean | semver.RangeOptions,
): T | null;

export = minSatisfying;
