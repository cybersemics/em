"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTsProgram = void 0;
const typescript_1 = __importDefault(require("typescript"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getTsProgram(opts) {
    let rootNames;
    let options;
    if (typeof opts.tsconfigPath === 'string') {
        const configResult = typescript_1.default.readConfigFile(opts.tsconfigPath, (p) => fs_1.default.readFileSync(p, 'utf-8'));
        if (configResult.error) {
            throw new Error(`Unable to read tsconfig path: "${opts.tsconfigPath}". ` +
                typescript_1.default.flattenDiagnosticMessageText(configResult.error.messageText, '\n'));
        }
        const tsconfigDir = path_1.default.dirname(opts.tsconfigPath);
        rootNames = configResult.config.files.map((f) => {
            return path_1.default.join(tsconfigDir, f);
        });
        options = configResult.config.compilerOptions;
    }
    else if (Array.isArray(opts.inputFiles) && opts.inputFiles.length > 0) {
        opts.inputFiles.forEach((i) => {
            if (!path_1.default.isAbsolute(i)) {
                throw new Error(`inputFile "${i}" must be absolute`);
            }
        });
        options = {};
        rootNames = [...opts.inputFiles];
    }
    else {
        throw new Error(`Either "tsconfigPath" or "inputFiles" option must be provided`);
    }
    // same defaults as transpile() for faster parse-only transpiling
    options.isolatedModules = true;
    options.suppressOutputPathCheck = true;
    options.allowNonTsExtensions = true;
    options.removeComments = false;
    options.types = undefined;
    options.noEmit = undefined;
    options.noEmitOnError = undefined;
    options.noEmitHelpers = true;
    options.paths = undefined;
    options.rootDirs = undefined;
    options.declaration = undefined;
    options.composite = undefined;
    options.declarationDir = undefined;
    options.out = undefined;
    options.outFile = undefined;
    options.outDir = undefined;
    options.sourceMap = false;
    options.jsx = typescript_1.default.JsxEmit.React;
    options.module = typescript_1.default.ModuleKind.ESNext;
    options.target = typescript_1.default.ScriptTarget.Latest;
    options.moduleResolution = typescript_1.default.ModuleResolutionKind.NodeJs;
    return typescript_1.default.createProgram({
        rootNames,
        options,
    });
}
exports.getTsProgram = getTsProgram;
