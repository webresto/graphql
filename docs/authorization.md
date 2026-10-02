---
title: "Login and authorization process for the webresto server"
linkTitle: "Authorization & login"
description: >
    Webresto server  GraphQL API login process
---

## Lyrics

Every way into an account — a code by SMS, a flash-call, a messenger, linking a second method
from the profile page, confirming an account deletion — is **one attempt object and one loop**.
The client implements the loop once; a new sign-in method is a new *step type* inside it, never a
new API.

```
authStart(purpose, method?, login?) → { id, step }
  ↓ poll authStatus(id) → { status, step }     ← the screen IS this response
  ↓ authSubmit(id, step.id, input)             ← the phone number, or the code
done → ticket → authExchange(ticket) → JWT
                or the ticket is passed to the mutation it guards
```

Six operations: `authMethods`, `authStart`, `authStatus`, `authSubmit`, `authSwitch`,
`authResend`. The client never decides the next step on its own — at the moment of the click it
cannot know whether the user will come back from the messenger, and two providers of the same
method disagree on code length. The only source of truth is `step` from the last response.

The full reference — steps, outcomes, purposes, tickets, the profile page, and what each field
means — lives in the core module: **`@webresto/core/docs/Authorization.md`**.

> ⚠️ `X-Device-Id` you should pass  [deviceId](./device-id.md)

> ⚠️ read more about [mocks](./mocks.md)

> ⚠️ captcha is requested by the server through `step.captchaRequired` — solve it for the label
> `authStart:%input%` and pass it to the call that carries the input, see [captcha](./captcha.md)

## User restrictions

To get user settings use the user section in restrictions

```gql
{restrictions{
    user {
        loginField # deprecated, always 'phone' — `authMethods` is the real answer
        passwordPolicy # deprecated, always 'disabled' — there is no password in auth v2
        loginOTPRequired # always true: every sign-in goes through a proven attempt
        allowedPhoneCountries # List of all countries allowed to login by phone
        linkToProcessingPersonalData # Link to doc
        linkToUserAgreement # Link to doc
        customFields # Zodiac sign, Human desing type, Best Friend, referal link
    }
}}

```

There is no password in auth v2: sign-in is proven through an `AuthMethod`, and `passwordPolicy`
stays in the schema only so existing clients keep parsing — it always answers `'disabled'`.

## Cart only for signed-in users

`REQUIRE_AUTH_FOR_CART` — a boolean setting, off by default, switchable at runtime from the
settings manager. On: a guest can neither open a cart nor put a dish in one. Off or not set: the
guest cart keyed by `deviceId`, as always.

```gql
{restrictions{
    requireAuthForCart # Boolean, never null — read it before the first "add to cart"
}}
```

Show the login screen *before* the first dish. The refusal cannot be recognised by its error:
`formatError` strips `extensions`, so there is no error code, and the message text is not a
contract.

The flag guards what the **customer puts in** a cart, not the existence of the cart: creating the
row is the storefront asking for an `orderId`, and the server fills it itself
(`ORDER_INIT_PRODUCT_ID`). Behind the flag, a request without a JWT (an expired one counts as
none) gets:

- `order` without `orderId` — a cart, exactly as with the flag off, init product included;
- `orderAddDish` / `orderReplaceDish` / `orderRemoveDish` / `orderSetDishAmount` with an unknown
  `orderId` — the cart is created, the customer's action on it is refused;
- `orderAddDish` into an anonymous cart that already exists — an error from core, the cart is left
  as it was;
- checkout of an anonymous cart — an error from core, `{ code: 20 }`.

The barrier lives in core (`Order.addDish`, `Order.doCart`), not only in this API, so every
integration sees it. Items the server places itself (promotions, `ORDER_INIT_PRODUCT_ID`) are
exempt. Checkout is guarded by the same flag: `Order.check` on an anonymous cart with no JWT
answers `{ code: 20, error: "authorization required" }` — otherwise a cart assembled before the
flag was switched on, or on another device, still reached an order with no account behind it.

Issuing the JWT (`authExchange`) hands the anonymous carts of **this `deviceId`** (`NEW`/`CART`,
unpaid) to the account, so the `orderId` the client held before signing in keeps working — with
the flag off as well. Only the current device, only while that device is signed in as the
account, and a cart that already has an owner is never re-pointed. One more limit: `deviceId`
comes from the client and a device follows whoever last signed in with it, so only carts with
nothing personal in them are taken — an empty `customer`, or a `customer.phone` this account has
already proven. A cart left behind (it was built on another device, or it carries somebody
else's checkout data) stays anonymous: request `order` without `orderId` for a fresh one.

---

## 🛡 Authentication

Get the JWT from the `action` field of the `authExchange` response, and pass it without any marks
in the `Authorization` header:
```
header: {
    Authorization: "ciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZX",
}
```

---

## The loop

```gql
# 1. what may be offered here at all — identity buttons and phone-proof methods in one round trip
query { authMethods(purpose: "login") { identity { method title kind flow } proof { method title mode } phoneLoginAvailable } }

# 2. open an attempt — `login` may be omitted, the server will ask for it with an enter_phone step
mutation { authStart(purpose: "login", login: "+13450000123") { id status step { id type codeLength captchaRequired } } }

# 3. the screen is a function of this response; poll it, it has no side effects
query { authStatus(id: "…") { status step { id type expiresInSeconds } nextAttemptAfterSeconds attemptsLeft failReason } }

# 4. answer the step the server is showing — `stepId` is what makes a stale screen fail loudly
mutation { authSubmit(id: "…", stepId: "…", input: "123456") { status ticket } }

# 5. spend the one-time ticket for a session
mutation { authExchange(ticket: "…") { user { id name } action { type data } } }
```

`authSwitch(id, method)` re-aims a live attempt at another method ("the call never came, send an
SMS"); `authResend(id)` repeats the current one. Both are paced by the same per-target budget, so
neither is a way around the pause.

A ticket is one-time and bound to its purpose: `userDelete`, `authUnlink` and
`authSetPrimaryPhone` each take the ticket of the purpose they require, and a code minted for
signing in cannot delete an account.

`authExchange` is the only consumer of a `login` ticket. When the operator asks for a name, it
answers `registrationRequired: true`, and the name is filled in by `registration` under the JWT it
just issued — a second mutation cannot redeem the same ticket:

```graphql
mutation { authExchange(ticket: "…") { registrationRequired action { data } } }
mutation { registration(firstName: "Иван") { user { id firstName } registrationRequired } }
```

---

## What is gone

Removed without deprecated wrappers — there were no consumers in this repository:

| was | now |
|---|---|
| `OTPRequest(login, captcha)` | `authStart(purpose: "login", login)` |
| `login(login, phone, password, otp, captcha)` | `authStart` / `authSubmit` / `authExchange` |
| `startAuth` / `completeAuth` / `authStatus(stateId)` | `authStart` / `authStatus(id)` |
| `setAuthPhone` / `requestAuthOtp` / `resendAuthOtp` / `confirmAuthPhone` | `authSubmit` / `authResend` |
| `myAuthProviders` | `authMethods(purpose: "link")` + `myAccount` |
| `linkAuthProvider` / `unlinkAuthProvider` | `authStart(purpose: "link")` / `authUnlink` |
| `registration(login, phone, password, otp, …)` | `registration(firstName, …)` under the JWT — profile only |
| `restorePassword(login, phone, password, otp)` | removed: there is no password as a way in (auth v2) |
| `userDelete(otp)` | `userDelete(ticket)` |
| `restrictions.user.OTPlength` | `step.codeLength` (the field stayed, but it lies by construction) |

---

## Logout

> 🛡 Authentication required
>
```gql
logout(
    deviceID: String (Optional field if not pass logout from current device) 
): Response
```
      


## logout from all devices

> 🛡 Authentication required

```gql
logoutFromAllDevices: Response
```
