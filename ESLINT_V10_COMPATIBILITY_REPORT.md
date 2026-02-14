# ESLint v10 Compatibility Report

## Summary

The upgrade to ESLint v10 (PR #3796) is blocked by incompatibilities in several ESLint plugins that have not yet released versions supporting ESLint v10.

## Error

```
TypeError: Class extends value undefined is not a constructor or null
    at Object.<anonymous> (/home/runner/work/em/em/node_modules/@pandacss/eslint-plugin/node_modules/@typescript-eslint/utils/dist/ts-eslint/eslint/FlatESLint.js:12:49)
```

## Root Cause

ESLint v10 removed the `FlatESLint` export from `eslint/use-at-your-own-risk` which older versions of ESLint plugins depend on.

## Incompatible Dependencies

### 1. @typescript-eslint/utils (via @pandacss/eslint-plugin)

- **Current version used by @pandacss/eslint-plugin**: `^8.21.0`
- **Latest stable version**: `8.55.0`
- **Peer dependency**: `eslint: '^8.57.0 || ^9.0.0'` (does not include v10)
- **Status**: Active PR in progress
  - **PR**: https://github.com/typescript-eslint/typescript-eslint/pull/12047 (draft)
  - **Issue**: https://github.com/typescript-eslint/typescript-eslint/issues/11266
  - **Fix in v8.54.0**: PR #11958 "handle missing `FlatESLint` and `LegacyESLint`" - but still requires peerDependencies update
- **Workaround**: None currently available

### 2. eslint-plugin-react

- **Current version**: `^7.37.5`
- **Peer dependency**: `eslint: '^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7'` (does not include v10)
- **Status**: Active PR in progress
  - **PR**: https://github.com/jsx-eslint/eslint-plugin-react/pull/3979 (ready for review)
  - **Author**: [@ledsun](https://github.com/ledsun)
  - **Changes**: Routes filename/sourceCode access through util helpers for ESLint 7/10 compatibility
- **Workaround**: None currently available (no pre-release version published)

### 3. eslint-plugin-react-hooks

- **Current version**: `^7.0.1`
- **Peer dependency**: `eslint: '^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0'` (does not include v10)
- **Status**: No active PR found yet
- **Workaround**: None currently available

### 4. @pandacss/eslint-plugin

- **Current version**: `^0.3.0`
- **Dependency**: Uses `@typescript-eslint/utils@^8.21.0` internally
- **Status**: Will be fixed once @typescript-eslint/utils supports ESLint v10
- **Workaround**: Could use yarn resolution to force newer @typescript-eslint/utils once available

## Attempted Solutions

### Option 1: Yarn Resolutions (Not Viable Yet)

Adding a yarn resolution for `@typescript-eslint/utils` to the latest version still doesn't work because:
1. Even the latest stable version (8.55.0) doesn't declare ESLint v10 in peerDependencies
2. The PR #12047 adding v10 support is still in draft and not released

### Option 2: Direct Plugin Updates (Not Available)

Cannot directly update plugins because:
1. `eslint-plugin-react` hasn't released a v10-compatible version
2. `eslint-plugin-react-hooks` hasn't been updated yet
3. `@pandacss/eslint-plugin` depends on `@typescript-eslint/utils` which doesn't support v10

### Option 3: Use Pre-release/Canary Versions (Not Recommended)

Some packages have experimental/canary versions but:
- They are not intended for production use
- May have breaking changes
- Not guaranteed to be stable

## Recommendation

**Wait for upstream releases before upgrading to ESLint v10.** Specifically:

1. **typescript-eslint**: Wait for PR #12047 to be merged and released
2. **eslint-plugin-react**: Wait for PR #3979 to be merged and released  
3. **eslint-plugin-react-hooks**: Wait for maintainers to add v10 support

## Timeline Estimate

Based on PR activity:
- **typescript-eslint PR #12047**: In draft, active development
- **eslint-plugin-react PR #3979**: Ready for review (Feb 11, 2026)
- **eslint-plugin-react-hooks**: No PR yet

**Estimated timeline**: 2-4 weeks for initial releases, assuming PRs are merged soon

## Tracking Issues

To track progress on ESLint v10 support:
- Monitor: https://github.com/typescript-eslint/typescript-eslint/pull/12047
- Monitor: https://github.com/jsx-eslint/eslint-plugin-react/pull/3979
- Create issue in: https://github.com/facebook/react/issues (for eslint-plugin-react-hooks)

## Alternative: Temporary Workarounds

If ESLint v10 upgrade is critical before plugin support is available:

1. **Disable problematic plugins temporarily** (not recommended - loses valuable linting)
2. **Fork and patch plugins** (high maintenance burden)
3. **Wait for official support** (recommended)

## Next Steps

1. Keep ESLint at v9.39.2 (latest v9) until plugins add v10 support
2. Monitor the PRs listed above
3. Re-attempt upgrade once:
   - typescript-eslint releases v10 support
   - eslint-plugin-react releases v10 support
   - eslint-plugin-react-hooks releases v10 support
4. Consider contributing to plugin repos to help accelerate v10 support

## References

- ESLint v10 Release: https://eslint.org/blog/2026/01/eslint-v10.0.0-released/
- ESLint v10 Migration Guide: https://eslint.org/docs/latest/use/migrate-to-10.0.0
- typescript-eslint v10 Support: https://github.com/typescript-eslint/typescript-eslint/pull/12047
- eslint-plugin-react v10 Support: https://github.com/jsx-eslint/eslint-plugin-react/pull/3979
