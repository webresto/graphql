"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const userAuth = sails.config.restographql.authService;
const jwt_1 = require("../../lib/jwt");
// todo: fix types model instance to {%ModelName%}Record for User";
const adapters_1 = require("@webresto/core/adapters");
let captchaAdapter = adapters_1.Captcha.getAdapter();
const graphqlHelper_1 = require("../../lib/graphqlHelper");
const checkDeviceId_1 = require("../../lib/helper/checkDeviceId");
graphqlHelper_1.default.addType(`#graphql
  type UserResponse {
    user: User
    message: Message
    action: Action
  }

  input InputUser {
    firstName: String
    lastName: String
    birthday: String
    customData: Json
    customFields: Json
  }
  `);
exports.default = {
    Mutation: {
        login: {
            def: `#graphql
      """ login method """
      login(
        login: String!,

        "(required when login field is phone)"
        phone: InputPhone,

        "(only when passwordPolicy is required )"
        password: String,

        "(from otpRequest)"
        otp: String,

        "(solved captcha for label 'quickAccessByOTP:%login%')"
        captcha: Captcha!
      ): UserResponse`,
            fn: async (parent, payload, context, info) => {
                try {
                    // TODO:  this is copied from restrictions need make it from one place
                    if (!(await captchaAdapter).check(payload.captcha, `login:${payload.login}`))
                        throw `bad captcha`;
                    // Define password policy
                    let passwordPolicy = (await Settings.get("PASSWORD_POLICY"));
                    if (!passwordPolicy)
                        passwordPolicy = "from_otp";
                    let loginOTPRequired = await Settings.get("LOGIN_OTP_REQUIRED");
                    if (!loginOTPRequired)
                        loginOTPRequired = false;
                    let loginField = await Settings.get("CORE_LOGIN_FIELD");
                    if (!loginField)
                        loginField = "phone";
                    if (passwordPolicy === "required" && !payload.password) {
                        throw `password is required`;
                    }
                    if (loginOTPRequired && !payload.otp) {
                        throw `OTP is required`;
                    }
                    // It should have or Password or OTP at one time
                    if (!payload.otp && !payload.password) {
                        throw `or Password or OTP required`;
                    }
                    (0, checkDeviceId_1.default)(context);
                    // Check phone TODO: move in User
                    if ((await Settings.get("CORE_LOGIN_FIELD")) === undefined ||
                        (await Settings.get("CORE_LOGIN_FIELD")) === "phone") {
                        if (!payload.phone) {
                            throw `Phone is required, when login field is phone`;
                        }
                        else {
                            let genLogin = (payload.phone.code +
                                payload.phone.number +
                                payload.phone.additionalNumber).replace(/\D/g, "");
                            if (genLogin !== payload.login) {
                                throw `Login is: js (payload.phone.code+payload.phone.number+payload.phone.additionalNumber).replace(/\D/g, '')`;
                            }
                        }
                    }
                    let userDevice = await User.login(payload.login, payload.phone, context.connectionParams.deviceId, "DEVICE NAME", payload.password, payload.otp, context.connectionParams["user-agent"], "IP_");
                    let authData = {
                        userId: userDevice.user,
                        deviceId: userDevice.id,
                        sessionId: userDevice.sessionId,
                    };
                    const JWTtoken = await jwt_1.JWTAuth.sign(authData);
                    let message = {
                        deviceId: context.connectionParams.deviceId,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("Authorization"),
                    };
                    let user = await User.findOne({ id: userDevice.user });
                    context.connectionParams.authorization = JWTtoken;
                    let action = {
                        deviceId: context.connectionParams.deviceId,
                        type: "Authorization",
                        data: {
                            token: JWTtoken,
                        },
                    };
                    // Here should be Emitter for Action And Message modification
                    return {
                        user: user,
                        message: message,
                        action: action,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [login]`, error, payload);
                    throw error;
                }
            },
        },
        restorePassword: {
            def: `#graphql
      """ Password restore method """
      restorePassword(
        login: String!,

        "(required when login field is phone)"
        phone: InputPhone,

        password: String!,

        "(from otpRequest)"
        otp: String!,

        "(solved captcha for label 'quickAccessByOTP:%login%')"
        captcha: Captcha!
      ): UserResponse`,
            fn: async (parent, payload, context) => {
                try {
                    (0, checkDeviceId_1.default)(context);
                    // Check password policy
                    let passwordPolicy = (await Settings.get("PASSWORD_POLICY"));
                    if (!passwordPolicy)
                        passwordPolicy = "from_otp";
                    // It should have or Password or OTP at one time
                    if (!payload.otp || !payload.password) {
                        throw `Password and OTP required`;
                    }
                    let userDevice;
                    let user = await User.findOne({ login: payload.login });
                    if (user && user.verified) {
                        userDevice = await User.login(payload.login, payload.phone, context.connectionParams.deviceId, "DEVICE NAME", null, payload.otp, context.connectionParams["user-agent"], "0.0.0.0");
                        await User.setPassword(user.id, payload.password, null, true, null);
                    }
                    else {
                        return {
                            user: null,
                            message: {
                                deviceId: context.connectionParams.deviceId,
                                title: context.i18n.__("User not found"),
                                type: "error",
                                message: context.i18n.__("Check login please"),
                            },
                            action: null,
                        };
                    }
                    let authData = {
                        userId: userDevice.user,
                        deviceId: userDevice.id,
                        sessionId: userDevice.sessionId,
                    };
                    const JWTtoken = await jwt_1.JWTAuth.sign(authData);
                    let message = {
                        deviceId: context.connectionParams.deviceId,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("Password was changed"),
                    };
                    let action = {
                        deviceId: context.connectionParams.deviceId,
                        type: "Authorization",
                        data: {
                            token: JWTtoken,
                        },
                    };
                    // Here should be Emitter for Action And Message modification
                    return {
                        user: user,
                        message: message,
                        action: action,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [restorePassword]`, error, payload);
                    throw error;
                }
            },
        },
        registration: {
            def: `#graphql
      registration(

        "loginField from UserRestrictions, When (UserRestrictions.loginField=phone) you must send concatenate [otp+number] (only digits)"
        login: String!,

        "required when loginField=phone, it will checks with login field"
        phone: InputPhone

        password: String,

        "otp from otpRequest"
        otp: String!

        firstName: String,
        lastName: String,

        "Is object {} with all required fields from UserRestrictions.customFields. Is required if custom required fields was defined"
        customFields: Json,

        "Solved captcha for label 'registration:%login%'"
        captcha: Captcha!
      ): UserResponse`,
            fn: async (parent, payload, context, info) => {
                (0, checkDeviceId_1.default)(context);
                try {
                    if (!(await captchaAdapter).check(payload.captcha, `registration:${payload.login}`))
                        throw `bad captcha`;
                    if (!payload.password && !payload.otp) {
                        throw `(password || otp) is required`;
                    }
                    // Define password policy
                    let passwordPolicy = (await Settings.get("PASSWORD_POLICY"));
                    if (!passwordPolicy)
                        passwordPolicy = "from_otp";
                    if ((await Settings.get("FIRSTNAME_REQUIRED")) &&
                        !payload.firstName) {
                        throw `firstName is required`;
                    }
                    if (passwordPolicy === "required" && !payload.password) {
                        throw `password is required`;
                    }
                    else if (passwordPolicy === "disabled" &&
                        payload.password) {
                        throw `Found password but passwordPolicy is: disabled`;
                    }
                    if ((await Settings.get("CORE_LOGIN_FIELD")) === undefined ||
                        (await Settings.get("CORE_LOGIN_FIELD")) === "phone") {
                        if (!payload.phone) {
                            throw `Phone is required, when login field is phone`;
                        }
                        else {
                            let genLogin = (payload.phone.code +
                                payload.phone.number +
                                payload.phone.additionalNumber).replace(/\D/g, "");
                            if (genLogin !== payload.login) {
                                throw `Login is: js (payload.phone.code+payload.phone.number+payload.phone.additionalNumber).replace(/\D/g, '')`;
                            }
                        }
                    }
                    if (payload.otp &&
                        !(await OneTimePassword.check(payload.login, payload.otp))) {
                        throw "OTP check failed";
                    }
                    let newUser = await User.create({
                        phone: payload.phone,
                        login: payload.login,
                        firstName: payload.firstName,
                    }).fetch();
                    if (passwordPolicy === "required") {
                        newUser = await User.setPassword(newUser.id, payload.password, null, true);
                    }
                    else if (passwordPolicy === "from_otp") {
                        newUser = await User.setPassword(newUser.id, payload.otp, null, true);
                    }
                    let message = {
                        deviceId: context.connectionParams.deviceId,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("New user created"),
                    };
                    // let action: Action = {
                    //   type: "GoTo",
                    //   data: {
                    //     "section": "login",
                    //     "delaySeconds": 5
                    //   }
                    // }
                    return {
                        user: newUser,
                        message: message,
                        action: null,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [registration]`, error, payload);
                    throw new Error(error);
                }
            },
        },
        // Authentication required
        logout: {
            def: `#graphql
      logout(
        "Optional field if not pass logout from current device",
        deviceId: String
      ): Response`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    let deviceId;
                    if (!payload.deviceId) {
                        deviceId = auth.deviceId;
                    }
                    else {
                        let ud = await UserDevice.findOne({ name: payload.deviceId });
                        deviceId = ud.id;
                    }
                    if (!(await UserDevice.checkSession(auth.sessionId, auth.userId, {
                        lastIP: "IP",
                        userAgent: context.connectionParams["user-agent"],
                    }))) {
                        throw `Authentication failed`;
                    }
                    await UserDevice.update({ id: deviceId }, { isLoggedIn: false }).fetch();
                    let message = {
                        deviceId: deviceId,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("Logout"),
                    };
                    let action = undefined;
                    // Here should be Emitter for Action And Message modification
                    return {
                        message: message,
                        action: action,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [logout]`, error, payload);
                    throw error;
                }
            },
        },
        logoutFromAllDevices: {
            def: `logoutFromAllDevices: Response`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    if (!(await UserDevice.checkSession(auth.sessionId, auth.userId, {
                        lastIP: "IP",
                        userAgent: context.connectionParams["user-agent"],
                    }))) {
                        throw `Authentication failed`;
                    }
                    UserDevice.update({ user: auth.userId }, { isLoggedIn: false }).fetch();
                    let message = {
                        deviceId: null,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("Logout from all devices"),
                    };
                    let action = undefined;
                    // Here should be Emitter for Action And Message modification
                    return {
                        message: message,
                        action: action,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [logoutFromAllDevices]`, error, payload);
                    throw error;
                }
            },
        },
        // Authentication required
        favoriteDish: {
            def: `#graphql
      favoriteDish(
        dishId: String!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    await User.handleFavoriteDish(auth.userId, payload.dishId);
                    return true;
                }
                catch (error) {
                    sails.log.error(`GQL > [favoriteDish]`, error, payload);
                    throw error;
                }
            },
        },
        // Authentication required
        userUpdate: {
            def: `#graphql
      userUpdate(
        user: InputUser!
      ): UserResponse`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    let user = await User.updateOne({ id: auth.userId }, payload.user);
                    let message = {
                        deviceId: null,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("User was updated"),
                    };
                    // Here should be Emitter for Action And Message modification
                    return {
                        user: user,
                        message: message,
                        action: null,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [userUpdate]`, error, payload);
                    throw error;
                }
            },
        },
        userDelete: {
            def: `#graphql
      """User delete method """
      userDelete(

        "(from otpRequest userDelete:%login%)"
        otp: String!,
      ): Response`,
            fn: async (parent, payload, context, info) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    await User.delete(auth.userId, payload.otp, false);
                    let message = {
                        deviceId: null,
                        title: context.i18n.__("Success"),
                        type: "info",
                        message: context.i18n.__("The user will be deleted"),
                    };
                    let action = null;
                    // Here should be Emitter for Action And Message modification
                    return {
                        message: message,
                        action: action,
                    };
                }
                catch (error) {
                    sails.log.error(`GQL > [userDelete]`, error, payload);
                    throw error;
                }
            },
        },
    },
};
