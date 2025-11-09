import { Phone } from "@webresto/core/models/User";
import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter";
import { Response } from "../../types/primitives";
interface UserResponse extends Response {
    user: User | undefined;
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
    login: string;
    phone: Phone;
    password: string;
    otp: string;
    firstName: string;
    lastName: string;
    customFields: {
        [key: string]: string | boolean | number;
    };
    captcha: ResolvedCaptcha;
};
declare const _default: {
    Mutation: {
        login: {
            def: string;
            fn: (parent: any, payload: any, context: any, info: any) => Promise<UserResponse>;
        };
        restorePassword: {
            def: string;
            fn: (parent: any, payload: any, context: any) => Promise<UserResponse>;
        };
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
