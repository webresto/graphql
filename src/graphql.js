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
const product_availability_1 = require("@webresto/core/lib/menu/product-availability");
const index_1 = require("@webresto/core/adapters/index");
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
/**
 * What a storefront shows changed (subscription `storefrontChanged`): the changes of a moment go out together, one
 * message per kind - an RMS sync touches hundreds of products, a storefront asks them again once. No points - every
 * point, and it stays so for the message.
 */
const storefrontChanges = new Map();
let storefrontTimer = null;
function publishStorefrontChange(kind, dishIds = [], placeIds = null, delay = 300) {
    let pending = storefrontChanges.get(kind);
    if (!pending)
        storefrontChanges.set(kind, (pending = { dishIds: new Set(), placeIds: new Set() }));
    dishIds.forEach((id) => pending.dishIds.add(id));
    if (!placeIds)
        pending.placeIds = null;
    else
        placeIds.forEach((id) => pending.placeIds?.add(id));
    if (storefrontTimer)
        return;
    storefrontTimer = setTimeout(() => {
        storefrontTimer = null;
        for (const [kind, { dishIds, placeIds }] of storefrontChanges) {
            pubsub.publish("storefront-changed", { kind, dishIds: dishIds.size ? [...dishIds] : null, placeIds: placeIds ? [...placeIds] : null });
        }
        storefrontChanges.clear();
    }, delay);
}
/** an association as the record holds it: its id, or the populated record */
const idOf = (value) => String(value && typeof value === "object" ? value.id : value);
/**
 * Core names a discount `flat` or `percentage`; storefronts read `FIXED` or
 * `PERCENT` (`DiscountType` of `@webresto/ng-gql`). Anything else is no
 * discount a storefront could draw.
 */
function storefrontDiscountType(type) {
    if (type === "flat")
        return "FIXED";
    if (type === "percentage")
        return "PERCENT";
    return null;
}
const AdditionalResolvers = {};
/**
 * Best-effort client IP: trust the first hop of X-Forwarded-For (set by our own proxy), fall
 * back to X-Real-IP, then to the raw socket. Used for UserDevice.lastIP and the auth audit trail
 * (review1 §2 "IP не прокидывается") — never authoritative, but strictly better than a literal
 * "0.0.0.0" that made every login look like it came from nowhere.
 */
function resolveIp(headers, socket) {
    const forwarded = headers?.["x-forwarded-for"];
    if (forwarded)
        return String(forwarded).split(",")[0].trim();
    const real = headers?.["x-real-ip"];
    if (real)
        return String(real).trim();
    return socket?.remoteAddress ?? "";
}
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
    type Message {
      id: String
      title: String
      type: String
      message: String
      """The code of the refusal of checkOrder (Order.check of the core: 1 - no name, 2 - no phone, 5 - no address, 15 - the date is past…); the text is translated, the code is what a storefront can branch on. Null otherwise."""
      code: Int
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
         * The promotion on a dish, as the menu shows it: `salePrice` is the price of
         * one after the promotion the basket would apply to a line of it,
         * `discountAmount` and `discountType` are that promotion's (a percentage or
         * an amount of money). All three null when no public promotion takes it.
         *
         * Asked per dish wherever a dish leaves the API — the menu, a group's
         * dishes, recommendations, a modifier's option, a basket line — so no list
         * can forget to. Core's `displayDish` answers; it writes the fields, so it
         * gets a copy, and one answer serves all three fields of the same dish.
         */
        helper.addCustomField("Dish", "discountAmount: Float");
        helper.addCustomField("Dish", "discountType: String");
        helper.addCustomField("Dish", "salePrice: Float");
        helper.addCustomField("Group", "discount: String");
        const shownDishes = new WeakMap();
        const shownDish = (dish) => {
            if (!shownDishes.has(dish))
                shownDishes.set(dish, index_1.Adapter.getPromotionAdapter().displayDish({ ...dish }));
            return shownDishes.get(dish);
        };
        helper.addResolvers({
            Dish: {
                salePrice: (parent) => shownDish(parent)?.salePrice ?? null,
                discountAmount: (parent) => shownDish(parent)?.discountAmount ?? null,
                discountType: (parent) => storefrontDiscountType(shownDish(parent)?.discountType),
            },
            // A line's discount is the same kind of thing and reads the same words.
            OrderDish: {
                discountType: (parent) => storefrontDiscountType(parent?.discountType),
            },
        });
        /**
         * Stock of a product.
         *
         * It stopped being a column of `dish` and became a property of the pair
         * "product + cooking point", so it is computed per request instead of read
         * off the record. The field itself stays: storefronts read it to grey out a
         * product, and `-1` still means unlimited while `0` still means stopped.
         *
         * Read in the context the dish itself was read in — the order the query
         * named — so a product is quoted the stock of the kitchens that decided
         * whether it is in the list at all: as many as the basket will take.
         */
        helper.addCustomField("Dish", "balance: Int");
        helper.addResolvers({
            Dish: {
                balance: async (parent) => {
                    return (0, product_availability_1.getEffectiveBalanceAcross)(String(parent?.id), await helper.menuContextOf(parent));
                },
            },
        });
        /**
         * Types of complex order fields
         */
        helper.addType(`#graphql
      type OrderDeliveryState {
        "The delivery leg alone, in minutes; for a zone, its minimum delivery time. The totals below include cooking."
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
        "That zone's name"
        zoneName: String
        "That zone's minimum order total. Null when it sets none or no zone matched"
        minOrderTotal: Float
        "That zone delivers free from this total. Null when it sets none or no zone matched"
        freeDeliveryFrom: Float
        "What that zone charges for delivery, whatever it decided about this basket; cost is what this basket pays. A delivery product's price when the zone charges one; 0 is free"
        deliveryCost: Float
        "Whether that zone took orders when the order was last counted, by zoneWorktime"
        zoneOpen: Boolean
        "When that zone takes orders. Null: always"
        zoneWorktime: Json
        "What the operator wrote about that zone, untranslated. Null: nothing"
        zoneDescription: String
        "Cooking time for this basket. Only products of type dish count."
        preparationMinutes: Int
        "The whole promise: cooking + the road + the safety margin. One number."
        totalTimeMinutes: Int
        "Straight-line kilometres from the kitchen, when both coordinates were known"
        distanceKm: Float
        "How the road was estimated: haversine, a provider name, or none"
        travelTimeSource: String
        "Why the order got this tariff and this time: the zone, the point source. For operators, not for customers"
        diagnostics: [String]
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
        // what a storefront shows: a product (an option of products - the menu, the products that have it are not known
        // here) and its photos, the stock and the stops of a product at a point, the groups, the promotions, the points,
        // the cities, the settings, the delivery zones, the ways to pay; the hours of a point, a zone, a promotion turning
        // them come as the same events (lib/hours-sweep of core)
        const productChanged = (dish) => (dish.modifier ? publishStorefrontChange("menu") : publishStorefrontChange("dishes", [dish.id]));
        emitter.on("core:product-after-create", "graphql", productChanged);
        emitter.on("core:product-after-update", "graphql", productChanged);
        emitter.on("core:product-after-destroy", "graphql", productChanged);
        emitter.on("core:selected-media-file-changed", "graphql", async (row) => {
            if (row.group)
                return publishStorefrontChange("menu");
            if (!row.dish)
                return;
            // a product deleted with its photos is not here any more: a storefront drops it as it does any product it asks
            const dish = await Dish.findOne({ id: idOf(row.dish) });
            productChanged(dish ?? { id: idOf(row.dish) });
        });
        emitter.on("core:dish-place-changed", "graphql", (row) => publishStorefrontChange("dishes", [idOf(row.dish)], [idOf(row.place)]));
        emitter.on("core:group-after-create", "graphql", () => publishStorefrontChange("menu"));
        emitter.on("core:group-after-update", "graphql", () => publishStorefrontChange("menu"));
        emitter.on("core:group-after-destroy", "graphql", () => publishStorefrontChange("menu"));
        emitter.on("core:promotion-changed", "graphql", () => publishStorefrontChange("menu"));
        emitter.on("core:delivery-zone-changed", "graphql", () => publishStorefrontChange("zones"));
        emitter.on("core:payment-method-changed", "graphql", () => publishStorefrontChange("payments"));
        emitter.on("core:place-changed", "graphql", (place) => {
            publishStorefrontChange("menu", [], [place.id]);
            publishStorefrontChange("places");
        });
        emitter.on("core:city-changed", "graphql", () => publishStorefrontChange("cities"));
        emitter.on("core:settings-changed", "graphql", () => publishStorefrontChange("settings"));
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
                            connectionParams["IP"] = resolveIp(webSocket?.upgradeReq?.headers, webSocket?.upgradeReq?.socket ?? webSocket?.upgradeReq?.connection);
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
                        headers["IP"] = resolveIp(headers, req?.socket ?? req?.connection);
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
