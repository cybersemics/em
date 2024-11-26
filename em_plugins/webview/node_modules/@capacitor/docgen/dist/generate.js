"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const parse_1 = require("./parse");
const output_1 = require("./output");
/**
 * Given a tsconfig file path, or input files, will return generated
 * results and optionally write the data as a json file, readme, or both.
 */
async function generate(opts) {
    const apiFinder = parse_1.parse(opts);
    const data = apiFinder(opts.api);
    const results = {
        ...opts,
        data,
    };
    if (opts.outputJsonPath) {
        await output_1.outputJson(opts.outputJsonPath, data);
    }
    if (opts.outputReadmePath) {
        await output_1.outputReadme(opts.outputReadmePath, data);
    }
    return results;
}
exports.generate = generate;
