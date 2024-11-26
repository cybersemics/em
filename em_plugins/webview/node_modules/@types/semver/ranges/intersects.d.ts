import Range = require("semver/classes/range");
import semver = require("semver");

/**
 * Return true if any of the ranges comparators intersect
 */
declare function intersects(
    range1: string | Range,
    range2: string | Range,
    optionsOrLoose?: boolean | semver.RangeOptions,
): boolean;

export = intersects;
