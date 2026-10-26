"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventHelper = __importStar(require("../../lib/eventHelper"));
// todo: fix types model instance to {%ModelName%}Record for Order"
const OrderHelper_1 = require("@webresto/core/lib/order/OrderHelper");
const graphqlHelper_1 = __importDefault(require("../../lib/graphqlHelper"));
const jwt_1 = require("../../lib/jwt");
const order_1 = require("./order");
graphqlHelper_1.default.addType(`#graphql    
  input InputOrderCheckout {
    orderId: String! 
    paymentMethodId: String!
    platform: String
    customer: Customer! 
    spendBonus: InputSpendBonus 
    """How the customer gets the food: delivery, pickup or dine-in. Defaults to delivery."""
    serviceType: String
    pickupPointId: String
    locationId: String
    address: AddressInput
    date: String
    """Longest the customer will wait, in minutes. Mutually exclusive with date."""
    maxWaitMinutes: Int
    comment: String
    personsCount: Int
    customData: Json
  }
`);
graphqlHelper_1.default.addType(`#graphql    
  input InputSpendBonus {
    bonusProgramId: String!
    amount: Int!
    adapter: String!
    bonusProgramName: String!
  } 
`);
graphqlHelper_1.default.addType(`#graphql
  type InitCheckout {
    "Order version number (always growing)"
    nonce: Int
    "When the order can be had: [from, to] in Unix seconds, from now to the latest moment it may be for (POSSIBLE_TO_ORDER_IN_MINUTES), by the hours of the kitchens that take its address (delivery) or of its point (pickup, dine-in). Empty: never - no address or point yet, or closed all along"
    worktimeIntervals: [[Int!]!]
    "Whether the order can be had as soon as possible: an interval holds now"
    allowSoonAsPossible: Boolean
    "Whether the order can be had by a time: there is an interval"
    allowOrderToTime: Boolean
    "Html chunk for place top of spending bonus section on checkout"
    bonusBannerHTMLChunk: String
    "The minimum time required to cook the dish, in minutes. Added to delivery time to calculate earliest readiness."
    minCookingTimeInMinutes: Int
    "Optional textual description of cooking time (e.g. 'Prepared in 15–20 minutes')."
    cookingTimeDescription: String
  }
`);
exports.default = {
    Query: {
        initCheckout: {
            def: 'initCheckout(orderId: String): InitCheckout',
            fn: async function (_, { orderId }, ctx) {
                try {
                    // The storefront keeps its order id across a stand or archive that no
                    // longer has the order; `order` and `orderAddDish` answer that with a
                    // fresh cart under the same id, and checkout must not answer with a crash.
                    if (orderId && !(await Order.findOne({ id: orderId }))) {
                        sails.log.warn(`GQL > initCheckout: order with id ${orderId} not found. Trying make new cart.`);
                        await (0, order_1.getNewCart)(ctx, orderId);
                    }
                    let populatedOrder = await Order.populate(orderId);
                    return await OrderHelper_1.OrderHelper.initCheckout(populatedOrder);
                }
                catch (error) {
                    sails.log.error(`GQL > [initCheckout]`, error, { orderId });
                    throw error;
                }
            }
        },
    },
    Mutation: {
        checkOrder: {
            def: `#graphql
        checkOrder(orderCheckout: InputOrderCheckout): CheckResponse`,
            fn: async function (parent, args, context) {
                let data = args.orderCheckout;
                if (!context.connectionParams.deviceId) {
                    throw `Missed deviceId`;
                }
                // if (data.date) {
                //     let date = moment(data.date)
                //     if(!date.isValid()){
                //         return eventHelper.sendMessage(args.orderId, "Please order.date format is ISO (YYYY-MM-DD HH:mm:ss)");
                //     } else {
                //     data.date = date.format('YYYY-MM-DD HH:mm:ss');
                //     }
                // }
                const serviceType = data.serviceType ?? "delivery";
                let address = null;
                let message;
                try {
                    var order = await Order.findOne(data.orderId);
                    const shouldSendSucessMessage = order.state !== "CHECKOUT";
                    if (!order) {
                        message = eventHelper.sendMessage({
                            deviceId: context.connectionParams.deviceId,
                            type: "error",
                            title: context.i18n.__("Order not found"),
                            message: context.i18n.__("Order with id %s not found", data.orderId),
                        });
                    }
                    if (serviceType !== "delivery") {
                        order.pickupPoint = data.pickupPointId;
                    }
                    else {
                        order.pickupPoint = null;
                        if (!data.address && !data.locationId)
                            throw `Address is required for delivery orders`;
                    }
                    if (Order.isOrderedState(order.state)) {
                        message = eventHelper.sendMessage({
                            deviceId: context.connectionParams.deviceId,
                            type: "error",
                            title: context.i18n.__("Error"),
                            message: context.i18n.__("Cart was ordered"),
                        });
                    }
                    if (data.paymentMethodId) {
                        if (!PaymentMethod.checkAvailable(data.paymentMethodId)) {
                            message = eventHelper.sendMessage({
                                deviceId: context.connectionParams.deviceId,
                                type: "error",
                                title: context.i18n.__("Error"),
                                message: context.i18n.__("Checking the payment system ended in failure"),
                            });
                        }
                    }
                    let userId = null;
                    if (context && context.connectionParams.authorization) {
                        userId = (await jwt_1.JWTAuth.verify(context.connectionParams.authorization)).userId;
                    }
                    if (serviceType === "delivery") {
                        // A saved location is an order's address without the node, so it
                        // takes the same fields as one typed at checkout, and nothing else.
                        // Only the caller's own: someone else's id is not found, as is any
                        // id without a signed-in caller.
                        if (data.locationId) {
                            address = await UserLocation.findOne({ id: data.locationId, user: userId });
                            if (!address)
                                throw `locationId not found`;
                        }
                        else {
                            address = data.address;
                        }
                        address = {
                            // The customer's city verbatim. There is no installation-wide
                            // city to fall back on any more, and substituting one is what
                            // used to send an address to the wrong town.
                            city: address.city,
                            node: address.node ?? null,
                            formatted: address.formatted,
                            ...address.home && { home: address.home },
                            ...address.coordinate && { coordinate: address.coordinate },
                            ...address.housing && { housing: address.housing },
                            ...address.apartment && { apartment: address.apartment },
                            ...address.entrance && { entrance: address.entrance },
                            ...address.floor && { floor: address.floor },
                            ...address.doorphone && { doorphone: address.doorphone },
                            ...address.comment && { comment: address.comment },
                        };
                    }
                    order.personsCount = data.personsCount ? data.personsCount + "" : "";
                    if (data.comment)
                        order.comment = data.comment;
                    order.date = data.date;
                    // Written even when absent, so clearing it clears it. The two timing
                    // modes are mutually exclusive and `Order.checkDate` refuses an order
                    // carrying both — a stale value left behind here would be that refusal
                    // firing at a customer who had already switched modes.
                    order.maxWaitMinutes = typeof data.maxWaitMinutes === "number" ? data.maxWaitMinutes : null;
                    // callback: boolean -call back to clarify details
                    if (data.customData && data.customData.callback) {
                        if (!order.customData)
                            order.customData = {};
                        order.customData.callback = data.customData.callback;
                    }
                    await Order.update({ id: order.id }, order).fetch();
                    await Order.check({ id: order.id }, data.customer, serviceType, address, data.paymentMethodId, userId, data.spendBonus !== undefined && userId !== null ? data.spendBonus : null, data.platform);
                    order = await Order.populate(data.orderId);
                    if (!order) {
                        throw new Error(`Order with id: \`${data.orderId}\` not found`);
                    }
                    if (order.state === "CHECKOUT" && shouldSendSucessMessage) {
                        message = {
                            deviceId: context.connectionParams.deviceId,
                            type: "info",
                            title: context.i18n.__("Attention"),
                            message: order.message
                                ? context.i18n.__(order.message)
                                : context.i18n.__("Ready for order"),
                        };
                    }
                    else {
                        if (order.message) {
                            message = {
                                deviceId: context.connectionParams.deviceId,
                                type: "error",
                                title: context.i18n.__("Attention"),
                                message: order.message
                                    ? context.i18n.__(order.message)
                                    : context.i18n.__("It was not possible to check the order"),
                            };
                        }
                    }
                    if (message) {
                        eventHelper.sendMessage(message);
                    }
                    return {
                        order: order,
                        ...message && { message: message }
                    };
                }
                catch (e) {
                    sails.log.error(`GQL > [checkOrder]`, e, args);
                    // Unknown errors: the core text is an English i18n key (`e.error`); technical
                    // exception text (`e.message`) stays in the log, the customer gets a translated message
                    let message = {
                        type: "error",
                        title: context.i18n.__("Error"),
                        message: typeof e?.error === "string"
                            ? context.i18n.__(e.error)
                            : context.i18n.__("It was not possible to check the order"),
                        // The text below is translated and is not a contract; the code is. formatError drops
                        // `extensions`, so the refusal says it here, in the answer the storefront reads.
                        code: typeof e?.code === "number" ? e.code : null,
                    };
                    if (e.code === 0) {
                        message.message = context.i18n.__("It was not possible to check the order");
                    }
                    else if (e.code === 1) {
                        message.message = context.i18n.__("Enter the name of the customer");
                    }
                    else if (e.code === 2) {
                        message.message = context.i18n.__("Enter the customer's phone");
                    }
                    else if (e.code === 3) {
                        message.message = context.i18n.__("The wrong format of the name of the customer");
                    }
                    else if (e.code === 4) {
                        message.message = context.i18n.__("The wrong format of the customer phone number");
                    }
                    else if (e.code === 5) {
                        message.message = context.i18n.__("No address given");
                    }
                    else if (e.code === 6) {
                        message.message = context.i18n.__("Not indicated the house number");
                    }
                    else if (e.code === 7) {
                        message.message = context.i18n.__("The city is not indicated");
                    }
                    else if (e.code === 8) {
                        message.message = context.i18n.__("The payment system is not available");
                    }
                    else if (e.code === 11) {
                        message.message = order.delivery?.message || "Delivery calculation error";
                    }
                    else if (e.code === 9) {
                        message.message = context.i18n.__("The order date is not valid");
                    }
                    else if (e.code === 12) {
                        message.message = context.i18n.__("The order has already been paid");
                    }
                    else if (e.code === 13) {
                        message.message = context.i18n.__("The cart is empty");
                    }
                    else if (e.code === 14) {
                        message.message = context.i18n.__("Failed to calculate the cart");
                    }
                    else if (e.code === 19) {
                        // a missing or unsupported server timezone (the bonus limit is 28/29 here)
                        message.message = context.i18n.__("Ordering is temporarily unavailable");
                    }
                    else if (e.code === 20) {
                        // core uses code 20 both for a cart that requires sign-in and for an order
                        // that asks for a delivery time and a maximum wait at once
                        message.message = e.error === "authorization required"
                            ? context.i18n.__("Authorization required")
                            : context.i18n.__("Choose either a delivery time or a maximum wait, not both");
                    }
                    else if (e.code === 10) {
                        message.message = context.i18n.__("The date of execution of the order is not true");
                    }
                    else if (e.code === 15) {
                        message.message = context.i18n.__("Ordering for a date in the past is not possible");
                    }
                    else if (e.code === 16) {
                        message.message = context.i18n.__("Date not allowed");
                    }
                    else if (e.code === 18) {
                        message.message = context.i18n.__("Order date is outside work time");
                    }
                    else if (e.code === 17) {
                        message.message = context.i18n.__("The date should account for the minimum delivery time; choose a slightly later time");
                    }
                    else if (e.code === 22) {
                        // Not the customer's problem and not something they can act on, so
                        // they are told the order cannot be taken rather than why. The code
                        // and the route are in the order's journal for the operator.
                        message.message = context.i18n.__("This order cannot be prepared as one order right now. Please contact us.");
                    }
                    else if (e.code === 21) {
                        // The estimate itself is in `e.error`; it is the one number that makes
                        // this actionable, so it is shown rather than replaced by a generic line.
                        message.message = e.error ?? context.i18n.__("The order cannot be ready that quickly");
                    }
                    else if (e.code === 23) {
                        message.message = context.i18n.__("The chosen location is closed right now");
                    }
                    else if (e.code === 24) {
                        // Which point and which service type are in `e.error` and the order's
                        // journal; the customer only needs to know to choose another one.
                        message.message = context.i18n.__("The chosen location does not take these orders");
                    }
                    else if (e.code === 26) {
                        // No kitchen takes it: the one of the zone is closed (or none stands there). Which and why are in the
                        // order's journal; the customer can choose a time or pickup.
                        message.message = context.i18n.__("The kitchen of this area is closed now - choose a time it works at, or pickup");
                    }
                    else if (e.code === 28) {
                        // what the bonus system says the customer has: the field can be set to it
                        message.message = context.i18n.__("Not enough bonuses: %s available", e.available ?? 0);
                    }
                    else if (e.code === 29) {
                        message.message = context.i18n.__("Paying with bonuses is not available now");
                    }
                    else if (e.code === 27) {
                        // The device kept the cart of the account it was logged in as; the storefront starts
                        // a new one at the logout, so this is a client that did not.
                        message.message = context.i18n.__("This cart belongs to another account. Please start a new cart");
                    }
                    order = await Order.populate(data.orderId);
                    sails.log.error(`GQL > [checkOrder]`, e, args);
                    eventHelper.sendMessage(message);
                    return {
                        order,
                        message
                    };
                }
            },
        },
        sendOrder: {
            def: "sendOrder(orderId: String!): CheckResponse",
            fn: async function (parent, args, context) {
                if (!context.connectionParams.deviceId) {
                    throw `Missed deviceId`;
                }
                let data = args;
                var order = await Order.findOne({ id: data.orderId });
                if (!order) {
                    const errorMessage = context.i18n.__(`Order with id %s not found`, data.orderId);
                    eventHelper.sendMessage({
                        deviceId: context.connectionParams.deviceId,
                        type: "error",
                        title: context.i18n.__("Order not found"),
                        message: errorMessage,
                    });
                    sails.log.error(`${errorMessage}`, args);
                    throw new Error(errorMessage);
                }
                if (!order.isPaymentPromise) {
                    try {
                        let paymentResponse = await Order.payment({ id: order.id });
                        const action = {
                            deviceId: context.connectionParams.deviceId,
                            type: "Redirect",
                            data: {
                                link: paymentResponse.redirectLink,
                            },
                        };
                        eventHelper.sendAction(action);
                        order = await Order.populate({ id: order.id });
                        return { order: order, action: action };
                    }
                    catch (e) {
                        eventHelper.sendMessage({
                            deviceId: context.connectionParams.deviceId,
                            type: "error",
                            title: context.i18n.__("Error"),
                            message: context.i18n.__("The payment of the payment has ended unsuccessfully"),
                        });
                        const error = `External payment: ${e}`;
                        sails.log.error(`GQL > [sendOrder]`, error, args);
                        throw new Error(error);
                    }
                }
                try {
                    await Order.order({ id: order.id });
                    order = await Order.findOne({ id: data.orderId });
                    const message = {
                        type: "info",
                        title: context.i18n.__("Successfully"),
                        message: context.i18n.__("Your order is accepted for processing"),
                    };
                    // eventHelper.sendMessage(message);
                    return { order: order, message: message };
                }
                catch (e) {
                    const error = `Order finalize error:, ${e}`;
                    sails.log.error(`GQL > [sendOrder]`, error, args);
                    throw new Error(error);
                }
            },
        },
    },
};
