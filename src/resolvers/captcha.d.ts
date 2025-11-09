declare const _default: {
    Query: {
        captchaGetJob: {
            def: string;
            fn: (parent: any, args: {
                label: string;
            }, context: any, info: any) => Promise<import("@webresto/core/adapters/captcha/CaptchaAdapter").CaptchaJob>;
        };
    };
};
export default _default;
