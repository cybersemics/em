"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.parse = exports.replaceMarkdownPlaceholders = exports.outputReadme = exports.outputJson = exports.generate = void 0;
var generate_1 = require("./generate");
Object.defineProperty(exports, "generate", { enumerable: true, get: function () { return generate_1.generate; } });
var output_1 = require("./output");
Object.defineProperty(exports, "outputJson", { enumerable: true, get: function () { return output_1.outputJson; } });
Object.defineProperty(exports, "outputReadme", { enumerable: true, get: function () { return output_1.outputReadme; } });
Object.defineProperty(exports, "replaceMarkdownPlaceholders", { enumerable: true, get: function () { return output_1.replaceMarkdownPlaceholders; } });
var parse_1 = require("./parse");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parse_1.parse; } });
var cli_1 = require("./cli");
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return cli_1.run; } });
__exportStar(require("./types"), exports);
