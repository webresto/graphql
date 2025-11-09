"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("@webresto/core/libs/checkExpression");
// todo: fix types model instance to {%ModelName%}Record for Order"
const jwt_1 = require("../../lib/jwt");
const graphqlHelper_1 = require("@webresto/graphql/lib/graphqlHelper");
(0, graphqlHelper_1.addToReplaceList)("Order.promotionState", "promotionState: [PromotionState]");
(0, graphqlHelper_1.addToReplaceList)("Order.pickupPoint", "pickupPoint: PickupPoint");
const graphqlHelper_2 = require("../../lib/graphqlHelper");
const checkDeviceId_1 = require("../../lib/helper/checkDeviceId");
graphqlHelper_2.default.addType(`#graphql
  input InputOrderUpdate {
    id: String!
    trifleFrom: Int
    comment: String
    date: String
    selfService: Boolean
    paymentMethodId: String
    promotionCodeString: String
    address: AddressInput
    pickupPoint: String
  }
  `);
exports.default = {
    Query: {
        order: {
            def: `#graphql
      """ if orderId is not set, a new cart will be returned """
      order(orderId: String, shortId: String, orderNumber: String): Order`,
            fn: async function (parent, args, context) {
                try {
                    let order;
                    let criteria = {};
                    if (args.orderNumber) {
                        criteria["rmsOrderNumber"] = args.orderNumber;
                        criteria["sort"] = "createdAt DESC";
                    }
                    else if (args.orderId) {
                        criteria["id"] = args.orderId;
                    }
                    else if (args.shortId) {
                        criteria["shortId"] = args.shortId;
                    }
                    if (Object.keys(criteria).length !== 0) {
                        order = (await Order.find(criteria))[0];
                    }
                    if (!order) {
                        sails.log.error("GQL > order resolver error: ", `order with id ${args.orderId}  not found. Trying make new cart.`);
                        order = await getNewCart(context, args.orderId);
                    }
                    let fullOrder = await Order.populate(order.id);
                    emitter.emit("http-api:before-response-order", fullOrder);
                    return fullOrder;
                }
                catch (error) {
                    sails.log.error(`GQL > query order`, error);
                }
            },
        },
    },
    Mutation: {
        orderAddDish: {
            def: "orderAddDish(orderId: String, dishId: String, amount: Int, modifiers: Json, comment: String, from: String, replace: Boolean, orderDishId: Int): Order",
            fn: async function (parent, args, context) {
                try {
                    let order;
                    if (args.modifiers) {
                        args.modifiers.forEach((modifier) => {
                            if (modifier.amount === undefined || modifier.id === undefined) {
                                const error = `modifier required (amount, id) for dish: ${args.dishId} current values: id: ${modifier.id}, amount: ${modifier.amount}`;
                                sails.log.error(`GQL > orderAddDish:`, error);
                                throw new Error(error);
                            }
                        });
                    }
                    if (args.orderId)
                        order = await Order.findOne({ id: args.orderId });
                    if (!order) {
                        sails.log.warn("GQL > orderAddDish: ", `order with id ${args.orderId} not found. Trying make new cart.`);
                        order = await getNewCart(context, args.orderId);
                    }
                    const dish = await Dish.findOne({ id: args.dishId });
                    if (!dish && !args.replace)
                        throw `dish with id ${args.dishId} not found`;
                    if (dish && (0, checkExpression_1.default)(dish) === "promo") {
                        let additionalInfo;
                        try {
                            additionalInfo = JSON.parse(dish.additionalInfo);
                        }
                        catch (e) { }
                        if (additionalInfo && additionalInfo.defaultOrderDish) {
                            // Exception for product in each cart
                        }
                        else {
                            const error = `"${dish.name}" not promo item`;
                            sails.log.error(`GQL > orderAddDish`, error);
                            throw new Error(error);
                        }
                    }
                    await Order.addDish(order.id, args.dishId, args.amount, args.modifiers === undefined ? [] : args.modifiers, args.comment, 'user', args.replace, args.orderDishId);
                    await Order.countCart({ id: order.id });
                    let fullOrder = await Order.populate(order.id);
                    await emitter.emit("http-api:before-response-order-add-dish", fullOrder);
                    return fullOrder;
                }
                catch (error) {
                    sails.log.error(`GQL > orderAddDish`, error);
                    throw error;
                }
            },
        },
        orderReplaceDish: {
            def: "orderReplaceDish(orderId: String!, orderDishId: Int!, amount: Int, modifiers: Json, comment: String, from: String): Order",
            fn: async (parent, args, context) => {
                let order;
                if (args.orderId)
                    order = await Order.findOne({ id: args.orderId });
                if (!order) {
                    sails.log.warn("GQL > orderAddDish: ", `order with id ${args.orderId} not found. Trying make new cart.`);
                    order = await getNewCart(context, args.orderId);
                }
                if (order.paid || order.state === "ORDER") {
                    order = await getNewCart();
                }
                try {
                    await Order.addDish(order.id, args.dishId, args.amount, args.modifiers === undefined ? [] : args.modifiers, args.comment, args.from, args.replace, args.orderDishId);
                }
                catch (error) {
                    throw error;
                }
                await Order.countCart({ id: order.id });
                let fullOrder = await Order.populate(order.id);
                await emitter.emit("http-api:before-response-order-replace-dish", fullOrder);
                return fullOrder;
            },
        },
        orderRemoveDish: {
            def: "orderRemoveDish(id: String!, orderDishId: Int!, amount: Int): Order",
            fn: async function (parent, args, context) {
                let order;
                order = await Order.findOne({ id: args.id });
                if (!order) {
                    sails.log.warn("GQL > orderAddDish: ", `order with id ${args.orderId} not found. Trying make new cart.`);
                    order = await getNewCart(context, args.orderId);
                }
                if (order.paid || order.state === "ORDER") {
                    order = await getNewCart();
                }
                const orderDish = await OrderDish.findOne({ id: args.orderDishId });
                try {
                    await Order.removeDish(order.id, orderDish, args.amount, false);
                }
                catch (error) {
                    throw error;
                }
                await Order.countCart({ id: order.id });
                let fullOrder = await Order.populate(order.id);
                await emitter.emit("http-api:before-response-order-remove-dish", fullOrder);
                return fullOrder;
            },
        },
        orderSetDishAmount: {
            def: "orderSetDishAmount(id: String, orderDishId: Int, amount: Int): Order",
            fn: async function (parent, args, context) {
                let order;
                order = await Order.findOne(args.id);
                if (!order) {
                    sails.log.warn("GQL > orderAddDish: ", `order with id ${args.orderId} not found. Trying make new cart.`);
                    order = await getNewCart(context, args.orderId);
                }
                if (order.paid || order.state === "ORDER") {
                    order = await getNewCart();
                }
                let dish = await OrderDish.findOne(args.orderDishId).populate("dish");
                if (!dish) {
                    const error = `OrderDish with id ${args.orderDishId} not found`;
                    sails.log.error(`GQL > orderSetDishAmount`, error);
                    throw new Error(error);
                }
                if (!dish.dish) {
                    const error = `Dish in OrderDish with id ${args.orderDishId} not found`;
                    sails.log.error(`GQL > orderSetDishAmount`, error);
                    throw new Error(error);
                }
                try {
                    await Order.setCount(order.id, dish, args.amount);
                }
                catch (error) {
                    throw error;
                }
                await Order.countCart({ id: order.id });
                let fullOrder = await Order.populate(order.id);
                await emitter.emit("http-api:before-response-order-set-dish-amount", fullOrder);
                return fullOrder;
            },
        },
        orderSetDishComment: {
            def: "orderSetDishComment(id: String, orderDishId: Int, comment: String): Order",
            fn: async function (parent, args, context) {
                let order;
                const data = args;
                const orderId = data.orderId;
                const comment = data.comment || "";
                const dishId = data.dishId;
                if (!dishId) {
                    const error = "dishId is required";
                    sails.log.error(`GQL > orderSetDishComment`, error);
                    throw new Error(error);
                }
                order = await Order.findOne(orderId);
                if (!order) {
                    sails.log.warn("GQL > orderAddDish: ", `order with id ${args.orderId} not found. Trying make new cart.`);
                    order = await getNewCart(context, args.orderId);
                }
                if (order.paid || order.state === "ORDER") {
                    order = await getNewCart();
                }
                const dish = await OrderDish.findOne({ id: dishId }).populate("dish");
                if (!dish) {
                    const error = `Dish with id ${dishId} not found`;
                    sails.log.error(`GQL > orderSetDishComment`, error);
                    throw new Error(error);
                }
                await order.setComment(dish, comment);
                await Order.countCart({ id: order.id });
                let fullOrder = await Order.populate(order.id);
                await emitter.emit("http-api:before-response-order-set-dish-comment", fullOrder);
                return fullOrder;
            },
        },
        orderUpdate: {
            def: '"""allowed only for trifleFrom, address, pickUpPoint """ orderUpdate(order: InputOrderUpdate): Order',
            fn: async function (parent, args, context) {
                let order = args.order;
                if (!order.id)
                    throw "order.id field is required";
                let _order = await Order.findOne(order.id);
                if (['NEW', 'CART', 'CHECKOUT', 'PAYMENT'].includes(_order.state) !== true) {
                    throw `Order in state [${order.state}] update not allowed`;
                }
                let orderToCartState = false;
                if (Object.keys(order).length === 1) {
                    throw `no passed updates`;
                }
                const orderUpd = {};
                if (order.address) {
                    orderUpd['address'] = order.address;
                    orderToCartState = true;
                }
                if (order.pickupPoint) {
                    orderUpd['pickupPoint'] = order.pickupPoint;
                    orderToCartState = true;
                }
                if (order.trifleFrom) {
                    orderUpd['trifleFrom'] = order.trifleFrom;
                }
                if (order.comment) {
                    orderUpd['comment'] = order.comment;
                }
                if (order.date) {
                    orderUpd['date'] = order.date;
                    orderToCartState = true;
                }
                if (order.selfService !== undefined) {
                    orderUpd['selfService'] = order.selfService;
                    orderToCartState = true;
                }
                if (order.paymentMethodId) {
                    orderUpd['paymentMethodId'] = order.paymentMethodId;
                    orderToCartState = true;
                }
                if (order.promotionCodeString || order.promotionCodeString === "") {
                    await Order.applyPromotionCode({ id: order.id }, order.promotionCodeString);
                    delete order.promotionCodeString;
                }
                if (Object.keys(order).length > 1) {
                    await Order.update({ id: order.id }, orderUpd).fetch();
                }
                // TODO: Need move logic update in Order Model
                if (orderToCartState && order.state !== "NEW") {
                    await Order.next({ id: order.id }, "CART");
                }
                await Order.countCart({ id: order.id });
                let fullOrder = await Order.populate(order.id);
                await emitter.emit("http-api:before-response-order-update", fullOrder);
                return fullOrder;
            },
        },
        orderClone: {
            def: 'orderClone(orderId: String!): Order',
            fn: async function (parent, args, context) {
                let orderId = args.orderId;
                let newcart = await Order.clone({ id: orderId });
                let fullOrder = await Order.populate({ id: newcart.id });
                emitter.emit("http-api:before-response-order-update", fullOrder);
                return fullOrder;
            },
        },
        orderPromocodeApply: {
            def: 'orderPromocodeApply(orderId: String!, promocode: String!): Order',
            fn: async function (parent, args, context) {
                let orderId = args.orderId;
                let promocode = args.promocode;
                await Order.applyPromotionCode({ id: orderId }, promocode);
                let fullOrder = await Order.populate({ id: orderId });
                emitter.emit("http-api:before-response-order-update", fullOrder);
                return fullOrder;
            },
        },
        orderPromocodeReset: {
            def: 'orderPromocodeReset(orderId: String!): Order',
            fn: async function (parent, args, context) {
                let orderId = args.orderId;
                let promocode = null;
                await Order.applyPromotionCode({ id: orderId }, promocode);
                let fullOrder = await Order.populate({ id: orderId });
                emitter.emit("http-api:before-response-order-update", fullOrder);
                return fullOrder;
            },
        },
    },
};
// Generate new cart
async function getNewCart(context, orderId) {
    try {
        (0, checkDeviceId_1.default)(context);
        let userId = null;
        try {
            if (context && context.connectionParams.authorization) {
                userId = (await jwt_1.JWTAuth.verify(context.connectionParams.authorization)).userId;
            }
        }
        catch (error) {
            sails.log.error(`GQL > getNewCart JWT verify error:`, error);
        }
        let order;
        let initOrder = {};
        // Pass oredrId from frontend
        if (orderId)
            initOrder["id"] = orderId;
        if (userId)
            initOrder["user"] = userId;
        initOrder.deviceId = context.connectionParams.deviceId;
        emitter.emit("http-api:init-newcart", initOrder);
        order = await Order.create(initOrder).fetch();
        await emitter.emit("http-api:create-newcart", order);
        return order;
    }
    catch (error) {
        sails.log.error(`GQL > getNewCart`, error);
        throw error;
    }
}
