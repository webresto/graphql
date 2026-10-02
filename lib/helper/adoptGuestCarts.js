"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adoptGuestCarts;
/**
 * Hand the carts this device was assembling over to the account that just signed in.
 *
 * Nothing else did this. `Order.user` was filled in only by `Order.doFinalize`
 * (core/models/Order.ts, via AuthService.materializeUser) — on an order that was already
 * finished — so signing in left a guest cart anonymous forever. With REQUIRE_AUTH_FOR_CART on
 * that cart can never take another dish; with it off the user just silently loses the basket
 * they picked before logging in. One fix for both (require-auth-for-cart.md §5, option b).
 *
 * Scope is deliberately narrow:
 *   - one device only, and only after issueToken's UserDevice lookup says that device is signed
 *     in as this account — necessary, but not sufficient on its own (see below);
 *   - only carts that carry nothing personal, or a phone this account has proven;
 *   - only orders still being assembled (NEW / CART) and still anonymous (`user: null`) — a
 *     cart that already belongs to someone is never re-pointed;
 *   - never fatal: losing a basket must not cost the user their sign-in.
 *
 * The account can end up holding more than one cart. That is already true today and is fine:
 * the client works from the orderId it holds, not from "the user's cart".
 */
async function adoptGuestCarts(userId, deviceId) {
    if (!userId || !deviceId)
        return;
    try {
        const candidates = await Order.find({ deviceId: deviceId, user: null, state: ["NEW", "CART"], paid: false });
        if (!candidates.length)
            return;
        /**
         * The device check in issueToken proves "this deviceId is signed in as me RIGHT NOW", which
         * is weaker than "this cart is mine": `User.authDevice` re-points any deviceId at whoever
         * last authenticated with it, and the deviceId itself comes from the client. So somebody who
         * signs into their OWN account quoting a borrowed deviceId lands here holding a stranger's
         * basket — and a CART carries `customer` (name, phone, address), written by Order.check
         * before the state moves on, so a failed checkout leaves PII sitting in one (review2 §4.5).
         *
         * Hence the second condition: a cart is adopted while it is anonymous in content too —
         * either nothing personal in it yet, or a phone this account has already PROVEN it owns.
         * Anything else stays where it is; the loss is a basket, and the alternative is handing over
         * somebody's name and address for the price of a guessed id.
         */
        const proven = new Set((await AuthIdentity.find({ user: userId, provider: "phone" }))
            .filter((identity) => identity.proof)
            .map((identity) => String(identity.externalId)));
        const mine = candidates.filter((order) => {
            const customer = order.customer;
            if (!customer || (!customer.name && !customer.phone))
                return true;
            const digits = `${customer.phone?.code ?? ""}${customer.phone?.number ?? ""}`.replace(/\D/g, "");
            return Boolean(digits) && proven.has(digits);
        });
        for (const order of candidates) {
            if (mine.includes(order))
                continue;
            sails.log.warn(`GQL > adoptGuestCarts: cart [${order.id}] left behind — it carries customer data this account has not proven`);
        }
        if (!mine.length)
            return;
        const adopted = await Order.update({ id: mine.map((order) => order.id) }, { user: userId }).fetch();
        for (const order of adopted) {
            await Order.log({ id: order.id }, "info", "core", `Guest cart adopted by user on login`, { userId, deviceId });
        }
    }
    catch (error) {
        sails.log.error(`GQL > adoptGuestCarts: [${userId}] [${deviceId}]`, error);
    }
}
