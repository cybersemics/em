"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const minimist_1 = __importDefault(require("minimist"));
const colorette_1 = require("colorette");
const path_1 = __importDefault(require("path"));
const generate_1 = require("./generate");
const typescript_1 = __importDefault(require("typescript"));
const fs_1 = __importDefault(require("fs"));
/**
 * Run command executed by the cli.
 */
async function run(config) {
    const args = minimist_1.default(config.args, {
        string: ['project', 'api', 'output-json', 'output-readme'],
        boolean: ['silent'],
        alias: {
            p: 'project',
            a: 'api',
            j: 'output-json',
            r: 'output-readme',
            s: 'silent',
        },
    });
    try {
        if (!args.api) {
            throw new Error(`Please provide the primary interface name using the "--api" arg`);
        }
        const tsconfigPath = getTsconfigPath(config.cwd, args.project);
        if (!tsconfigPath) {
            throw new Error(`Unable to find project's tsconfig.json file. Use the "--project" arg to specify the exact path.`);
        }
        const opts = {
            tsconfigPath,
            api: args.api,
        };
        if (!args['output-json'] && !args['output-readme']) {
            throw new Error(`Please provide an output path with either "--output-readme" or "--output-json" args, or both.`);
        }
        if (args['output-json']) {
            opts.outputJsonPath = normalizePath(config.cwd, args['output-json']);
        }
        if (args['output-readme']) {
            opts.outputReadmePath = normalizePath(config.cwd, args['output-readme']);
        }
        const results = await generate_1.generate(opts);
        if (!args.silent) {
            console.log('');
            logOutput(results.outputJsonPath);
            logOutput(results.outputReadmePath);
            console.log('');
        }
    }
    catch (e) {
        if (!args.silent) {
            console.error(colorette_1.red(`\n${emoji(`❌`)}DocGen ${e}\n`));
        }
        process.exit(1);
    }
}
exports.run = run;
function getTsconfigPath(cwd, cliTsConfigPath) {
    if (cliTsConfigPath) {
        return normalizePath(cwd, cliTsConfigPath);
    }
    return typescript_1.default.findConfigFile(cwd, (f) => fs_1.default.existsSync(f));
}
function logOutput(outputPath) {
    if (outputPath) {
        console.log(colorette_1.green(`${emoji(`✔️`)}DocGen Output:`), outputPath);
    }
}
function normalizePath(cwd, p) {
    if (!path_1.default.isAbsolute(p)) {
        p = path_1.default.join(cwd, p);
    }
    return path_1.default.normalize(p);
}
function emoji(em) {
    if (process.platform !== 'win32') {
        return `${em} `;
    }
    return ``;
}
