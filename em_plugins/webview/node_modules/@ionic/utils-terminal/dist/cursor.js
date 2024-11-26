"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = void 0;
const tslib_1 = require("tslib");
const signal_exit_1 = tslib_1.__importDefault(require("signal-exit"));
const ansi_1 = require("./ansi");
class Cursor {
    static show() {
        if (Cursor.stream.isTTY) {
            Cursor._isVisible = true;
            Cursor.stream.write(ansi_1.EscapeCode.cursorShow());
        }
    }
    static hide() {
        if (Cursor.stream.isTTY) {
            if (!Cursor._listenerAttached) {
                (0, signal_exit_1.default)(() => {
                    Cursor.show();
                });
                Cursor._listenerAttached = true;
            }
            Cursor._isVisible = false;
            Cursor.stream.write(ansi_1.EscapeCode.cursorHide());
        }
    }
    static toggle() {
        if (Cursor._isVisible) {
            Cursor.hide();
        }
        else {
            Cursor.show();
        }
    }
}
exports.Cursor = Cursor;
Cursor.stream = process.stderr;
Cursor._isVisible = true;
Cursor._listenerAttached = false;
