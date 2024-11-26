import type { DocsGenerateOptions, DocsGenerateResults } from './types';
/**
 * Given a tsconfig file path, or input files, will return generated
 * results and optionally write the data as a json file, readme, or both.
 */
export declare function generate(opts: DocsGenerateOptions): Promise<DocsGenerateResults>;
