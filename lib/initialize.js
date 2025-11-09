"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ToInitialize;
const hookTools_1 = require("@webresto/core/libs/hookTools");
const afterHook_1 = require("./afterHook");
function ToInitialize() {
    /**
     * List of hooks that required
     */
    const requiredHooks = [
        'restocore',
    ];
    return function initialize(cb) {
        /**
         * AFTER OTHERS HOOKS
         */
        hookTools_1.default.waitForHooks('graphql', requiredHooks, afterHook_1.default);
        return cb();
    };
}
;
