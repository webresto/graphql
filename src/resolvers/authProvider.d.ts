import { Response } from "../../types/primitives";
interface UserResponse extends Response {
    user: any;
}
declare const _default: {
    Query: {
        authProviders: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core/models/AuthProvider").AuthProviderPublic[]>;
        };
        authStatus: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                status: any;
                token: any;
            } | {
                status: string;
                token: string;
            }>;
        };
    };
    Mutation: {
        startAuth: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                stateId: any;
                kind: import("@webresto/core/adapters/auth/AuthProviderAdapter").AuthFlowKind;
                redirectUrl: string;
                clientPayload: Record<string, unknown>;
            }>;
        };
        completeAuth: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<UserResponse>;
        };
        confirmAuthPhone: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<UserResponse>;
        };
        linkAuthProvider: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                stateId: any;
                kind: import("@webresto/core/adapters/auth/AuthProviderAdapter").AuthFlowKind;
                redirectUrl: string;
                clientPayload: Record<string, unknown>;
            }>;
        };
        unlinkAuthProvider: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<Response>;
        };
    };
};
export default _default;
