import { Message, Action } from "../types/primitives";
declare const _default: {
    sendMessage: typeof sendMessage;
    sendAction: typeof sendAction;
    getRandom: typeof getRandom;
};
export default _default;
export { sendMessage, sendAction, getRandom };
interface MessageWithId extends Message {
    id: string;
}
interface ActionWithId extends Action {
    id: string;
}
declare function sendMessage(message: Message): Promise<MessageWithId>;
/**
 *
 * @param orderId
 * @param action  - obj {type, data: Json}
 * @returns Action with ID
 * @example
 * {
 *      type: "PaymentRedirect",
 *      data: {
 *          url: "somelink.com/"
 *      }
 * }
 */
declare function sendAction(action: Action): ActionWithId;
declare function getRandom(length?: number): string;
