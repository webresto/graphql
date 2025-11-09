import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter";
import { Message, Action } from "../../types/primitives";
type OTPResponse = {
    id: Number;
    nextOTPSeconds: Number;
    message: Message;
    action?: Action;
};
type OTPPayload = {
    login: string;
    captcha: ResolvedCaptcha;
};
declare const _default: {
    Mutation: {
        OTPRequest: {
            def: string;
            fn: (parent: any, payload: OTPPayload, context: any) => Promise<OTPResponse>;
        };
    };
};
export default _default;
