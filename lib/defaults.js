"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let userConfig = {};
if (process.env.USER_API != "NO") {
    userConfig = {
        ...userConfig,
        user: ['query', 'subscription'],
    };
    if (process.env.BONUS_PROGRAM_API != "NO") {
        userConfig = {
            ...userConfig,
            bonusprogram: ['query', 'subscription'],
            userbonusprogram: ['query', 'subscription'],
            userbonustransaction: ['query', 'subscription']
        };
    }
    if (process.env.USER_LOCATION_API != "NO") {
        userConfig = {
            ...userConfig,
            userlocation: ['query', 'subscription'],
        };
    }
    if (process.env.USER_ORDER_HISTORY_API != "NO") {
        userConfig = {
            ...userConfig,
            userorderhistory: ['query', 'subscription']
        };
    }
}
module.exports.restographql = {
    whiteListAutoGen: {
        group: ['query', 'subscription'],
        dish: ['query', 'subscription'],
        city: ['query'],
        street: ['query'],
        ...userConfig
    },
    blackList: [
        'Order.groupModifiers',
        'Order.promotionCode',
        'Order.isPromoting',
        'Order.rmsOrderData',
        'Order.promotionFlatDiscount',
        'Order.promotionDelivery',
        'Order.promotionCodeCheckValidTill',
        'Order.promotionErrors',
        'Dish.favorites',
        'worktime',
        'hash',
        'isDeleted',
        'createdAt',
        'updatedAt'
    ]
};
