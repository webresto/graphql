"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@webresto/core/adapters/index");
const graphqlHelper_1 = __importDefault(require("../../lib/graphqlHelper"));
graphqlHelper_1.default.addType(`#graphql
  input AddressInput {
    buildingName: String
    coordinate: CoordinateInput
    streetId: String
    home: String!
    comment: String
    city: String
    street: String!
    housing: String
    index: String
    entrance: String
    floor: String
    apartment: String
    doorphone: String
  }

  input CoordinateInput {
    lon: String!
    lat: String!
  }

  type Delivery {
    """The delivery leg alone, in minutes. Unchanged; the totals below include cooking."""
    deliveryTimeMinutes: Int
    allowed: Boolean!
    cost: Float
    item: String
    message: String!
    deliveryLocationUnrecognized: Boolean
    hasError: Boolean
    """The zone whose terms produced this result, when one matched."""
    zoneId: String
    """Cooking time for this basket. Only products of type dish count."""
    preparationMinutes: Int
    """The whole promise: cooking + the road + the safety margin. One number."""
    totalTimeMinutes: Int
    """Straight-line kilometres from the kitchen, when both coordinates were known."""
    distanceKm: Float
    """How the result was reached: which zone or point matched and why. For operators, not for customers."""
    diagnostics: [String]
    """How the road was estimated: haversine, a provider's name, or none."""
    travelTimeSource: String
  }
`);
exports.default = {
    Query: {
        streets: {
            def: "streets: [Street]",
            fn: async () => {
                try {
                    return await Street.find({ isDeleted: false });
                }
                catch (error) {
                    sails.log.error(`GQL > [streets]`, error, {});
                    throw error;
                }
            },
        },
    },
    Mutation: {
        checkDeliveryAbility: {
            def: "checkDeliveryAbility(address: AddressInput): Delivery",
            fn: async (_parent, args, _context) => {
                try {
                    const adapter = await index_1.Delivery.getAdapter();
                    return await adapter.checkAbility(args.address);
                }
                catch (error) {
                    sails.log.error(`GQL > [checkDeliveryAbility]`, error, args);
                    return {
                        deliveryTimeMinutes: 0,
                        allowed: false,
                        cost: null,
                        item: undefined,
                        message: error,
                        hasError: true,
                    };
                }
            },
        },
    },
};
