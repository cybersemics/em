import type { DocsData, DocsParseOptions } from './types';
/**
 * Given either a tsconfig file path, or exact input files, will
 * use TypeScript to parse apart the source file's JSDoc comments
 * and returns a function which can be used to get a specific
 * interface as the primary api. Used by the generate() function.
 */
export declare function parse(opts: DocsParseOptions): (api: string) => DocsData;
export declare function slugify(id: string): string;
