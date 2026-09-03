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
const helper = __importStar(require("../lib/graphqlHelper"));
const _ = require("lodash");
const additionalResolvers_1 = require("./additionalResolvers");
const langParser = __importStar(require("accept-language-parser"));
const apollo_server_express_1 = require("apollo-server-express");
const fs = require("fs");
const path = require("path");
var i18nFactory = require('i18n-2');
const apollo_server_1 = require("apollo-server");
const eventHelper_1 = __importDefault(require("../lib/eventHelper"));
const product_availability_1 = require("@webresto/core/lib/product-availability");
const pubsub = new apollo_server_1.PubSub();
sails.graphql = { pubsub };
let server;
const orderUpdateTimers = new Map();
function publishOrderDebounced(order, delay = 700) {
    const id = order.id;
    if (!id)
        return;
    const existing = orderUpdateTimers.get(id);
    if (existing)
        clearTimeout(existing);
    orderUpdateTimers.set(id, setTimeout(() => {
        orderUpdateTimers.delete(id);
        pubsub.publish("order-changed", order);
    }, delay));
}
const AdditionalResolvers = {};
exports.default = {
    getPubsub: () => pubsub,
    getServer: () => server,
    addAdditionalResolver: (resolver) => {
        _.merge(AdditionalResolvers, resolver);
    },
    init: async function () {
        let resolversApiPath = path.resolve(__dirname, "./resolvers");
        if (fs.existsSync(resolversApiPath)) {
            helper.addDirResolvers(resolversApiPath);
        }
        resolversApiPath = path.resolve(process.cwd(), "./api/resolvers");
        if (fs.existsSync(resolversApiPath)) {
            helper.addDirResolvers(resolversApiPath);
        }
        helper.addAllSailsModels();
        if (sails.config.restographql?.whiteListAutoGen)
            helper.setWhiteList(sails.config.restographql.whiteListAutoGen);
        if (sails.config.restographql?.blackList)
            helper.addToBlackList(sails.config.restographql.blackList);
        // console.dir(autoGenerate, {depth: null});
        _.merge(AdditionalResolvers, additionalResolvers_1.additionalResolver);
        helper.addType(`
    input Customer {
      phone: InputPhone
      mail: String
      name: String!
    }
    input InputPhone {
      code: String!
      number: String!
      additionalNumber: String
    }
    input Address {
      streetId: String
      home: String
      comment: String
      city: String
      street: String
      housing: String
      index: String
      entrance: String
      floor: String
      apartment: String
      doorphone: String
    }
    type Message {
      id: String
      title: String
      type: String
      message: String
    }
    type Action {
      id: String
      type: String
      data: Json
    }
    type CheckResponse {
      order: Order
      message: Message
      action: Action
    }
    type Response {
      message: Message
      action: Action
    }
    type GetOrderResponse {
      order: Order
      customData: Json
    }

    type UserCustomField {
      id: String
      type: String
      label: String
      enum: [String]
      description: String
      required: Boolean
      regex: String
    }


    type Phone {
      code: String
      number: String
      additionalNumber: String
    }    
    type CaptchaJob {
      id: String
      task: String
    }
    type PromotionState {
      type: String
      message: String
      state: Json
    }

    """Solved captcha"""
    input Captcha {
      "Captcha job ID"
      id: String!
      "Resolved captcha"
      solution: String!
    }

    """Country"""
    type Country {
      phoneCode: String
      iso: String
      name: String
      nativeCountryName: String
      language: [String]
      currency: String
      currencySymbol: String
      currencyISO: String
      currencyUnit: String
      currencyDenomination: Int
      phoneMask: [String]
      flag: String
    }
    `);
        // helper.addToBlackList(["createdAt", "updatedAt"]);
        // required root types for moduling schema
        helper.addType(`
      type Query {
        _root: String
      }
      type Mutation {
        _root: String
      }
      type Subscription {
        _root: String
      }`);
        /**
         * Discount fields global support
         */
        helper.addCustomField("Dish", "discountAmount: Float");
        helper.addCustomField("Dish", "discountType: String");
        /**
         * @deprecated ???
         */
        helper.addCustomField("Dish", "oldPrice: Float");
        helper.addCustomField("Dish", "salePrice: Float");
        helper.addCustomField("Group", "discount: String");
        /**
         * Stock of a product.
         *
         * It stopped being a column of `dish` and became a property of the pair
         * "product + cooking point", so it is computed per request instead of read
         * off the record. The field itself stays: storefronts read it to grey out a
         * product, and `-1` still means unlimited while `0` still means stopped.
         *
         * The point comes from the menu adapter, the same one that decides which
         * products are in the list at all. Reading it from `DEFAULT_COOKING_PLACE`
         * here while the list was narrowed somewhere else is how a storefront ends
         * up showing one kitchen's products with another kitchen's stock.
         */
        helper.addCustomField("Dish", "balance: Int");
        helper.addResolvers({
            Dish: {
                balance: async (parent) => {
                    const adapter = await Menu.getAdapter();
                    const context = await adapter.resolveContext({});
                    return (0, product_availability_1.getEffectiveBalanceAcross)(String(parent?.id), context.placeIds);
                },
            },
        });
        /**
         * Types of complex order fields
         */
        helper.addType(`#graphql
      type OrderDeliveryState {
        "The delivery leg alone, in minutes. The totals below include cooking."
        deliveryTimeMinutes: Int
        "If disabled, then delivery is not allowed and will be processed"
        allowed: Boolean
        "Cost of delivery"
        cost: Float
        "ID of the service that will be on the delivery receipt"
        item: String
        "Server message for current delivery"
        message: String
        "The zone whose terms produced this result, when one matched"
        zoneId: String
        "Cooking time for this basket. Only products of type dish count."
        preparationMinutes: Int
        "The whole promise: cooking + the road + the safety margin. One number."
        totalTimeMinutes: Int
        "Straight-line kilometres from the kitchen, when both coordinates were known"
        distanceKm: Float
        "How the road was estimated: haversine, a provider name, or none"
        travelTimeSource: String
      }`);
        helper.addToReplaceList("Order.delivery", "delivery: OrderDeliveryState");
        const { typeDefs, resolvers } = helper.getSchema();
        emitter.on("core:order-after-count", "graphql", function (order) {
            publishOrderDebounced(order);
        });
        emitter.on("core:order-after-update", "graphql", function (order) {
            publishOrderDebounced(order);
        });
        emitter.on("send-message", "graphql", function ({ orderId, message }) {
            pubsub.publish("message", { orderId, message });
        });
        emitter.on("core:product-after-update", "graphql", function (record) {
            pubsub.publish("dish-changed", record);
        });
        emitter.on("core:maintenance-enabled", "graphql", function (record) {
            pubsub.publish("maintenance", record);
        });
        emitter.on("core:maintenance-disabled", "graphql", function () {
            pubsub.publish("maintenance", null);
        });
        emitter.on("dialog-box:new", "graphql", function (dialog) {
            const action = {
                type: "dialog-box",
                data: dialog,
                deviceId: dialog.deviceId
            };
            eventHelper_1.default.sendAction(action);
        });
        let apolloServer;
        try {
            apolloServer = new apollo_server_express_1.ApolloServer({
                typeDefs,
                introspection: true,
                playground: true,
                resolvers: [resolvers, AdditionalResolvers],
                subscriptions: {
                    onConnect: (connectionParams, webSocket) => {
                        let exContext = {};
                        if (connectionParams) {
                            /**
                             * Authorization
                             */
                            if (!connectionParams["authorization"] && connectionParams["Authorization"]) {
                                connectionParams["authorization"] = connectionParams["Authorization"];
                            }
                            if (connectionParams["x-device-id"] || connectionParams["X-Device-Id"]) {
                                connectionParams["deviceId"] = connectionParams["x-device-id"] ? connectionParams["x-device-id"] : connectionParams["X-Device-Id"];
                            }
                            exContext["connectionParams"] = connectionParams;
                            /**
                             * Accept-Language
                             */
                            connectionParams["locale"] = sails.config.i18n.defaultLocale;
                            const acceptLanguge = connectionParams["Accept-Language"] ?? connectionParams["accept-language"] ?? false;
                            if (acceptLanguge) {
                                connectionParams["locale"] = langParser.parse(acceptLanguge)[0]?.code ?? sails.config.i18n.defaultLocale;
                            }
                            const i18n = new i18nFactory({ ...sails.config.i18n, directory: sails.config.i18n.localesDirectory, extension: ".json" });
                            i18n.setLocale(connectionParams["locale"]);
                            exContext["i18n"] = i18n;
                        }
                        exContext["pubsub"] = pubsub;
                        return exContext;
                    },
                },
                formatError: (error) => {
                    const graphQLFormattedError = {
                        message: error.message,
                        locations: process.env.NODE_ENV !== "production" ? error.locations ?? error.extensions.exception.stacktrace ?? null : null,
                        path: error.path
                    };
                    sails.log.error('GraphQL Error:', graphQLFormattedError);
                    sails.log.error(error.locations ?? error.extensions.exception.stacktrace);
                    return graphQLFormattedError;
                },
                context: ({ req, connection }) => {
                    if (connection && connection.context) {
                        return connection.context;
                    }
                    else {
                        const headers = {};
                        if (req?.rawHeaders) {
                            for (let i = 0; i < req.rawHeaders.length; i += 2) {
                                const name = req.rawHeaders[i];
                                const value = req.rawHeaders[i + 1];
                                headers[name.toLowerCase()] = value;
                            }
                        }
                        if (headers["x-device-id"] || headers["X-Device-Id"]) {
                            headers["deviceId"] = headers["x-device-id"] ? headers["x-device-id"] : headers["X-Device-Id"];
                        }
                        if (!headers["authorization"] && headers["Authorization"]) {
                            headers["authorization"] = headers["Authorization"];
                        }
                        // set context locale
                        headers["locale"] = sails.config.i18n.defaultLocale;
                        const acceptLanguge = headers["Accept-Language"] ?? headers["accept-language"] ?? false;
                        if (acceptLanguge) {
                            headers["locale"] = (langParser.parse(acceptLanguge))[0]?.code ?? sails.config.i18n.defaultLocale;
                        }
                        const i18n = new i18nFactory({ ...sails.config.i18n, directory: sails.config.i18n.localesDirectory, extension: ".json" });
                        i18n.setLocale(headers["locale"]);
                        return { ...req, connectionParams: headers, i18n: i18n };
                    }
                },
            });
        }
        catch (error) {
            if (error.locations && error.locations[0].line) {
                typeDefs.split("\n").forEach((item, i) => {
                    if (Math.abs(error.locations[0].line - i) < 10) {
                        console.log(i, `|`, item);
                        if (error.locations[0].line - 1 === i) {
                            console.log("_______________");
                        }
                    }
                });
                console.log(`ERROR LINE: ${error.locations[0].line} `, typeDefs.split("\n", -1)[error.locations[0].line - 1]);
            }
            sails.log.error(JSON.stringify(error));
            throw error;
        }
        server = apolloServer;
        return apolloServer;
    },
};
