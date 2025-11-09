declare const _default: {
    Query: {
        restrictions: {
            def: string;
            fn: () => {};
        };
    };
    Restrictions: {
        worktime: () => Promise<string | boolean | string[]>;
        /**
         * GQL compatibility version
         * As soon as the frontend breaks with the current scheme, this version should be switched
         * On backend this up by 1000 step, in frontend up bu 1
         */
        gqlSchemaMinVersion: () => number;
        possibleToOrderInMinutes: () => Promise<string | number | boolean | string[]>;
        minDeliveryTimeInMinutes: () => Promise<string | boolean | string[] | 40>;
        timezone: () => Promise<string | boolean | string[]>;
        utcOffsetInSeconds: () => Promise<number>;
        utcOffset: () => Promise<string>;
        dateFormat: () => Promise<string | boolean | string[]>;
        strictPhoneInput: () => Promise<string | boolean | string[]>;
        softDeliveryCalculation: () => Promise<string | boolean | string[]>;
        deliveryTerms: () => Promise<string | boolean | string[]>;
        captchaType: () => Promise<string>;
        deliveryDescription: () => Promise<string | boolean | string[]>;
        fieldsForOrderInitialization: () => Promise<string | boolean | string[]>;
        city: () => Promise<import("@webresto/core").CityRecord>;
        multipleCities: () => Promise<boolean>;
        user: () => {};
    };
    UserRestrictions: {
        loginField: () => Promise<string | true | string[]>;
        loginOTPRequired: () => Promise<boolean>;
        customFields: () => Promise<string[]>;
        passwordPolicy: () => Promise<string | true | string[]>;
        allowedPhoneCountries: () => Promise<any[]>;
        linkToProcessingPersonalData: () => string;
        linkToUserAgreement: () => string;
        OTPlength: () => number;
        allowBonusSpending: () => Promise<string | boolean | string[]>;
    };
};
export default _default;
