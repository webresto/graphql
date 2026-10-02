// const userAuth = sails.config.restographql.authService;
import { JWTAuth } from "../../lib/jwt";
import { Message, Action, Response } from "../../types/primitives";

import graphqlHelper from "../../lib/graphqlHelper";
import checkDeviceId from "../../lib/helper/checkDeviceId";
import registrationRequired from "../../lib/helper/registrationRequired";

// define UserResponse
interface UserResponse extends Response {
  user: User | undefined;
  registrationRequired: boolean;
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
    "the account is signed in but still has to pass the registration mutation before it may be served"
    registrationRequired: Boolean!
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
  firstName: string;
  lastName: string;
  customFields: {
    [key: string]: string | boolean | number;
  };
};

export default {
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
      def: `#graphql
      """Fill in the profile of the account you are already signed in as.

         This does NOT sign anyone in and does not create an account out of nothing: finish the
         auth cycle first (authStart → authSubmit → authExchange) and call this with the JWT it
         gave you. Registration and login stopped being different operations the moment the
         account key became the identity set rather than a login string — what is left here is
         the name.

         Authorization, not a ticket: the login ticket is spent by authExchange and a ticket is
         one-time, so taking one here meant a new account got either its JWT or its name, never
         both (review1 §3). authExchange.registrationRequired says whether to call this."""
      registration(
        firstName: String,
        lastName: String,

        "Object with every required field from UserRestrictions.customFields"
        customFields: Json
      ): UserResponse`,

      fn: async (
        parent: any,
        payload: RegistrationPayload,
        context: any,
        info: any
      ): Promise<UserResponse> => {
        checkDeviceId(context);

        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);

          if ((await Settings.get("FIRSTNAME_REQUIRED")) && !payload.firstName) {
            throw `firstName is required`;
          }

          const user = await User.updateOne({ id: auth.userId }, {
            ...(payload.firstName ? { firstName: payload.firstName } : {}),
            ...(payload.lastName ? { lastName: payload.lastName } : {}),
            ...(payload.customFields ? { customFields: payload.customFields } : {}),
          });

          let message: Message = {
            deviceId: context.connectionParams.deviceId,
            title: context.i18n.__("Success"),
            type: "info",
            message: context.i18n.__("New user created"),
          };

          return {
            user: user,
            registrationRequired: await registrationRequired(user),
            message: message,
            action: null,
          };
        } catch (error) {
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
      fn: async (
        parent: any,
        payload: { deviceId: any },
        context: { connectionParams: { authorization: string }, i18n: any }
      ): Promise<Response> => {
        try {
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
              lastIP: context.connectionParams["IP"] ?? "",
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
        } catch (error) {
          sails.log.error(`GQL > [logout]`, error, payload);
          throw error;
        }
      },
    },

    logoutFromAllDevices: {
      def: `logoutFromAllDevices: Response`,
      fn: async (
        parent: any,
        payload: any,
        context: any
      ): Promise<Response> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          if (
            !(await UserDevice.checkSession(auth.sessionId, auth.userId, {
              lastIP: context.connectionParams["IP"] ?? "",
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
        } catch (error) {
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
      fn: async (
        parent: any,
        payload: { dishId: string },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          await User.handleFavoriteDish(auth.userId, payload.dishId)
          return true
        } catch (error) {
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
      fn: async (
        parent: any,
        payload: { user: InputUser },
        context: any
      ): Promise<UserResponse> => {
        try {
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
            registrationRequired: await registrationRequired(user),
            message: message,
            action: null,
          };
        } catch (error) {
          sails.log.error(`GQL > [userUpdate]`, error, payload);
          throw error;
        }
      },
    },
    userDelete: {
      def: `#graphql
      """User delete method """
      userDelete(

        "ticket from a finished authStart(purpose: \\"verify:delete_account\\") attempt"
        ticket: String!,
      ): Response`,
      fn: async (
        parent: any,
        payload: any,
        context: any,
        info: any
      ): Promise<Response> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          await User.delete(auth.userId, payload.ticket, false);

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
        } catch (error) {
          sails.log.error(`GQL > [userDelete]`, error, payload);
          throw error;
        }
      },
    },
  },
};
