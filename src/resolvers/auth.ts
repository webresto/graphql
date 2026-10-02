import { JWTAuth } from "../../lib/jwt";
import graphqlHelper from "../../lib/graphqlHelper";
import checkDeviceId from "../../lib/helper/checkDeviceId";
import registrationRequired from "../../lib/helper/registrationRequired";
import adoptGuestCarts from "../../lib/helper/adoptGuestCarts";
import { Message, Action, Response } from "../../types/primitives";
import { Captcha } from "@webresto/core/adapters";
import AuthService from "@webresto/core/libs/AuthService";

/**
 * One cycle for everything that needs proof (design2 §3):
 *
 *   authStart(purpose, method?, login?) → id
 *     poll authStatus(id) → view { status, step }      ← the screen IS this response (И5)
 *     authSubmit(id, step.id, input)                   ← a phone or a code; the server knows which
 *   done → ticket → authExchange, or hand it to a guarded mutation
 *
 * Six operations, and a new sign-in method (passkeys, magic links, Mobile ID) is a new step type
 * inside this cycle rather than a new API. The client implements the loop once.
 *
 * All of the policy lives in core's AuthService. This file is transport: verify the caller owns
 * the device, translate, and project — never decide.
 */

/** The wire projection of an attempt. Built field by field: `callerNumber`, `secret`,
 *  `pendingProfile` and `nonce` live on the same record and must never appear here (§10.1). */
function toAttemptView(view: any) {
  return {
    id: view.id,
    status: view.status,
    step: view.step
      ? {
          id: view.step.id,
          type: view.step.type,
          codeLength: view.step.codeLength ?? null,
          hint: view.step.hint ?? null,
          dialNumber: view.step.dialNumber ?? null,
          redirectUrl: view.step.redirectUrl ?? null,
          clientPayload: view.step.clientPayload ?? null,
          expiresInSeconds: view.step.expiresInSeconds ?? null,
          captchaRequired: Boolean(view.step.captchaRequired),
        }
      : null,
    ticket: view.ticket ?? null,
    phoneHint: view.phoneHint ?? null,
    method: view.method ?? null,
    availableMethods: view.availableMethods ?? [],
    nextAttemptAfterSeconds: view.nextAttemptAfterSeconds ?? 0,
    attemptsLeft: view.attemptsLeft ?? null,
    failReason: view.failReason ?? null,
  };
}

/** Public projection of one registry row. `config` holds client secrets and bot tokens; picking
 *  fields explicitly is what guarantees it cannot leak by someone passing a whole record. */
function toMethodView(row: any) {
  return {
    method: `${row.adapter}:${row.offer}`,
    adapter: row.adapter,
    offer: row.offer,
    kind: row.kind,
    flow: row.flow ?? null,
    mode: row.mode ?? null,
    canVerifyPhone: Boolean(row.canVerifyPhone),
    title: row.titleKey || row.adapter,
    hint: row.hintKey ?? null,
    iconUrl: row.iconUrl ?? null,
    buttonColor: row.buttonColor ?? null,
    buttonTextColor: row.buttonTextColor ?? null,
    sortOrder: row.sortOrder ?? 0,
    cost: row.cost ?? 0,
  };
}

/**
 * The one captcha gate of the cycle. Both ways a client can name a target — `authStart(login:)`
 * and answering an `enter_phone` step — come through here with the same label, so a solved puzzle
 * is spendable against exactly the number it was solved for, and the per-label difficulty ramp the
 * adapter keeps counts the two paths as one (review1 §1.3).
 */
async function requireCaptcha(login: string, captcha: any): Promise<void> {
  const captchaAdapter = await Captcha.getAdapter();
  if ((await captchaAdapter.check(captcha, `authStart:${AuthService.normalizeLogin(login)}`)) === false) {
    throw `bad captcha`;
  }
}

graphqlHelper.addType(`#graphql
  """What the client has to draw right now. The client never decides this itself: for a bot
     dialog it cannot know at click time whether the user will reach the messenger, and two
     providers of the same method may want a different number of digits (design2 И5)."""
  type AuthStep {
    "version of the step — send it back in authSubmit; a stale one gets 'refresh', not 'wrong code'"
    id: String!
    "provider_dialog | redirect | enter_phone | enter_code | dial_number | await_signal"
    type: String!
    "exact number of cells to draw — NOT 6 by default"
    codeLength: Int
    "localized by the server, whole: 'the last 4 digits of the incoming number'"
    hint: String
    "dial_number: the number to call. Show it only once the step says so."
    dialNumber: String
    "redirect: window.location = this"
    redirectUrl: String
    "provider_dialog: deep-link, QR, widget params"
    clientPayload: Json
    expiresInSeconds: Int
    "solve a captcha for label 'authStart:<what you are about to send>' and pass it to authSubmit"
    captchaRequired: Boolean!
  }

  """State of one attempt. Poll it; every answer redraws the screen."""
  type AuthAttemptView {
    id: String!
    "started | awaiting_user | done | failed | expired | superseded"
    status: String!
    "null once terminal — there is nothing left to draw"
    step: AuthStep
    "one-time result, released only to the device that owns the attempt"
    ticket: String
    "masked target, e.g. +7 ••• ••• 42-88"
    phoneHint: String
    "adapter:offer currently in charge"
    method: String
    "other methods the user may switch to — 'another way' is a required control, not decoration"
    availableMethods: [String!]!
    "seconds before a resend is allowed"
    nextAttemptAfterSeconds: Int!
    "wrong guesses left on the current code"
    attemptsLeft: Int
    """wrong_code | code_locked | expired | stale_step | phone_mismatch | send_failed | rate_limited |
       switch_limit | country_not_allowed | ... Which ceiling produced a rate_limited is deliberately
       not said: the pause, the login's own hourly/daily cap and the installation-wide hourly cap all
       read the same on the wire. country_not_allowed is the one refusal spelled out, because the
       operator does not serve that country and only the user can act on it (send-caps.md §1.2)."""
    failReason: String
  }

  """One way to sign in or to prove a phone. Never carries secrets."""
  type AuthMethodView {
    "pass this to authStart / authSwitch"
    method: String!
    adapter: String!
    offer: String!
    "identity | phone_proof"
    kind: String!
    "identity: oauth2 | oidc | bot_dialog | signed_widget | email_link"
    flow: String
    "phone_proof: enter_code | dial_number | await_signal"
    mode: String
    "the provider proves the number itself — a property of the protocol, not an operator checkbox"
    canVerifyPhone: Boolean!
    title: String!
    hint: String
    iconUrl: String
    buttonColor: String
    buttonTextColor: String
    sortOrder: Float
    cost: Float
  }

  """Both lists in one round trip: identity buttons do not depend on a number and can be drawn
     with the page, verification methods do (country, carrier, supports()) and are asked for once
     the user presses Continue."""
  type AuthMethodsView {
    identity: [AuthMethodView!]!
    proof: [AuthMethodView!]!
    "false when the operator left social login only — then do not draw a phone field at all"
    phoneLoginAvailable: Boolean!
  }

  """One sign-in method attached to the current account."""
  type IdentityView {
    id: String!
    "phone | telegram | max | vk"
    provider: String!
    title: String!
    "masked: '+7 ••• 42-88', '@va•••ya'"
    hint: String!
    label: String
    isPrimaryPhone: Boolean!
    "null = claimed but never proven (a guest order's number) — it grants no access"
    proofAt: Float
    proofMethod: String
    linkedAt: Float
    lastUsedAt: Float
    canUnlink: Boolean!
    "last_login_method | phone_required | protect_window | phone_change_disabled"
    unlinkBlockedReason: String
  }

  type LinkableSlot {
    provider: String!
    title: String!
    "-1 = unlimited"
    freeSlots: Int!
  }

  """What may be done to the identity set. Computed by the server: a client deriving it from the
     list length disagrees with us at the edges, and disagrees silently (extend §8)."""
  type AccountPolicy {
    canAddPhone: Boolean!
    canChangePhone: Boolean!
    "0 = unlimited"
    maxPhones: Int!
    linkable: [LinkableSlot!]!
    "off | notify | confirm"
    noticePolicy: String!
    "where the security notice will go, masked"
    noticeTargetHint: String
  }

  type AccountView {
    identities: [IdentityView!]!
    policy: AccountPolicy!
  }
`);

/** Every sign-in path ends here: the same UserDevice + sessionId + JWT the whole system uses. */
async function issueToken(userId: string, deviceId: string, context: any): Promise<{ token: string; user: any }> {
  const userDevice = await UserDevice.findOne({ id: deviceId, user: userId });
  if (!userDevice || !userDevice.isLoggedIn) throw `Session is not available`;

  const token = await JWTAuth.sign({
    userId,
    deviceId: userDevice.id as string,
    sessionId: userDevice.sessionId as string,
  });
  context.connectionParams.authorization = token;

  // The device has just been proven to belong to this account, so whatever it was building
  // anonymously is this account's basket now (require-auth-for-cart.md §5).
  await adoptGuestCarts(userId, userDevice.id as string);

  return { token, user: await User.findOne({ id: userId }) };
}

export default {
  Query: {
    authMethods: {
      def: `#graphql
      """Ways in, for a purpose. Pass 'login' to also get the verification methods that can serve
         that specific number — country and carrier decide which of them actually work."""
      authMethods(purpose: String!, login: String, salesChannel: String, country: String): AuthMethodsView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          const ctx = { salesChannel: args.salesChannel, country: args.country, deviceId: context.connectionParams?.deviceId };
          const identity = await AuthService.identityMethodsFor(args.purpose, ctx);
          const proof = await AuthService.proofMethodsFor(args.login ? AuthService.normalizeLogin(args.login) : undefined, args.purpose, ctx);
          return {
            identity: identity.map(toMethodView),
            proof: proof.map(toMethodView),
            // Nothing disabled reaches the client at all, so an empty list is the honest answer
            // to "can I sign in by phone" — not a form that pretends to send something.
            phoneLoginAvailable: proof.length > 0,
          };
        } catch (e) {
          sails.log.error(`GQL > [authMethods]`, e, args);
          throw e;
        }
      },
    },

    authStatus: {
      def: `#graphql
      """Poll an in-flight attempt. Side-effect free by contract (design2 И5): caches, prefetch
         and retries all hit it, so it must never be the thing that sends a code — authResend is."""
      authStatus(id: String!): AuthAttemptView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;
          const attempt = await AuthService.status(args.id, deviceId);
          return toAttemptView(await AuthService.view(attempt, deviceId));
        } catch (e) {
          sails.log.error(`GQL > [authStatus]`, e, args);
          throw e;
        }
      },
    },

    myAccount: {
      def: `#graphql
      """The identity set of the current user, plus what may be done to it. Requires auth."""
      myAccount(salesChannel: String, country: String): AccountView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          return await AuthService.accountView(auth.userId, auth.deviceId, { salesChannel: args.salesChannel, country: args.country });
        } catch (e) {
          sails.log.error(`GQL > [myAccount]`, e, args);
          throw e;
        }
      },
    },
  },

  Mutation: {
    authStart: {
      def: `#graphql
      """Begin an attempt. purpose: login | link | verify:phone | verify:phone_change |
         verify:delete_account | verify:link_identity | verify:unlink_identity.
         Captcha label: 'authStart:<login>'.
         Errors with rate_limited when the device already holds AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE
         unfinished attempts — there is no attempt yet to carry a failReason. Restarting the same
         purpose supersedes its own attempt and is never refused (send-caps.md §1.3)."""
      authStart(purpose: String!, method: String, login: String, salesChannel: String, country: String, redirectBack: String, captcha: Captcha): AuthAttemptView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;

          if (args.login) await requireCaptcha(args.login, args.captcha);

          // link and verify:* act on an account that is already signed in; login does not.
          let user: string | undefined;
          if (args.purpose !== "login") {
            const auth = await JWTAuth.verify(context.connectionParams.authorization);
            user = auth.userId;
          }

          const attempt = await AuthService.start({
            purpose: args.purpose,
            method: args.method,
            login: args.login,
            user,
            deviceId,
            userAgent: context.connectionParams["user-agent"],
            salesChannel: args.salesChannel,
            country: args.country,
            locale: context.connectionParams?.locale,
            redirectBack: args.redirectBack,
          });
          return toAttemptView(await AuthService.view(attempt, deviceId));
        } catch (e) {
          sails.log.error(`GQL > [authStart]`, e, args);
          throw e;
        }
      },
    },

    authSubmit: {
      def: `#graphql
      """Send what the current step asked for — a phone or a code. stepId pins the answer to the
         question that was actually asked, so a form left open in a second tab fails loudly.
         Pass 'captcha' whenever the step says captchaRequired — label 'authStart:<input>'."""
      authSubmit(id: String!, stepId: String!, input: String!, captcha: Captcha): AuthAttemptView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;

          // The step itself carries the requirement — core decides, transport enforces. Gated on
          // the live step only: a second tab holding a stale stepId, or an attempt that has since
          // died, must not burn a solved captcha on an answer AuthService is going to refuse.
          const pending = await AuthService.status(args.id, deviceId);
          if (pending?.step?.captchaRequired && pending.step.id === args.stepId && pending.status === "awaiting_user") {
            await requireCaptcha(args.input, args.captcha);
          }

          const attempt = await AuthService.submit(args.id, args.stepId, args.input, {
            deviceId,
            userAgent: context.connectionParams["user-agent"],
            IP: context.connectionParams["IP"] ?? "",
          });
          return toAttemptView(await AuthService.view(attempt, deviceId));
        } catch (e) {
          sails.log.error(`GQL > [authSubmit]`, e, args);
          throw e;
        }
      },
    },

    authSwitch: {
      def: `#graphql
      """Change method by the user's own hand — 'another way'. Bounded by AUTH_MAX_SWITCHES and
         by the target's own send ledger, or SMS → flash-call → SMS walks straight around the
         antiflood (design2 §7.3). Refusals come back as failReason: switch_limit | rate_limited."""
      authSwitch(id: String!, method: String!): AuthAttemptView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;
          const attempt = await AuthService.switchMethod(args.id, deviceId, args.method);
          return toAttemptView(await AuthService.view(attempt, deviceId));
        } catch (e) {
          sails.log.error(`GQL > [authSwitch]`, e, args);
          throw e;
        }
      },
    },

    authResend: {
      def: `#graphql
      """Send the code (again). Safe to call on every mount of the code form: the first call is
         what actually delivers it on the social path, and the rest are no-ops decided by a
         compare-and-set, not by a read-then-send (design2 И8).

         On a provider-owned method (flash-call, dial-in) "again" is literally another call, and
         another call means another secret — so the answer carries a NEW \`step.id\` and the form
         must be redrawn from it (design2 И7). Anything the user had typed into the old step is
         dead: a submit carrying the previous id is answered with \`stale_step\`."""
      authResend(id: String!): AuthAttemptView!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;
          const attempt = await AuthService.resend(args.id, deviceId);
          return toAttemptView(await AuthService.view(attempt, deviceId));
        } catch (e) {
          sails.log.error(`GQL > [authResend]`, e, args);
          throw e;
        }
      },
    },

    authExchange: {
      def: `#graphql
      """Trade a finished login attempt's ticket for a JWT. Separate from authStatus so polling
         stays free of side effects and the ticket is spent exactly once.

         This is the ONLY consumer of a login ticket. If the account still owes a profile, that
         comes back as registrationRequired and is filled in by the 'registration' mutation
         under the JWT issued here — not by a second redemption of the same ticket (review1 §3)."""
      authExchange(ticket: String!): UserResponse!`,
      fn: async function (parent: any, args: any, context: any) {
        try {
          checkDeviceId(context);
          const deviceId = context.connectionParams.deviceId;
          const consumed = await AuthService.consumeTicket(args.ticket, "login", deviceId);
          if (!consumed?.userId) throw `Ticket is not valid`;

          const { token, user } = await issueToken(consumed.userId, deviceId, context);
          return {
            user,
            registrationRequired: await registrationRequired(user),
            message: {
              deviceId,
              title: context.i18n.__("Success"),
              type: "info",
              message: context.i18n.__("Authorization"),
            },
            action: { deviceId, type: "Authorization", data: { token } },
          };
        } catch (e) {
          sails.log.error(`GQL > [authExchange]`, e, args);
          throw e;
        }
      },
    },

    authLinkConfirm: {
      def: `#graphql
      """Only for AUTH_LINK_NOTICE_POLICY=confirm. The link attempt finished with
         failReason=confirm_required; pair its ticket with one from a
         verify:link_identity attempt on the account's own number to let it land."""
      authLinkConfirm(linkTicket: String!, confirmTicket: String!): Response`,
      fn: async function (parent: any, args: any, context: any): Promise<Response> {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          await AuthService.confirmLink(args.linkTicket, args.confirmTicket, auth.deviceId);
          return {
            message: { deviceId: null, title: context.i18n.__("Success"), type: "info", message: context.i18n.__("Sign-in method added") },
            action: null,
          };
        } catch (e) {
          sails.log.error(`GQL > [authLinkConfirm]`, e, args);
          throw e;
        }
      },
    },

    authUnlink: {
      def: `#graphql
      """Detach a sign-in method. Needs a ticket from a fresh verify:unlink_identity attempt: a
         live JWT is not enough, because whoever took over the session has one too (extend §7.1)."""
      authUnlink(identityId: String!, ticket: String!): Response`,
      fn: async function (parent: any, args: any, context: any): Promise<Response> {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          await AuthService.unlink(auth.userId, args.identityId, args.ticket, auth.deviceId);
          return {
            message: { deviceId: null, title: context.i18n.__("Success"), type: "info", message: context.i18n.__("Sign-in method removed") },
            action: null,
          };
        } catch (e) {
          sails.log.error(`GQL > [authUnlink]`, e, args);
          throw e;
        }
      },
    },

    authSetPrimaryPhone: {
      def: `#graphql
      """Make another proven phone-identity the primary one — the number external bonus/RMS
         systems see and the one security notices go to. Needs a verify:phone_change ticket."""
      authSetPrimaryPhone(identityId: String!, ticket: String!): Response`,
      fn: async function (parent: any, args: any, context: any): Promise<Response> {
        try {
          const auth = await JWTAuth.verify(context.connectionParams.authorization);
          await AuthService.setPrimaryPhone(auth.userId, args.identityId, args.ticket, auth.deviceId);
          return {
            message: { deviceId: null, title: context.i18n.__("Success"), type: "info", message: context.i18n.__("Primary phone changed") },
            action: null,
          };
        } catch (e) {
          sails.log.error(`GQL > [authSetPrimaryPhone]`, e, args);
          throw e;
        }
      },
    },
  },
};
