import { Response } from "../../types/primitives";
declare const _default: {
    Query: {
        authMethods: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                identity: {
                    method: string;
                    adapter: any;
                    offer: any;
                    kind: any;
                    flow: any;
                    mode: any;
                    canVerifyPhone: boolean;
                    title: any;
                    hint: any;
                    iconUrl: any;
                    buttonColor: any;
                    buttonTextColor: any;
                    sortOrder: any;
                    cost: any;
                }[];
                proof: {
                    method: string;
                    adapter: any;
                    offer: any;
                    kind: any;
                    flow: any;
                    mode: any;
                    canVerifyPhone: boolean;
                    title: any;
                    hint: any;
                    iconUrl: any;
                    buttonColor: any;
                    buttonTextColor: any;
                    sortOrder: any;
                    cost: any;
                }[];
                phoneLoginAvailable: boolean;
            }>;
        };
        authStatus: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                id: any;
                status: any;
                step: {
                    id: any;
                    type: any;
                    codeLength: any;
                    hint: any;
                    dialNumber: any;
                    redirectUrl: any;
                    clientPayload: any;
                    expiresInSeconds: any;
                    captchaRequired: boolean;
                };
                ticket: any;
                phoneHint: any;
                method: any;
                availableMethods: any;
                nextAttemptAfterSeconds: any;
                attemptsLeft: any;
                failReason: any;
            }>;
        };
        myAccount: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                identities: import("@webresto/core/lib/AuthService").IdentityView[];
                policy: import("@webresto/core/lib/AuthService").AccountPolicyView;
            }>;
        };
    };
    Mutation: {
        authStart: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                id: any;
                status: any;
                step: {
                    id: any;
                    type: any;
                    codeLength: any;
                    hint: any;
                    dialNumber: any;
                    redirectUrl: any;
                    clientPayload: any;
                    expiresInSeconds: any;
                    captchaRequired: boolean;
                };
                ticket: any;
                phoneHint: any;
                method: any;
                availableMethods: any;
                nextAttemptAfterSeconds: any;
                attemptsLeft: any;
                failReason: any;
            }>;
        };
        authSubmit: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                id: any;
                status: any;
                step: {
                    id: any;
                    type: any;
                    codeLength: any;
                    hint: any;
                    dialNumber: any;
                    redirectUrl: any;
                    clientPayload: any;
                    expiresInSeconds: any;
                    captchaRequired: boolean;
                };
                ticket: any;
                phoneHint: any;
                method: any;
                availableMethods: any;
                nextAttemptAfterSeconds: any;
                attemptsLeft: any;
                failReason: any;
            }>;
        };
        authSwitch: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                id: any;
                status: any;
                step: {
                    id: any;
                    type: any;
                    codeLength: any;
                    hint: any;
                    dialNumber: any;
                    redirectUrl: any;
                    clientPayload: any;
                    expiresInSeconds: any;
                    captchaRequired: boolean;
                };
                ticket: any;
                phoneHint: any;
                method: any;
                availableMethods: any;
                nextAttemptAfterSeconds: any;
                attemptsLeft: any;
                failReason: any;
            }>;
        };
        authResend: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                id: any;
                status: any;
                step: {
                    id: any;
                    type: any;
                    codeLength: any;
                    hint: any;
                    dialNumber: any;
                    redirectUrl: any;
                    clientPayload: any;
                    expiresInSeconds: any;
                    captchaRequired: boolean;
                };
                ticket: any;
                phoneHint: any;
                method: any;
                availableMethods: any;
                nextAttemptAfterSeconds: any;
                attemptsLeft: any;
                failReason: any;
            }>;
        };
        authExchange: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                user: any;
                registrationRequired: boolean;
                message: {
                    deviceId: any;
                    title: any;
                    type: string;
                    message: any;
                };
                action: {
                    deviceId: any;
                    type: string;
                    data: {
                        token: string;
                    };
                };
            }>;
        };
        authLinkConfirm: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<Response>;
        };
        authUnlink: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<Response>;
        };
        authSetPrimaryPhone: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<Response>;
        };
    };
};
export default _default;
