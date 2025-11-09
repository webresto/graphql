import sails from "@42pub/typed-sails";
import { Config } from "@webresto/core/interfaces/Config";
type sailsConfig = typeof sails.config;
declare global {
    export interface Sails extends sails.Sails {
        on: any;
        emit: any;
        router: any;
        models: any;
        config: _sailsConfig;
        log: any;
        after: any;
        graphql: any;
    }
    interface _sailsConfig extends sailsConfig {
        restocore: Config;
        [key: string]: any | object;
    }
}
declare global {
    interface IAwaitEmitter {
        [key: `graphql-query-${string}`]: [any];
        [key: `http-api:before-send-${string}`]: [any];
        'graphql-return-payment-method': [string, PaymentMethod[]];
        "http-api:create-newcart": [Order];
        "http-api:init-newcart": [Order];
        "http-api:before-response-order-update": [Order];
        /**
         * In this case, you need to specify PopulatedOrder
         */
        "http-api:before-response-order-set-dish-comment": [Order];
        "http-api:before-response-order-set-dish-amount": [Order];
        "http-api:before-response-order-remove-dish": [Order];
        "http-api:before-response-order-replace-dish": [Order];
        "http-api:before-response-order-add-dish": [Order];
        "http-api:before-response-order": [Order];
        "graphql-return-bonus-program": [string, BonusProgram[]];
        "send-message": [{
            orderId: string;
            message: any;
        }];
    }
    interface SettingList {
        JWT_SECRET: string;
        PASS_ORDERS_ERRORS: boolean;
        RECOMMENDED_GROUPID_FOR_ORDER: string;
        RECOMMENDED_GROUPID_FOR_DISHES: string;
        RECOMMENDED_FORCE_DISHES: string;
        CAPTCHA_TYPE: string;
        CUSTOM_FIELDS: string[];
        PASSWORD_REQUIRED: boolean;
        LOGIN_OTP_REQUIRED: boolean;
    }
}
export {};
