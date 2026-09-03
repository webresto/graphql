import graphqlHelper from "../../lib/graphqlHelper";
import { TimeZoneIdentifier } from "@webresto/worktime"
graphqlHelper.addType(`#graphql
  type UserRestrictions {
    "Indicate main login field"
    loginField: String
    "Indicate required OTP on any login"
    loginOTPRequired: Boolean

    "List of all custom user fields"
    customFields: [UserCustomField]

    "Password is required in users accounts"
    passwordPolicy: String

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

      "Brief description of delivery conditions"
      deliveryTerms: String

      "Global delivery discription"
      deliveryDescription: Json
      "The minimum time for which delivery of the order is possible"
      minDeliveryTimeInMinutes: Int

      "Fields needed to create new order"  
      fieldsForOrderInitialization: [String]

      "Cities this installation delivers in. The customer picks one; it travels with the address and is what qualifies it for the geocoder."
      cities: [City]

      "Group User restrictions"
      user: UserRestrictions
    }
`);

export default {
    Query: {
        restrictions: {
            def: 'restrictions: Restrictions',
            fn: () => {
                try {
                    return ({})
                } catch (error) {
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
        gqlSchemaMinVersion: () => 5000,
        possibleToOrderInMinutes: async () => isNaN(await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES')) ? 7 * 24 * 60 : await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES'),
        minDeliveryTimeInMinutes: async () => isNaN(await Settings.get('MIN_DELIVERY_TIME_IN_MINUTES')) ? 40 : await Settings.get('MIN_DELIVERY_TIME_IN_MINUTES'),
        timezone: async () => {
            // Timezone may be unset — propagate null to the frontend instead of a fake default.
            const tz = await Settings.get('TZ');
            return (typeof tz === 'string' && tz.trim() !== '') ? tz : null;
        },

        utcOffsetInSeconds: async () => {
            const tz = await Settings.get('TZ');
            if (!(typeof tz === 'string' && tz.trim() !== '')) return null;
            return TimeZoneIdentifier.getTimeZoneOffsetInSeconds(TimeZoneIdentifier.getTimeZoneGMTOffset(tz))
        },

        utcOffset: async () => {
            const tz = await Settings.get('TZ');
            if (!(typeof tz === 'string' && tz.trim() !== '')) return null;
            return TimeZoneIdentifier.getTimeZoneGMTOffset(tz)
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
        deliveryTerms: async () => {
            return await Settings.get("DELIVERY_MESSAGE") ?? null;
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
        user: () => ({}), // Dummy resolver to nest the fields below
    },
    UserRestrictions: {
        loginField: async () => {
            let loginField = await Settings.get("CORE_LOGIN_FIELD");
            return loginField || 'phone';
        },
        loginOTPRequired: async () => {
            let loginOTPRequired = await Settings.get("LOGIN_OTP_REQUIRED");
            return loginOTPRequired || false;
        },
        customFields: async () => {
            let customFields = await Settings.get("CUSTOM_FIELDS");
            return customFields || [];
        },
        passwordPolicy: async () => {
            let passwordPolicy = await Settings.get("PASSWORD_POLICY");
            return passwordPolicy || "from_otp";
        },
        allowedPhoneCountries: async () => {
            let allowedPhoneCountriesList = [];

            // ALLOWED_PHONE_COUNTRIES
            let allowedPhoneCountries = await Settings.get("ALLOWED_PHONE_COUNTRIES");
            if (Array.isArray(allowedPhoneCountries) && typeof allowedPhoneCountries[0] === "string") {
                allowedPhoneCountries.forEach(allowedPhoneCountry => {
                    let country = sails.hooks.restocore.dictionaries.countries[allowedPhoneCountry]
                    if (country) {
                        allowedPhoneCountriesList.push(country)
                    }
                });
            }

            // If not found allow any
            if(allowedPhoneCountriesList.length === 0) {
                for (let countryCode in sails.hooks.restocore.dictionaries.countries) {
                    let country = sails.hooks.restocore.dictionaries.countries[countryCode];
                    if (country) {
                        allowedPhoneCountriesList.push(country);
                    }
                }
            }

            return allowedPhoneCountriesList;
        },
        linkToProcessingPersonalData: async () => await Settings.get("LINK_TO_PROCESSING_PERSONAL_DATA") ?? null,
        linkToUserAgreement: async () => await Settings.get("LINK_TO_USER_AGREEMENT") ?? null,
        OTPlength: () => 6,
        allowBonusSpending: async () => {
            return await Settings.get("ALLOW_BONUS_SPENDING") ?? true;
        },
    }
}
