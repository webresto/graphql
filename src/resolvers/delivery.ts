import { Adapter } from "@webresto/core/adapters/index";
import graphqlHelper from "../../lib/graphqlHelper";
import OrderAddress from "@webresto/core/interfaces/OrderAddress";
import { Delivery } from "@webresto/core/interfaces/Delivery";
import { isValidCoordinate } from "@webresto/core/lib/address/coordinate";

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
    lon: Float!
  }

  """An address as an order carries it: a catalog node with a house number, or free text."""
  type OrderAddress {
    """Catalog node. Null for free text."""
    node: String
    """The address line. For free text, without the house number: that is in home."""
    formatted: String
    home: String
    """The node's point, or the requested one when the node has none."""
    coordinate: Json
  }

  """One node of a city address catalog. The parent field is the id of the node above, null at the root."""
  type AddressNode {
    id: String
    type: String
    name: String
    parent: String
    point: Json
    """Names of the nodes above this one, from the root down. Empty for a node the city holds directly."""
    ancestors: [String]
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

/**
 * What the customer reads, in the language they asked for.
 *
 * Core answers with a key, because `sails.__` there knows the installation's
 * default locale and not the reader's. The request does know, so the last step
 * before the wire is where the translation belongs — the same place the
 * checkout refusals are translated, and out of the same dictionary.
 *
 * Line by line, because a zone with no description of its own is described by
 * several sentences at once; each takes as many arguments as it has `%s`.
 */
function translateDeliveryMessage(delivery: any, context: any) {
  // Anything that is not a key is passed through: an operator's own text, and
  // the Error the catch below puts here.
  const message = delivery?.message;
  const i18n = context?.i18n;
  if (typeof message !== "string" || !message || typeof i18n?.__ !== "function") return message;

  const args = Array.isArray(delivery?.messageArgs) ? [...delivery.messageArgs] : [];
  return message
    .split("\n")
    .map((line: string) => {
      const placeholders = line.match(/%s/g)?.length ?? 0;
      return placeholders ? i18n.__(line, ...args.splice(0, placeholders)) : i18n.__(line);
    })
    .join("\n");
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
          return await (await Adapter.get("geo")).search(args);
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
          return await (await Adapter.get("geo")).path(args.id);
        } catch (error) {
          sails.log.error(`GQL > [addressPath]`, error, args);
          throw error;
        }
      },
    },
    // The address at the customer's coordinate: the storefront's "detect my
    // location". `city` is the catalog to match against.
    addressByCoordinate: {
      def: "addressByCoordinate(lat: Float!, lon: Float!, city: String!): OrderAddress",
      fn: async (_parent, args: { lat: number; lon: number; city: string }): Promise<OrderAddress | null> => {
        try {
          const coordinate = { lat: args.lat, lon: args.lon };
          if (!isValidCoordinate(coordinate)) throw new Error("Coordinate is out of range");
          return await (await Adapter.get("geo")).addressByCoordinate(coordinate, args.city);
        } catch (error) {
          sails.log.error(`GQL > [addressByCoordinate]`, error, args);
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
          const adapter = await Adapter.get("delivery");
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
  // `message` is a key on both of the types that carry one, so is the resolver.
  Delivery: {
    message: (parent: any, _args: unknown, context: any) => translateDeliveryMessage(parent, context),
  },
  OrderDeliveryState: {
    message: (parent: any, _args: unknown, context: any) => translateDeliveryMessage(parent, context),
  },
};
