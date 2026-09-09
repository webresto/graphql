import { Delivery as DeliveryAdapter } from "@webresto/core/adapters/index";
import graphqlHelper from "../../lib/graphqlHelper";
import OrderAddress from "@webresto/core/interfaces/Address";
import { AddressRecord } from "@webresto/core/models/Address";
import { Delivery } from "@webresto/core/adapters/delivery/contracts";

graphqlHelper.addType(`#graphql
  """The address of an order: a node of the city catalog plus what no catalog knows."""
  input AddressInput {
    """Deepest catalog node the customer chose. Null when they typed the line themselves."""
    node: String
    """The whole address line. Rebuilt from the node path on save when there is a node."""
    formatted: String
    city: String
    home: String
    housing: String
    apartment: String
    entrance: String
    floor: String
    doorphone: String
    comment: String
    """Set only when the client already knows it. A chosen node carries its own point."""
    coordinate: CoordinateInput
  }

  input CoordinateInput {
    lat: Float!
    lng: Float!
  }

  """One node of a city address catalog. The parent field is the id of the node above, null at the root."""
  type AddressNode {
    id: String
    type: String
    name: String
    parent: String
    point: Json
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

/** A catalog row as the storefront reads it: the parent is an id, never an object. */
function asNode(node: AddressRecord) {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parent: typeof node.parent === "string" ? node.parent : node.parent?.id ?? null,
    point: node.point,
  };
}

export default {
  Query: {
    // What to offer for what the customer has typed. Without `parent` the
    // search starts at the city and only sees types that stand on their own;
    // with one it sees that node's children.
    addressSearch: {
      def: "addressSearch(city: String!, parent: String, query: String!): [AddressNode]",
      fn: async (_parent, args: { city: string; parent?: string; query: string }) => {
        try {
          return (await Address.search(args)).map(asNode);
        } catch (error) {
          sails.log.error(`GQL > [addressSearch]`, error, args);
          throw error;
        }
      },
    },
    // The nodes from the city down to this one, in that order: the chips the
    // storefront shows in front of the input.
    addressPath: {
      def: "addressPath(id: String!): [AddressNode]",
      fn: async (_parent, args: { id: string }) => {
        try {
          return (await Address.path(args.id)).map(asNode);
        } catch (error) {
          sails.log.error(`GQL > [addressPath]`, error, args);
          throw error;
        }
      },
    },
  },
  Mutation: {
    checkDeliveryAbility: {
      def: "checkDeliveryAbility(address: AddressInput): Delivery",
      fn: async (_parent, args: { address: OrderAddress }, _context): Promise<Delivery> => {
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
