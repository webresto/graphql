"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("../../lib/graphqlHelper");
const worktime_1 = require("@webresto/worktime");
const AuthService_1 = require("@webresto/core/lib/AuthService");
graphqlHelper_1.default.addType(`#graphql
  type UserRestrictions {
    "Indicate main login field"
    loginField: String
    "Indicate required OTP on any login"
    loginOTPRequired: Boolean

    "List of all custom user fields"
    customFields: [UserCustomField]

    "Always \\"disabled\\": there is no password in auth v2. Kept so existing clients keep parsing."
    passwordPolicy: String @deprecated(reason: "no password in auth v2; sign-in is a proven AuthMethod")

    "Countries for send OTP"
    allowedPhoneCountries: [Country],

    linkToProcessingPersonalData: String,

    linkToUserAgreement: String

    "Allow spening bonuses"
    allowBonusSpending: Boolean

    "OTP code Length"
    OTPlength: Int
  }
  type Restrictions {
     "graphql scehma backward compatibility version"
      gqlSchemaMinVersion: Int

     "Delivery service working time"
      worktime: Json

      "Time possible for order from now"
      possibleToOrderInMinutes: Int
      timezone: String
      "Server timezone utc offset in seconds"
      utcOffsetInSeconds: Int

      "Server timezone utc offset (string)"
      utcOffset: String

      "Server date format"
      dateFormat: String

      "By default is POW"
      captchaType: String

      "The backend checks the phone strictly based on the mask"
      strictPhoneInput: Boolean

      "Allows you to make shipping calculations optional. Shipping calculations will occur. But it won't throw an error"
      softDeliveryCalculation: Boolean

      "Global delivery discription"
      deliveryDescription: Json

      "Fields needed to create new order"
      fieldsForOrderInitialization: [String]

      "Cities this installation delivers in. The customer picks one; it travels with the address and is what qualifies it for the geocoder."
      cities: [City]

      "A cart can only be created and filled by an authenticated user"
      requireAuthForCart: Boolean

      "Group User restrictions"
      user: UserRestrictions
    }
`);
exports.default = {
    Query: {
        restrictions: {
            def: 'restrictions: Restrictions',
            fn: () => {
                try {
                    return ({});
                }
                catch (error) {
                    sails.log.error(`GQL > [restrictions]`, error, {});
                    throw error;
                }
            }
        }
    },
    Restrictions: {
        worktime: async () => await Settings.get('WORK_TIME') ?? [],
        /**
         * GQL compatibility version
         */
        gqlSchemaMinVersion: () => 6000,
        possibleToOrderInMinutes: async () => isNaN(await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES')) ? 7 * 24 * 60 : await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES'),
        timezone: async () => {
            // Timezone may be unset — propagate null to the frontend instead of a fake default.
            const tz = await Settings.get('TZ');
            return (typeof tz === 'string' && tz.trim() !== '') ? tz : null;
        },
        utcOffsetInSeconds: async () => {
            const tz = await Settings.get('TZ');
            if (!(typeof tz === 'string' && tz.trim() !== ''))
                return null;
            return worktime_1.TimeZoneIdentifier.getTimeZoneOffsetInSeconds(worktime_1.TimeZoneIdentifier.getTimeZoneGMTOffset(tz));
        },
        utcOffset: async () => {
            const tz = await Settings.get('TZ');
            if (!(typeof tz === 'string' && tz.trim() !== ''))
                return null;
            return worktime_1.TimeZoneIdentifier.getTimeZoneGMTOffset(tz);
        },
        dateFormat: async () => {
            return await Settings.get('DATE_FORMAT') ?? 'yyyy-MM-dd';
        },
        strictPhoneInput: async () => {
            return await Settings.get("STRICT_PHONE_VALIDATION") ?? false;
        },
        softDeliveryCalculation: async () => {
            return await Settings.get("SOFT_DELIVERY_CALCULATION") ?? true;
        },
        captchaType: async () => await Settings.get('CAPTCHA_TYPE') || "POW",
        deliveryDescription: async () => await Settings.get('DELIVERY_DESCRIPTION'),
        fieldsForOrderInitialization: async () => {
            return await Settings.get("FIELDS_FOR_ORDER_INITIALIZATION") ?? [];
        },
        cities: async () => {
            // Real rows only. The synthetic city this used to invent from the
            // `CITY` setting could not be ordered in: nothing points at it.
            return await City.find({ where: { isDeleted: { "!=": true } }, sort: "name ASC" });
        },
        /**
         * Lets the client show the login screen *before* the first dish instead of learning the
         * policy from a failed mutation: formatError strips `extensions`, so the refusal from
         * getNewCart/addDish carries no code the client could branch on.
         *
         * The effective value, not the raw setting: while no sign-in method is enabled the core
         * ignores the flag (require-auth-for-cart.md §3.5), and a client told otherwise would
         * send the guest to a login screen with nothing on it.
         */
        requireAuthForCart: async () => {
            return await AuthService_1.default.cartRequiresAuth();
        },
        user: () => ({}), // Dummy resolver to nest the fields below
    },
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
        loginField: async () => 'phone',
        /**
         * Always true. After design2 there is no alternative: every sign-in goes through an
         * attempt that has to be proven, so "should we require an OTP" has stopped being a
         * question — which is why LOGIN_OTP_REQUIRED (and its never-read twin
         * CORE_LOGIN_OTP_REQUIRED) were deleted rather than defaulted.
         */
        loginOTPRequired: async () => true,
        customFields: async () => {
            let customFields = await Settings.get("CUSTOM_FIELDS");
            return customFields || [];
        },
        /**
         * @deprecated Always "disabled". The password subsystem is gone (remove-password.md):
         * no setting is read, because the setting no longer exists — a client that still keys a
         * form on "required" gets the one answer that draws no form.
         */
        passwordPolicy: () => "disabled",
        allowedPhoneCountries: async () => {
            let allowedPhoneCountriesList = [];
            // ALLOWED_PHONE_COUNTRIES
            let allowedPhoneCountries = await Settings.get("ALLOWED_PHONE_COUNTRIES");
            if (Array.isArray(allowedPhoneCountries) && typeof allowedPhoneCountries[0] === "string") {
                allowedPhoneCountries.forEach(allowedPhoneCountry => {
                    let country = sails.dictionaries.countries[allowedPhoneCountry];
                    if (country) {
                        allowedPhoneCountriesList.push(country);
                    }
                });
            }
            // If not found allow any
            if (allowedPhoneCountriesList.length === 0) {
                for (let countryCode in sails.dictionaries.countries) {
                    let country = sails.dictionaries.countries[countryCode];
                    if (country) {
                        allowedPhoneCountriesList.push(country);
                    }
                }
            }
            return allowedPhoneCountriesList;
        },
        linkToProcessingPersonalData: async () => await Settings.get("LINK_TO_PROCESSING_PERSONAL_DATA") ?? null,
        linkToUserAgreement: async () => await Settings.get("LINK_TO_USER_AGREEMENT") ?? null,
        /** @deprecated the authoritative length is AuthStep.codeLength — it varies per method
         *  (flash-call is 4, SMS is 6) and per provider, so a constant here can only be wrong. */
        OTPlength: () => 6,
        allowBonusSpending: async () => {
            return await Settings.get("ALLOW_BONUS_SPENDING") ?? true;
        },
    }
};
