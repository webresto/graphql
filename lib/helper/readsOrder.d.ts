/**
 * May this request see the order? An order is its device's and its account's: it goes only to the device that made it
 * (`X-Device-Id`, `Order.deviceId`) or to its account signed in (the token, `Order.user`) - a link to an order opened in
 * another browser shows nothing, its short id is no key. An order nobody owns is a cart anybody with its id may read:
 * the snapshot of "share the cart" (`Order.share`); a placed order nobody owns is nobody's to read here.
 */
export default function readsOrder(order: {
    deviceId?: string | null;
    user?: unknown;
    state?: string;
}, context: any): Promise<boolean>;
