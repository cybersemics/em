/*
  @license
	Rollup.js v4.27.4
	Sat, 23 Nov 2024 06:59:50 GMT - commit e805b546405a4e6cfccd3fe73e9f4df770023824

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
export { version as VERSION, defineConfig, rollup, watch } from './shared/node-entry.js';
import './shared/parseAst.js';
import '../native.js';
import 'node:path';
import 'path';
import 'node:process';
import 'node:perf_hooks';
import 'node:fs/promises';
import 'tty';
