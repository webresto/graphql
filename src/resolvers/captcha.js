"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@webresto/core/adapters/index");
exports.default = {
    Query: {
        captchaGetJob: {
            def: 'captchaGetJob(label: String): CaptchaJob',
            fn: async (parent, args, context, info) => {
                try {
                    return (await index_1.Captcha.getAdapter()).getJob(args.label);
                }
                catch (error) {
                    sails.log.error(error);
                    throw error;
                }
            }
        }
    }
};
