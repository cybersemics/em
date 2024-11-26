import semver = require("semver");
import SemVer = require("semver/classes/semver");

/**
 * Returns difference between two versions by the release type (major, premajor, minor, preminor, patch, prepatch, or prerelease), or null if the versions are the same.
 */
declare function diff(v1: string | SemVer, v2: string | SemVer): semver.ReleaseType | null;

export = diff;
