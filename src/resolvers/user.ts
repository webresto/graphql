// const userAuth = sails.config.restographql.authService;
import { JWTAuth } from "../../lib/jwt";
import { Phone } from "@webresto/core/models/User";
// todo: fix types model instance to {%ModelName%}Record for User";
import { Captcha } from "@webresto/core/adapters";
import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter";
import { Message, Action, Response } from "../../types/primitives";
let captchaAdapter = Captcha.getAdapter();

import graphqlHelper from "../../lib/graphqlHelper";
import checkDeviceId from "../../lib/helper/checkDeviceId";

// define UserResponse
interface UserResponse extends Response {
  user: User | undefined;
}


interface InputUser {
  firstName: string
  lastName: string
  birthday: string
  customData: {
    [key: string]: string | boolean | number;
  }
  customFields: {
    [key: string]: string | boolean | number;
  }
}

graphqlHelper.addType(`#graphql
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

export default {
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
      fn: async (
        parent: any,
        payload: any,
        context: any,
        info: any
      ): Promise<UserResponse> => {
        // TODO:  this is copied from restrictions need make it from one place
        if (
          !(await captchaAdapter).check(
            payload.captcha,
            `login:${payload.login}`
          )
        )
          throw `bad captcha`;

        // Define password policy
        let passwordPolicy = (await Settings.get("PASSWORD_POLICY")) as
          | "required"
          | "from_otp"
          | "disabled";
        if (!passwordPolicy) passwordPolicy = "from_otp";

        let loginOTPRequired = await Settings.get("LOGIN_OTP_REQUIRED");
        if (!loginOTPRequired) loginOTPRequired = false;

        let loginField = await Settings.get("CORE_LOGIN_FIELD");
        if (!loginField) loginField = "phone";

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

        checkDeviceId(context);


        // Check phone TODO: move in User
        if (
          (await Settings.get("CORE_LOGIN_FIELD")) === undefined ||
          (await Settings.get("CORE_LOGIN_FIELD")) === "phone"
        ) {
          if (!payload.phone) {
            throw `Phone is required, when login field is phone`;
          } else {
            let genLogin = (
              payload.phone.code +
              payload.phone.number +
              payload.phone.additionalNumber
            ).replace(/\D/g, "");
            if (genLogin !== payload.login) {
              throw `Login is: js (payload.phone.code+payload.phone.number+payload.phone.additionalNumber).replace(/\D/g, '')`;
            }
          }
        }

        let userDevice = await User.login(
          payload.login,
          payload.phone,
          context.connectionParams.deviceId,
          "DEVICE NAME",
          payload.password,
          payload.otp,
          context.connectionParams["user-agent"],
          "IP_"
        );

        let authData = {
          userId: userDevice.user as string,
          deviceId: userDevice.id as string,
          sessionId: userDevice.sessionId as string,
        };

        const JWTtoken = await JWTAuth.sign(authData);
        let message: Message = {
          deviceId: context.connectionParams.deviceId,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("Authorization"),
        };



        let user = await User.findOne({ id: userDevice.user as string });
        context.connectionParams.authorization = JWTtoken;
        let action: Action = {
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

      fn: async (
        parent: any,
        payload: any,
        context: any
      ): Promise<UserResponse> => {

        checkDeviceId(context);


        // Check password policy
        let passwordPolicy = (await Settings.get("PASSWORD_POLICY")) as
          | "required"
          | "from_otp"
          | "disabled";
        if (!passwordPolicy) passwordPolicy = "from_otp";

        // It should have or Password or OTP at one time
        if (!payload.otp || !payload.password) {
          throw `Password and OTP required`;
        }

        let userDevice;
        let user = await User.findOne({ login: payload.login });
        if (user && user.verified) {
          userDevice = await User.login(
            payload.login,
            payload.phone,
            context.connectionParams.deviceId,
            "DEVICE NAME",
            null,
            payload.otp,
            context.connectionParams["user-agent"],
            "0.0.0.0"
          );
          await User.setPassword(user.id, payload.password, null, true, null);
        } else {
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
          userId: userDevice.user as string,
          deviceId: userDevice.id as string,
          sessionId: userDevice.sessionId as string,
        };

        const JWTtoken = await JWTAuth.sign(authData);

        let message: Message = {
          deviceId: context.connectionParams.deviceId,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("Password was changed"),
        };

        let action: Action = {
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

      fn: async (
        parent: any,
        payload: RegistrationPayload,
        context: any,
        info: any
      ): Promise<UserResponse> => {
        checkDeviceId(context);


        try {
          if (
            !(await captchaAdapter).check(
              payload.captcha,
              `registration:${payload.login}`
            )
          )
            throw `bad captcha`;

          if (!payload.password && !payload.otp) {
            throw `(password || otp) is required`;
          }

          // Define password policy
          let passwordPolicy = (await Settings.get("PASSWORD_POLICY")) as
            | "required"
            | "from_otp"
            | "disabled";
          if (!passwordPolicy) passwordPolicy = "from_otp";

          if (
            (await Settings.get("FIRSTNAME_REQUIRED")) &&
            !payload.firstName
          ) {
            throw `firstName is required`;
          }

          if (passwordPolicy === "required" && !payload.password) {
            throw `password is required`;
          } else if (
            passwordPolicy === "disabled" &&
            payload.password
          ) {
            throw `Found password but passwordPolicy is: disabled`;
          }

          if (
            (await Settings.get("CORE_LOGIN_FIELD")) === undefined ||
            (await Settings.get("CORE_LOGIN_FIELD")) === "phone"
          ) {
            if (!payload.phone) {
              throw `Phone is required, when login field is phone`;
            } else {
              let genLogin = (
                payload.phone.code +
                payload.phone.number +
                payload.phone.additionalNumber
              ).replace(/\D/g, "");
              if (genLogin !== payload.login) {
                throw `Login is: js (payload.phone.code+payload.phone.number+payload.phone.additionalNumber).replace(/\D/g, '')`;
              }
            }
          }

          if (
            payload.otp &&
            !(await OneTimePassword.check(payload.login, payload.otp))
          ) {
            throw "OTP check failed";
          }

          let newUser = await User.create({
            phone: payload.phone,
            login: payload.login,
            firstName: payload.firstName,
          }).fetch();

          if (passwordPolicy === "required") {
            newUser = await User.setPassword(
              newUser.id,
              payload.password,
              null,
              true
            );
          } else if (passwordPolicy === "from_otp") {
            newUser = await User.setPassword(
              newUser.id,
              payload.otp,
              null,
              true
            );
          }

          let message: Message = {
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
        } catch (error) {
          sails.log.error(error);
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
      fn: async (
        parent: any,
        payload: { deviceId: any },
        context: { connectionParams: { authorization: string }, i18n: any }
      ): Promise<Response> => {

        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );
        let deviceId: string;
        if (!payload.deviceId) {
          deviceId = auth.deviceId;
        } else {
          let ud = await UserDevice.findOne({ name: payload.deviceId });
          deviceId = ud.id;
        }

        if (
          !(await UserDevice.checkSession(auth.sessionId, auth.userId, {
            lastIP: "IP",
            userAgent: context.connectionParams["user-agent"],
          }))
        ) {
          throw `Authentication failed`;
        }

        await UserDevice.update({ id: deviceId }, { isLoggedIn: false }).fetch();

        let message: Message = {
          deviceId: deviceId,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("Logout"),
        };

        let action: Action = undefined;

        // Here should be Emitter for Action And Message modification

        return {
          message: message,
          action: action,
        };
      },
    },

    logoutFromAllDevices: {
      def: `logoutFromAllDevices: Response`,
      fn: async (
        parent: any,
        payload: any,
        context: any
      ): Promise<Response> => {
        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );

        if (
          !(await UserDevice.checkSession(auth.sessionId, auth.userId, {
            lastIP: "IP",
            userAgent: context.connectionParams["user-agent"],
          }))
        ) {
          throw `Authentication failed`;
        }

        UserDevice.update({ user: auth.userId }, { isLoggedIn: false }).fetch();

        let message: Message = {
          deviceId: null,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("Logout from all devices"),
        };

        let action: Action = undefined;

        // Here should be Emitter for Action And Message modification

        return {
          message: message,
          action: action,
        };
      },
    },

    // Authentication required
    favoriteDish: {
      def: `#graphql
      favoriteDish(
        dishId: String!
      ): Boolean`,
      fn: async (
        parent: any,
        payload: { dishId: string },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {

        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );

        await User.handleFavoriteDish(auth.userId, payload.dishId)
        return true
      },
    },



    // Authentication required
    userUpdate: {
      def: `#graphql
      userUpdate(
        user: InputUser!
      ): UserResponse`,
      fn: async (
        parent: any,
        payload: { user: InputUser },
        context: any
      ): Promise<UserResponse> => {
        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );

        let user = await User.updateOne({ id: auth.userId }, payload.user)

        let message: Message = {
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
      },
    },
    userDelete: {
      def: `#graphql
      """User delete method """
      userDelete(

        "(from otpRequest userDelete:%login%)"
        otp: String!,
      ): Response`,
      fn: async (
        parent: any,
        payload: any,
        context: any,
        info: any
      ): Promise<Response> => {

        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );

        await User.delete(auth.userId, payload.otp, false);

        let message: Message = {
          deviceId: null,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("The user will be deleted"),
        };

        let action: Action = null
        // Here should be Emitter for Action And Message modification

        return {
          message: message,
          action: action,
        };
      },
    },
  },
};
