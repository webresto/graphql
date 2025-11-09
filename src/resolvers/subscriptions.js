"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const checkDeviceId_1 = require("../../lib/helper/checkDeviceId");
exports.default = {
    Subscription: {
        order: {
            def: `#graphql
      "If you authorized you should send Authorization header;"
      order(deviceId: String): Order
      `,
            fn: {
                subscribe: (0, apollo_server_1.withFilter)((rootValue, args, context, info) => {
                    if (args.deviceId) {
                        context.connectionParams.deviceId = args.deviceId;
                    }
                    (0, checkDeviceId_1.default)(context);
                    return context.pubsub.asyncIterator('order-changed');
                }, (payload, query, context, info) => {
                    return payload.deviceId === context.connectionParams.deviceId;
                }),
                resolve: payload => {
                    const order = payload;
                    return order;
                }
            }
        },
        message: {
            def: `#graphql
      "If you authorized you should send Authorization header, and pass X-Device-Id header;"
      message(deviceId: String): Message
      `,
            fn: {
                subscribe: (0, apollo_server_1.withFilter)((rootValue, args, context, info) => {
                    if (args.deviceId) {
                        context.connectionParams.deviceId = args.deviceId;
                    }
                    (0, checkDeviceId_1.default)(context);
                    return context.pubsub.asyncIterator('message');
                }, (payload, query, context, info) => {
                    // console.log(payload.deviceId, context.connectionParams.deviceId)
                    return payload.deviceId === context.connectionParams.deviceId;
                }),
                resolve: payload => {
                    return payload.message;
                }
            }
        },
        action: {
            def: `#graphql
      "If you authorized you should send Authorization header, and pass X-Device-Id header; Please read full documentation for Actions https://docs.webresto.org/docs/graphql/actions/"
      action(deviceId: String): Action
      `,
            fn: {
                subscribe: (0, apollo_server_1.withFilter)((rootValue, args, context, info) => {
                    if (args.deviceId) {
                        context.connectionParams.deviceId = args.deviceId;
                    }
                    (0, checkDeviceId_1.default)(context);
                    return context.pubsub.asyncIterator('action');
                }, (payload, query, context, info) => {
                    // console.log(payload.deviceId, context.connectionParams.deviceId)
                    return payload.deviceId === context.connectionParams.deviceId;
                }),
                resolve: payload => {
                    return payload.action;
                }
            }
        },
        maintenance: {
            def: `
      "No maintenance when recive null"
      maintenance: Maintenance`,
            fn: {
                subscribe: (0, apollo_server_1.withFilter)((rootValue, args, context, info) => context.pubsub.asyncIterator('maintenance'), (payload, query) => {
                    return true;
                }),
                resolve: payload => {
                    return payload;
                }
            }
        }
    }
};
