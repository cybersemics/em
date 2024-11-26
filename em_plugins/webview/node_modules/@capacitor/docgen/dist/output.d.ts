import type { DocsData } from './types';
export declare function outputReadme(readmeFilePath: string, data: DocsData): Promise<void>;
export declare function replaceMarkdownPlaceholders(content: string, data: DocsData): string;
export declare function outputJson(jsonFilePath: string, data: DocsData): Promise<void>;
