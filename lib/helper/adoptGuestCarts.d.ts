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
export default function adoptGuestCarts(userId: string, deviceId: string): Promise<void>;
