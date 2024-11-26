import semver = require("semver");
import SemVer = require("semver/classes/semver");

/**
 * Coerces a string to SemVer if possible
 */
declare function coerce(
    version: string | number | SemVer | null | undefined,
    options?: semver.CoerceOptions,
): SemVer | null;

export = coerce;
