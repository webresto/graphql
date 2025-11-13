import { Delivery as DeliveryAdapter } from "@webresto/core/adapters/index";
import graphqlHelper from "../../lib/graphqlHelper";
import Address from "@webresto/core/interfaces/Address";
import { Delivery } from "@webresto/core/adapters/delivery/DeliveryAdapter";

graphqlHelper.addType(`#graphql
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

export default {
  Query: {
    streets: {
      def: "streets: [Street]",
      fn: async () => {
        try {
          return await Street.find({ isDeleted: false });
        } catch (error) {
          sails.log.error(`GQL > [streets]`, error, {});
          throw error;
        }
      },
    },
  },
  Mutation: {
    checkDeliveryAbility: {
      def: "checkDeliveryAbility(address: AddressInput): Delivery",
      fn: async (_parent, args: { address: Address }, _context): Promise<Delivery> => {
        try {
          const adapter = await DeliveryAdapter.getAdapter();
          return await adapter.checkAbility(args.address);
        } catch (error) {
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
