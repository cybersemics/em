import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Returns an array of prerelease components, or null if none exist.
 */
declare function prerelease(
    version: string | SemVer,
    optionsOrLoose?: boolean | semver.Options,
): ReadonlyArray<string | number> | null;

export = prerelease;
