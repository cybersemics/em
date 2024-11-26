import semver = require("semver");
import SemVer = require("semver/classes/semver");
/**
 * Return the parsed version as a string, or null if it's not valid.
 */
declare function valid(
    version: string | SemVer | null | undefined,
    optionsOrLoose?: boolean | semver.Options,
): string | null;

export = valid;
