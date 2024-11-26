// re-exports for index file

// functions for working with versions
import semverParse = require("semver/functions/parse");
import semverValid = require("semver/functions/valid");
import semverClean = require("semver/functions/clean");
import semverInc = require("semver/functions/inc");
import semverDiff = require("semver/functions/diff");
import semverMajor = require("semver/functions/major");
import semverMinor = require("semver/functions/minor");
import semverPatch = require("semver/functions/patch");
import semverPrerelease = require("semver/functions/prerelease");
import semverCompare = require("semver/functions/compare");
import semverRcompare = require("semver/functions/rcompare");
import semverCompareLoose = require("semver/functions/compare-loose");
import semverCompareBuild = require("semver/functions/compare-build");
import semverSort = require("semver/functions/sort");
import semverRsort = require("semver/functions/rsort");

export {
    semverClean as clean,
    semverCompare as compare,
    semverCompareBuild as compareBuild,
    semverCompareLoose as compareLoose,
    semverDiff as diff,
    semverInc as inc,
    semverMajor as major,
    semverMinor as minor,
    semverParse as parse,
    semverPatch as patch,
    semverPrerelease as prerelease,
    semverRcompare as rcompare,
    semverRsort as rsort,
    semverSort as sort,
    semverValid as valid,
};

// low-level comparators between versions
import semverGt = require("semver/functions/gt");
import semverLt = require("semver/functions/lt");
import semverEq = require("semver/functions/eq");
import semverNeq = require("semver/functions/neq");
import semverGte = require("semver/functions/gte");
import semverLte = require("semver/functions/lte");
import semverCmp = require("semver/functions/cmp");
import semverCoerce = require("semver/functions/coerce");

export {
    semverCmp as cmp,
    semverCoerce as coerce,
    semverEq as eq,
    semverGt as gt,
    semverGte as gte,
    semverLt as lt,
    semverLte as lte,
    semverNeq as neq,
};

// working with ranges
import semverSatisfies = require("semver/functions/satisfies");
import semverMaxSatisfying = require("semver/ranges/max-satisfying");
import semverMinSatisfying = require("semver/ranges/min-satisfying");
import semverToComparators = require("semver/ranges/to-comparators");
import semverMinVersion = require("semver/ranges/min-version");
import semverValidRange = require("semver/ranges/valid");
import semverOutside = require("semver/ranges/outside");
import semverGtr = require("semver/ranges/gtr");
import semverLtr = require("semver/ranges/ltr");
import semverIntersects = require("semver/ranges/intersects");
import simplify = require("semver/ranges/simplify");
import rangeSubset = require("semver/ranges/subset");

export {
    rangeSubset as subset,
    semverGtr as gtr,
    semverIntersects as intersects,
    semverLtr as ltr,
    semverMaxSatisfying as maxSatisfying,
    semverMinSatisfying as minSatisfying,
    semverMinVersion as minVersion,
    semverOutside as outside,
    semverSatisfies as satisfies,
    semverToComparators as toComparators,
    semverValidRange as validRange,
    simplify as simplifyRange,
};

// classes
import SemVer = require("semver/classes/semver");
import Range = require("semver/classes/range");
import Comparator = require("semver/classes/comparator");

export { Comparator, Range, SemVer };

// internals
import identifiers = require("semver/internals/identifiers");
export import compareIdentifiers = identifiers.compareIdentifiers;
export import rcompareIdentifiers = identifiers.rcompareIdentifiers;

export const SEMVER_SPEC_VERSION: "2.0.0";

export const RELEASE_TYPES: ReleaseType[];

export type ReleaseType = "major" | "premajor" | "minor" | "preminor" | "patch" | "prepatch" | "prerelease";

export interface Options {
    loose?: boolean | undefined;
}

export interface RangeOptions extends Options {
    includePrerelease?: boolean | undefined;
}
export interface CoerceOptions extends Options {
    includePrerelease?: boolean | undefined;
    /**
     * Used by `coerce()` to coerce from right to left.
     *
     * @default false
     *
     * @example
     * coerce('1.2.3.4', { rtl: true });
     * // => SemVer { version: '2.3.4', ... }
     *
     * @since 6.2.0
     */
    rtl?: boolean | undefined;
}

export type Operator = "===" | "!==" | "" | "=" | "==" | "!=" | ">" | ">=" | "<" | "<=";
