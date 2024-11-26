import Range = require("semver/classes/range");
import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the lowest version that can possibly match the given range.
 */
declare function minVersion(range: string | Range, optionsOrLoose?: boolean | semver.Options): SemVer | null;

export = minVersion;
