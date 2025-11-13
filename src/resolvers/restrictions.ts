import slugify from "slugify";
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

      "City for current restoapp server"  
      city: City

      "The server is part of the several city delivery chain"
      multipleCities: Boolean
      
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
         * As soon as the frontend breaks with the current scheme, this version should be switched
         * On backend this up by 1000 step, in frontend up bu 1
         */
        gqlSchemaMinVersion: () => 4000,
        possibleToOrderInMinutes: async () => isNaN(await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES')) ? 7 * 24 * 60 : await Settings.get('POSSIBLE_TO_ORDER_IN_MINUTES'),
        minDeliveryTimeInMinutes: async () => isNaN(await Settings.get('MIN_DELIVERY_TIME_IN_MINUTES')) ? 40 : await Settings.get('MIN_DELIVERY_TIME_IN_MINUTES'),
        timezone: async () => {
            return await Settings.get('TZ') ?? 'Etc/GMT'
        },

        utcOffsetInSeconds: async () => {
            let tz = await Settings.get('TZ') ?? 'Etc/GMT'
            return TimeZoneIdentifier.getTimeZoneOffsetInSeconds(TimeZoneIdentifier.getTimeZoneGMTOffset(tz))
        },

        utcOffset: async () => {
            let tz = await Settings.get('TZ') ?? 'Etc/GMT'
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
        city: async () => {
            let cityName = await Settings.get("CITY") as string;
            if(!cityName) return null
            let slug  = slugify(cityName, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en'});

            let city = (await City.find({slug}))[0]
            
            if(!city && cityName !== undefined) {
                //@ts-ignore
                city = {name: cityName, slug: slug}
            }
                
            return city
        },
        multipleCities: async () => {
            return (await City.count({isDeleted: false})) > 1
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
        linkToProcessingPersonalData: () => "/static/processing_personal_data",
        linkToUserAgreement: () => "/static/user_agreement",
        OTPlength: () => 6,
        allowBonusSpending: async () => {
            return await Settings.get("ALLOW_BONUS_SPENDING") ?? true;
        },
    }
}
