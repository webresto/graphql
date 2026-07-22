import { JWTAuth } from "../../lib/jwt";
import graphqlHelper from "../../lib/graphqlHelper";
import checkDeviceId from "../../lib/helper/checkDeviceId";
import { Message, Action, Response } from "../../types/primitives";
import { Adapter } from "@webresto/core/adapters";
import AuthService from "@webresto/core/libs/AuthService";
import { NormalizedProfile } from "@webresto/core/adapters/auth/AuthProviderAdapter";

interface UserResponse extends Response {
  user: any;
}

/** Turn a resolved UserDevice into a UserResponse with an Authorization action carrying the JWT. */
async function buildAuthResponse(userDevice: any, context: any): Promise<UserResponse> {
  const authData = {
    userId: userDevice.user as string,
    deviceId: userDevice.id as string,
    sessionId: userDevice.sessionId as string,
  };
  const JWTtoken = await JWTAuth.sign(authData);
  const user = await User.findOne({ id: userDevice.user as string });
  context.connectionParams.authorization = JWTtoken;

  const message: Message = {
    deviceId: context.connectionParams.deviceId,
    title: context.i18n.__("Success"),
    type: "info",
    message: context.i18n.__("Authorization"),
  };
  const action: Action = {
    deviceId: context.connectionParams.deviceId,
    type: "Authorization",
    data: { token: JWTtoken },
  };
  return { user, message, action };
}

graphqlHelper.addType(`#graphql
  """A single auth-provider button for the login page. Never carries secrets."""
  type AuthProviderPublic {
    "slug, passed to startAuth"
    adapter: String!
    title: String!
    "oauth2 | oidc | telegram_bot | max_bot | telegram_widget | email_link | phone_otp"
    kind: String!
    iconUrl: String
    buttonColor: String
    buttonTextColor: String
    sortOrder: Int
  }

  type AuthStartPayload {
    "id of the AuthState"
    stateId: String!
    kind: String!
    "oauth2: frontend does window.location = redirectUrl"
    redirectUrl: String
    "telegram/max deep-link, widget params, QR, etc."
    clientPayload: Json
  }

  type AuthStatusPayload {
    "started | awaiting_phone | done | expired"
    status: String!
    "issued JWT once status = done"
    token: String
  }
`);

export default {
  Query: {
    authProviders: {
      def: `#graphql
      """Buttons for the login page, filtered by sales channel / country / locale."""
      authProviders(salesChannel: String, country: String): [AuthProviderPublic!]!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          const country = args.country
            ?? (context.connectionParams?.locale ? undefined : undefined);
          return await AuthProvider.getAvailable({
            salesChannel: args.salesChannel,
            country: country,
          });
        } catch (e) {
          sails.log.error(`GQL > [authProviders]`, e, args);
          throw e;
        }
      },
    },

    authStatus: {
      def: `#graphql
      """Poll the status of an in-flight login (telegram_bot / max_bot / QR / OAuth redirect)."""
      authStatus(stateId: String!): AuthStatusPayload!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          const state = await AuthState.findOne({ id: args.stateId });
          if (!state) return { status: "expired", token: null };
          if (state.status !== "done") {
            return { status: state.status, token: null };
          }
          // Exchange the one-time ticket for a fresh JWT bound to the resolved device.
          const userDevice = await UserDevice.findOne({ id: state.deviceId, user: state.resolvedUser });
          if (!userDevice || !userDevice.isLoggedIn) {
            return { status: "expired", token: null };
          }
          const token = await JWTAuth.sign({
            userId: state.resolvedUser,
            deviceId: userDevice.id as string,
            sessionId: userDevice.sessionId as string,
          });
          return { status: "done", token };
        } catch (e) {
          sails.log.error(`GQL > [authStatus]`, e, args);
          throw e;
        }
      },
    },
  },

  Mutation: {
    startAuth: {
      def: `#graphql
      """Begin login through a provider. Requires deviceId (like login does)."""
      startAuth(provider: String!, salesChannel: String, redirectBack: String): AuthStartPayload!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;

          const adapter = await Adapter.getAuthAdapter(args.provider);

          // Create the AuthState first so the adapter can weave the stateId into deep-links / redirect_uri.
          const state = await AuthState.create({
            provider: args.provider,
            deviceId,
            salesChannel: args.salesChannel,
            redirectBack: args.redirectBack,
            locale: context.connectionParams?.locale,
            status: "started",
          }).fetch();

          const startResult = await adapter.start({
            deviceId,
            stateId: state.id as string,
            salesChannel: args.salesChannel,
            locale: context.connectionParams?.locale,
            redirectBack: args.redirectBack,
          });

          // Persist any server-side secrets the adapter produced (nonce/codeVerifier/etc.).
          if (startResult.stateToPersist) {
            await AuthState.updateOne({ id: state.id }, {
              nonce: startResult.stateToPersist.nonce as string,
              codeVerifier: startResult.stateToPersist.codeVerifier as string,
            });
          }

          return {
            stateId: state.id,
            kind: startResult.kind,
            redirectUrl: startResult.redirectUrl ?? null,
            clientPayload: startResult.clientPayload ?? null,
          };
        } catch (e) {
          sails.log.error(`GQL > [startAuth]`, e, args);
          throw e;
        }
      },
    },

    completeAuth: {
      def: `#graphql
      """Finish a login for flows whose data arrives on the frontend
         (telegram_widget / email_link). OAuth2 finishes via the HTTP callback instead."""
      completeAuth(provider: String!, stateId: String!, data: Json!): UserResponse!`,
      fn: async function (parent: any, args: any, context: any): Promise<UserResponse> {
        try {
          checkDeviceId(context);
          const state = await AuthState.getActive(args.stateId);
          if (!state) throw `Auth state expired or not found`;
          if (state.provider !== args.provider) throw `Provider mismatch`;

          const adapter = await Adapter.getAuthAdapter(args.provider);
          const profile: NormalizedProfile = await adapter.complete({
            body: args.data,
            state: state as any,
          });

          const providerConfig = await AuthProvider.getBySlug(args.provider);
          const ctx = {
            deviceId: state.deviceId,
            userAgent: context.connectionParams["user-agent"],
            IP: "0.0.0.0",
          };

          if (AuthService.needsPhoneConfirmation(profile, providerConfig, ctx)) {
            await AuthState.updateOne({ id: state.id }, {
              status: "awaiting_phone",
              pendingProfile: profile as any,
            });
            return {
              user: null,
              message: {
                deviceId: context.connectionParams.deviceId,
                title: context.i18n.__("Phone confirmation required"),
                type: "info",
                message: context.i18n.__("Please confirm your phone number"),
              },
              action: { deviceId: context.connectionParams.deviceId, type: "ConfirmPhone", data: { stateId: state.id } },
            };
          }

          const outcome = await AuthService.resolveFromProfile(profile, ctx);
          if (outcome.status !== "authorized") throw `Unexpected resolve outcome`;

          await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id as string });
          return await buildAuthResponse(outcome.userDevice, context);
        } catch (e) {
          sails.log.error(`GQL > [completeAuth]`, e, args);
          throw e;
        }
      },
    },

    confirmAuthPhone: {
      def: `#graphql
      """Confirm a phone for a social login that is awaiting_phone (see auth.md §6.3)."""
      confirmAuthPhone(stateId: String!, phone: InputPhone!, otp: String!): UserResponse!`,
      fn: async function (parent: any, args: any, context: any): Promise<UserResponse> {
        try {
          checkDeviceId(context);
          const state = await AuthState.getActive(args.stateId);
          if (!state) throw `Auth state expired or not found`;
          if (state.status !== "awaiting_phone" || !state.pendingProfile) {
            throw `Auth state is not awaiting phone confirmation`;
          }

          const login = (args.phone.code + args.phone.number).replace(/\D/g, "");
          if (!(await OneTimePassword.check(login, args.otp))) {
            throw `OTP check failed`;
          }

          // Merge the confirmed phone into the pending profile and resolve.
          const profile: NormalizedProfile = {
            ...state.pendingProfile,
            phone: { code: args.phone.code, number: args.phone.number },
            phoneVerifiedByProvider: false,
          };

          const outcome = await AuthService.resolveFromProfile(profile, {
            deviceId: state.deviceId,
            userAgent: context.connectionParams["user-agent"],
            IP: "0.0.0.0",
            confirmedByOtp: true,
          });
          if (outcome.status !== "authorized") throw `Unexpected resolve outcome`;

          await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id as string });
          return await buildAuthResponse(outcome.userDevice, context);
        } catch (e) {
          sails.log.error(`GQL > [confirmAuthPhone]`, e, args);
          throw e;
        }
      },
    },

    linkAuthProvider: {
      def: `#graphql
      """Attach another provider to the already-logged-in user (account linking)."""
      linkAuthProvider(provider: String!, salesChannel: String, redirectBack: String): AuthStartPayload!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          const deviceId = auth.deviceId;
          const adapter = await Adapter.getAuthAdapter(args.provider);

          const state = await AuthState.create({
            provider: args.provider,
            deviceId,
            salesChannel: args.salesChannel,
            redirectBack: args.redirectBack,
            status: "started",
            customData: { linkToUser: auth.userId } as any,
          } as any).fetch();

          const startResult = await adapter.start({
            deviceId,
            stateId: state.id as string,
            salesChannel: args.salesChannel,
            redirectBack: args.redirectBack,
          });

          return {
            stateId: state.id,
            kind: startResult.kind,
            redirectUrl: startResult.redirectUrl ?? null,
            clientPayload: startResult.clientPayload ?? null,
          };
        } catch (e) {
          sails.log.error(`GQL > [linkAuthProvider]`, e, args);
          throw e;
        }
      },
    },

    unlinkAuthProvider: {
      def: `#graphql
      """Remove a linked provider from the current user."""
      unlinkAuthProvider(provider: String!): Response`,
      fn: async function (parent: any, args: any, context: any): Promise<Response> {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          await AuthIdentity.destroy({ provider: args.provider, user: auth.userId });
          return {
            message: {
              deviceId: null,
              title: context.i18n.__("Success"),
              type: "info",
              message: context.i18n.__("Provider unlinked"),
            },
            action: null,
          };
        } catch (e) {
          sails.log.error(`GQL > [unlinkAuthProvider]`, e, args);
          throw e;
        }
      },
    },
  },
};
