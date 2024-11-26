import SemVer = require("semver/classes/semver");
import semver = require("semver");

/**
 * Return the parsed version as a SemVer object, or null if it's not valid.
 */
declare function parse(
    version: string | SemVer | null | undefined,
    optionsOrLoose?: boolean | semver.Options,
): SemVer | null;

export = parse;
