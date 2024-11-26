import type { DocsData, DocsInterfaceMethod } from './types';
export declare function formatDescription(data: DocsData, c: string | undefined): string;
export declare function formatType(data: DocsData, c: string | undefined): {
    type: string;
    formatted: string;
};
export declare function formatMethodSignature(m: DocsInterfaceMethod): string;
export declare function tokenize(str: string): string[];
