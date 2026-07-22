"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../lib/jwt");
const graphqlHelper_1 = __importDefault(require("../../lib/graphqlHelper"));
const checkDeviceId_1 = __importDefault(require("../../lib/helper/checkDeviceId"));
const adapters_1 = require("@webresto/core/adapters");
const AuthService_1 = __importDefault(require("@webresto/core/libs/AuthService"));
/** Turn a resolved UserDevice into a UserResponse with an Authorization action carrying the JWT. */
async function buildAuthResponse(userDevice, context) {
    const authData = {
        userId: userDevice.user,
        deviceId: userDevice.id,
        sessionId: userDevice.sessionId,
    };
    const JWTtoken = await jwt_1.JWTAuth.sign(authData);
    const user = await User.findOne({ id: userDevice.user });
    context.connectionParams.authorization = JWTtoken;
    const message = {
        deviceId: context.connectionParams.deviceId,
        title: context.i18n.__("Success"),
        type: "info",
        message: context.i18n.__("Authorization"),
    };
    const action = {
        deviceId: context.connectionParams.deviceId,
        type: "Authorization",
        data: { token: JWTtoken },
    };
    return { user, message, action };
}
graphqlHelper_1.default.addType(`#graphql
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
exports.default = {
    Query: {
        authProviders: {
            def: `#graphql
      """Buttons for the login page, filtered by sales channel / country / locale."""
      authProviders(salesChannel: String, country: String): [AuthProviderPublic!]!`,
            fn: async function (parent, args, context) {
                try {
                    const country = args.country
                        ?? (context.connectionParams?.locale ? undefined : undefined);
                    return await AuthProvider.getAvailable({
                        salesChannel: args.salesChannel,
                        country: country,
                    });
                }
                catch (e) {
                    sails.log.error(`GQL > [authProviders]`, e, args);
                    throw e;
                }
            },
        },
        authStatus: {
            def: `#graphql
      """Poll the status of an in-flight login (telegram_bot / max_bot / QR / OAuth redirect)."""
      authStatus(stateId: String!): AuthStatusPayload!`,
            fn: async function (parent, args, context) {
                try {
                    const state = await AuthState.findOne({ id: args.stateId });
                    if (!state)
                        return { status: "expired", token: null };
                    if (state.status !== "done") {
                        return { status: state.status, token: null };
                    }
                    // Exchange the one-time ticket for a fresh JWT bound to the resolved device.
                    const userDevice = await UserDevice.findOne({ id: state.deviceId, user: state.resolvedUser });
                    if (!userDevice || !userDevice.isLoggedIn) {
                        return { status: "expired", token: null };
                    }
                    const token = await jwt_1.JWTAuth.sign({
                        userId: state.resolvedUser,
                        deviceId: userDevice.id,
                        sessionId: userDevice.sessionId,
                    });
                    return { status: "done", token };
                }
                catch (e) {
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
            fn: async function (parent, args, context) {
                try {
                    (0, checkDeviceId_1.default)(context);
                    const deviceId = context.connectionParams.deviceId;
                    const adapter = await adapters_1.Adapter.getAuthAdapter(args.provider);
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
                        stateId: state.id,
                        salesChannel: args.salesChannel,
                        locale: context.connectionParams?.locale,
                        redirectBack: args.redirectBack,
                    });
                    // Persist any server-side secrets the adapter produced (nonce/codeVerifier/etc.).
                    if (startResult.stateToPersist) {
                        await AuthState.updateOne({ id: state.id }, {
                            nonce: startResult.stateToPersist.nonce,
                            codeVerifier: startResult.stateToPersist.codeVerifier,
                        });
                    }
                    return {
                        stateId: state.id,
                        kind: startResult.kind,
                        redirectUrl: startResult.redirectUrl ?? null,
                        clientPayload: startResult.clientPayload ?? null,
                    };
                }
                catch (e) {
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
            fn: async function (parent, args, context) {
                try {
                    (0, checkDeviceId_1.default)(context);
                    const state = await AuthState.getActive(args.stateId);
                    if (!state)
                        throw `Auth state expired or not found`;
                    if (state.provider !== args.provider)
                        throw `Provider mismatch`;
                    const adapter = await adapters_1.Adapter.getAuthAdapter(args.provider);
                    const profile = await adapter.complete({
                        body: args.data,
                        state: state,
                    });
                    const providerConfig = await AuthProvider.getBySlug(args.provider);
                    const ctx = {
                        deviceId: state.deviceId,
                        userAgent: context.connectionParams["user-agent"],
                        IP: "0.0.0.0",
                    };
                    if (AuthService_1.default.needsPhoneConfirmation(profile, providerConfig, ctx)) {
                        await AuthState.updateOne({ id: state.id }, {
                            status: "awaiting_phone",
                            pendingProfile: profile,
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
                    const outcome = await AuthService_1.default.resolveFromProfile(profile, ctx);
                    if (outcome.status !== "authorized")
                        throw `Unexpected resolve outcome`;
                    await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id });
                    return await buildAuthResponse(outcome.userDevice, context);
                }
                catch (e) {
                    sails.log.error(`GQL > [completeAuth]`, e, args);
                    throw e;
                }
            },
        },
        confirmAuthPhone: {
            def: `#graphql
      """Confirm a phone for a social login that is awaiting_phone (see auth.md §6.3)."""
      confirmAuthPhone(stateId: String!, phone: InputPhone!, otp: String!): UserResponse!`,
            fn: async function (parent, args, context) {
                try {
                    (0, checkDeviceId_1.default)(context);
                    const state = await AuthState.getActive(args.stateId);
                    if (!state)
                        throw `Auth state expired or not found`;
                    if (state.status !== "awaiting_phone" || !state.pendingProfile) {
                        throw `Auth state is not awaiting phone confirmation`;
                    }
                    const login = (args.phone.code + args.phone.number).replace(/\D/g, "");
                    if (!(await OneTimePassword.check(login, args.otp))) {
                        throw `OTP check failed`;
                    }
                    // Merge the confirmed phone into the pending profile and resolve.
                    const profile = {
                        ...state.pendingProfile,
                        phone: { code: args.phone.code, number: args.phone.number },
                        phoneVerifiedByProvider: false,
                    };
                    const outcome = await AuthService_1.default.resolveFromProfile(profile, {
                        deviceId: state.deviceId,
                        userAgent: context.connectionParams["user-agent"],
                        IP: "0.0.0.0",
                        confirmedByOtp: true,
                    });
                    if (outcome.status !== "authorized")
                        throw `Unexpected resolve outcome`;
                    await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id });
                    return await buildAuthResponse(outcome.userDevice, context);
                }
                catch (e) {
                    sails.log.error(`GQL > [confirmAuthPhone]`, e, args);
                    throw e;
                }
            },
        },
        linkAuthProvider: {
            def: `#graphql
      """Attach another provider to the already-logged-in user (account linking)."""
      linkAuthProvider(provider: String!, salesChannel: String, redirectBack: String): AuthStartPayload!`,
            fn: async function (parent, args, context) {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    const deviceId = auth.deviceId;
                    const adapter = await adapters_1.Adapter.getAuthAdapter(args.provider);
                    const state = await AuthState.create({
                        provider: args.provider,
                        deviceId,
                        salesChannel: args.salesChannel,
                        redirectBack: args.redirectBack,
                        status: "started",
                        customData: { linkToUser: auth.userId },
                    }).fetch();
                    const startResult = await adapter.start({
                        deviceId,
                        stateId: state.id,
                        salesChannel: args.salesChannel,
                        redirectBack: args.redirectBack,
                    });
                    return {
                        stateId: state.id,
                        kind: startResult.kind,
                        redirectUrl: startResult.redirectUrl ?? null,
                        clientPayload: startResult.clientPayload ?? null,
                    };
                }
                catch (e) {
                    sails.log.error(`GQL > [linkAuthProvider]`, e, args);
                    throw e;
                }
            },
        },
        unlinkAuthProvider: {
            def: `#graphql
      """Remove a linked provider from the current user."""
      unlinkAuthProvider(provider: String!): Response`,
            fn: async function (parent, args, context) {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
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
                }
                catch (e) {
                    sails.log.error(`GQL > [unlinkAuthProvider]`, e, args);
                    throw e;
                }
            },
        },
    },
};
