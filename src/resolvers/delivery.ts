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

/** A catalog row as the storefront reads it: the parent is an id, never an object. */
function asNode(node: AddressRecord, ancestors: string[] = []) {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parent: typeof node.parent === "string" ? node.parent : node.parent?.id ?? null,
    point: node.point,
    ancestors,
  };
}

function parentOf(node: AddressRecord): string | null {
  return typeof node.parent === "string" ? node.parent : node.parent?.id ?? null;
}

/**
 * The names above a suggestion, so two streets called "Ленина" can be told
 * apart in the list.
 *
 * Read per suggestion rather than stored on the row: there are at most twenty of
 * them and the graph is shallow, which is cheaper than an `ancestors` column
 * that has to be rewritten every time a district is renamed. The path of one
 * parent serves every child in the list, so it is read once.
 */
async function ancestorsOf(node: AddressRecord, cache: Map<string, string[]>): Promise<string[]> {
  const parent = parentOf(node);
  if (!parent) return [];

  const known = cache.get(parent);
  if (known) return known;

  const names = (await Address.path(parent)).map((step) => step.name);
  cache.set(parent, names);
  return names;
}

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
          const found = await Address.search(args);
          const paths = new Map<string, string[]>();
          return await Promise.all(found.map(async (node) => asNode(node, await ancestorsOf(node, paths))));
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
          // The path is its own answer here: everything before a node is above it.
          const path = await Address.path(args.id);
          return path.map((node, at) => asNode(node, path.slice(0, at).map((step) => step.name)));
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
  // `message` is a key on both of the types that carry one, so is the resolver.
  Delivery: {
    message: (parent: any, _args: unknown, context: any) => translateDeliveryMessage(parent, context),
  },
  OrderDeliveryState: {
    message: (parent: any, _args: unknown, context: any) => translateDeliveryMessage(parent, context),
  },
};
