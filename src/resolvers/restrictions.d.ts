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
         */
        gqlSchemaMinVersion: () => number;
        possibleToOrderInMinutes: () => Promise<string | number | boolean | string[]>;
        timezone: () => Promise<string>;
        utcOffsetInSeconds: () => Promise<number>;
        utcOffset: () => Promise<string>;
        dateFormat: () => Promise<string | boolean | string[]>;
        strictPhoneInput: () => Promise<string | boolean | string[]>;
        softDeliveryCalculation: () => Promise<string | boolean | string[]>;
        captchaType: () => Promise<string | true | string[]>;
        deliveryDescription: () => Promise<string | boolean | string[]>;
        fieldsForOrderInitialization: () => Promise<string | boolean | string[]>;
        cities: () => Promise<import("@webresto/core/models/City").CityRecord[]>;
        /**
         * Lets the client show the login screen *before* the first dish instead of learning the
         * policy from a failed mutation: formatError strips `extensions`, so the refusal from
         * getNewCart/addDish carries no code the client could branch on.
         *
         * The effective value, not the raw setting: while no sign-in method is enabled the core
         * ignores the flag (require-auth-for-cart.md §3.5), and a client told otherwise would
         * send the guest to a login screen with nothing on it.
         */
        requireAuthForCart: () => Promise<boolean>;
        user: () => {};
    };
    UserRestrictions: {
        /**
         * Always 'phone'. The field is a leftover of CORE_LOGIN_FIELD, which chose what an account
         * was keyed by; it is kept in the schema only so clients that have not moved to
         * `authMethods` keep parsing, and `authMethods` is the real answer.
         *
         * It used to be computed from the registry, to report 'email' when the only enabled
         * phone_proof offer was an email-shaped one. There is no such offer any more: the core
         * cannot prove an address, so a phone number is the one login string it knows (review3
         * §1.2). The query behind this was a database round trip that could only ever return
         * 'phone'.
         */
        loginField: () => Promise<string>;
        /**
         * Always true. After design2 there is no alternative: every sign-in goes through an
         * attempt that has to be proven, so "should we require an OTP" has stopped being a
         * question — which is why LOGIN_OTP_REQUIRED (and its never-read twin
         * CORE_LOGIN_OTP_REQUIRED) were deleted rather than defaulted.
         */
        loginOTPRequired: () => Promise<boolean>;
        customFields: () => Promise<string | true | string[]>;
        /**
         * @deprecated Always "disabled". The password subsystem is gone (remove-password.md):
         * no setting is read, because the setting no longer exists — a client that still keys a
         * form on "required" gets the one answer that draws no form.
         */
        passwordPolicy: () => string;
        allowedPhoneCountries: () => Promise<any[]>;
        linkToProcessingPersonalData: () => Promise<string | boolean | string[]>;
        linkToUserAgreement: () => Promise<string | boolean | string[]>;
        /** @deprecated the authoritative length is AuthStep.codeLength — it varies per method
         *  (flash-call is 4, SMS is 6) and per provider, so a constant here can only be wrong. */
        OTPlength: () => number;
        allowBonusSpending: () => Promise<string | boolean | string[]>;
    };
};
export default _default;
