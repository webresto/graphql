import { JWTAuth } from "../jwt";

/**
 * May this request see the order? An order is its device's and its account's: it goes only to the device that made it
 * (`X-Device-Id`, `Order.deviceId`) or to its account signed in (the token, `Order.user`) - a link to an order opened in
 * another browser shows nothing, its short id is no key. An order nobody owns is a cart anybody with its id may read:
 * the snapshot of "share the cart" (`Order.share`); a placed order nobody owns is nobody's to read here.
 */
export default async function readsOrder(order: { deviceId?: string | null; user?: unknown; state?: string }, context: any): Promise<boolean> {
  const deviceId = context?.connectionParams?.deviceId;
  if (deviceId && order.deviceId === deviceId) return true;
  const owner = order.user && typeof order.user === "object" ? (order.user as { id?: string }).id : order.user;
  if (owner) return owner === (await signedIn(context));
  if (!order.deviceId) return !Order.isOrderedState(order.state as any);
  return false;
}

/** the account of the request's token, null - none or not valid; verified once per token of a connection */
async function signedIn(context: any): Promise<string | null> {
  const params = context?.connectionParams;
  const token = params?.authorization;
  if (!token) return null;
  if (params.signedIn?.token !== token) {
    let userId: string | null = null;
    try {
      userId = (await JWTAuth.verify(token)).userId ?? null;
    } catch {
      userId = null;
    }
    params.signedIn = { token, userId };
  }
  return params.signedIn.userId;
}
