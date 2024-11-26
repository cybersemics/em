import Range = require("semver/classes/range");
import semver = require("semver");

/**
 * Return true if the subRange range is entirely contained by the superRange range.
 */
declare function subset(sub: string | Range, dom: string | Range, options?: semver.RangeOptions): boolean;

export = subset;
