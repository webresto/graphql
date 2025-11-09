"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.sendAction = sendAction;
exports.getRandom = getRandom;
const graphql_1 = require("../src/graphql");
const crypto = require("crypto");
exports.default = {
    sendMessage,
    sendAction,
    getRandom
};
//TODO: Add ID for all message and add returun
//TODO rename to makeMessage 
async function sendMessage(message) {
    if (!message) {
        sails.log.error(`API > sendMessage: Message is not defined`);
        return;
    }
    if (!message.id) {
        message.id = getRandom();
    }
    const pubsub = graphql_1.default.getPubsub();
    pubsub.publish("message", { deviceId: message.deviceId, message });
    return message;
}
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
function sendAction(action) {
    if (!action.id) {
        action.id = getRandom();
    }
    const pubsub = graphql_1.default.getPubsub();
    pubsub.publish("action", { deviceId: action.deviceId, action });
    return action;
}
function getRandom(length = 16) {
    return crypto.randomBytes(length).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
