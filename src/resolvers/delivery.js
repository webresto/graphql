"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@webresto/core/adapters/index");
const graphqlHelper_1 = require("../../lib/graphqlHelper");
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
    deliveryTimeMinutes: Int
    allowed: Boolean!
    cost: Float
    item: String
    message: String!
    deliveryLocationUnrecognized: Boolean
    hasError: Boolean
  }
`);
exports.default = {
    Query: {
        streets: {
            def: "streets: [Street]",
            fn: async () => {
                return await Street.find({ isDeleted: false });
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
