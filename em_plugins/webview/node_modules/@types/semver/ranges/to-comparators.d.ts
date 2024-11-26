import Range = require("semver/classes/range");
import semver = require("semver");

/**
 * Mostly just for testing and legacy API reasons
 */
declare function toComparators(range: string | Range, optionsOrLoose?: boolean | semver.Options): string[][];

export = toComparators;
