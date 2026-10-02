import { Response } from "../../types/primitives";
interface UserResponse extends Response {
    user: User | undefined;
    registrationRequired: boolean;
}
interface InputUser {
    firstName: string;
    lastName: string;
    birthday: string;
    customData: {
        [key: string]: string | boolean | number;
    };
    customFields: {
        [key: string]: string | boolean | number;
    };
}
type RegistrationPayload = {
    firstName: string;
    lastName: string;
    customFields: {
        [key: string]: string | boolean | number;
    };
};
declare const _default: {
    Mutation: {
        /**
         * Signing in is `authStart` → `authSubmit` → `authExchange` (src/resolvers/auth.ts), and
         * there is no second way in: the old `login(login, phone, password, otp)` and its
         * `OTPRequest` companion are gone, not deprecated. They were the last places where a code
         * minted "for signing in" was accepted, where an account could be conjured from a password
         * policy, and where `CORE_LOGIN_FIELD` decided what an account was keyed by. All three of
         * those are answered by an AuthAttempt and an AuthIdentity now (design2 §6, extend §11).
         *
         * What is left here is the profile: naming the account, deleting it. There is no password
         * (.ai-notes/auth/remove-password.md): a way in is a proven AuthMethod, nothing else.
         */
        registration: {
            def: string;
            fn: (parent: any, payload: RegistrationPayload, context: any, info: any) => Promise<UserResponse>;
        };
        logout: {
            def: string;
            fn: (parent: any, payload: {
                deviceId: any;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
                i18n: any;
            }) => Promise<Response>;
        };
        logoutFromAllDevices: {
            def: string;
            fn: (parent: any, payload: any, context: any) => Promise<Response>;
        };
        favoriteDish: {
            def: string;
            fn: (parent: any, payload: {
                dishId: string;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<boolean>;
        };
        userUpdate: {
            def: string;
            fn: (parent: any, payload: {
                user: InputUser;
            }, context: any) => Promise<UserResponse>;
        };
        userDelete: {
            def: string;
            fn: (parent: any, payload: any, context: any, info: any) => Promise<Response>;
        };
    };
};
export default _default;
