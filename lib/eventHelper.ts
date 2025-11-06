import graphql from '../src/graphql';
// import * as gql from '@webresto/graphql';
import { Message, Action } from "../types/primitives"
import * as crypto from "crypto"

export default {
    sendMessage,
    sendAction,
    getRandom
}
export {
    sendMessage,
    sendAction,
    getRandom
}

interface MessageWithId extends Message {
    id: string
}

interface ActionWithId extends Action {
    id: string
}

//TODO: Add ID for all message and add returun
//TODO rename to makeMessage 
async function sendMessage(message: Message): Promise<MessageWithId> {
    if (!message){
        sails.log.error(`API > sendMessage: Message is not defined`)
        return
    }
    if(!message.id){
        message.id = getRandom();
    }

    const pubsub = graphql.getPubsub();
    pubsub.publish("message", {deviceId:message.deviceId, message});
    return message as MessageWithId
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

function sendAction(action: Action): ActionWithId {
    if(!action.id){
        action.id = getRandom();
    }

    const pubsub = graphql.getPubsub();
    pubsub.publish("action", {deviceId: action.deviceId, action});
    return action as ActionWithId
}


function getRandom(length:number = 16): string{
    return crypto.randomBytes(length).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}