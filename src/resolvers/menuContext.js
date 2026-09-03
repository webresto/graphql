"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("@webresto/graphql/lib/graphqlHelper");
/**
 * Which cooking point a menu is being read at, and why.
 *
 * A query of its own rather than fields hung off `menu`, because the answer is
 * about the *request* and not about any group in it: a client needs it before it
 * has a menu at all, to know whether it must ask for an address first.
 *
 * `diagnostics` is for operators and support, never for customers. It says which
 * input decided the point — a requested id, the order's own kitchen, or the
 * installation default — in the same words the server logs use.
 */
(0, graphqlHelper_1.addType)(`type MenuContext {
  """The points stock is read at; a product is in the menu if any of them can sell it. Empty means no point is known, and stock reads as unlimited."""
  placeIds: [String]
  """Which input decided it: requested | order | coordinate | default | none."""
  source: String
  """Whether a point must be known before products can be added to a basket."""
  placeRequired: Boolean
  """Set when a point was required and none could be found: MENU_PLACE_REQUIRED."""
  code: String
  """Why the context ended up like this. For operators, not for customers."""
  diagnostics: [String]
  """The menu mode in force: default | single-place | multi-place-route."""
  mode: String
  """Name of the registered route planner, or null when nothing can route an order across kitchens."""
  routePlanner: String
}`);
exports.default = {
    Query: {
        menuContext: {
            def: "menuContext(orderId: String, cookingPointId: String, lat: Float, lon: Float): MenuContext",
            fn: async (parent, args) => {
                try {
                    // The order is looked up rather than taken on trust: `cookingPoint` is
                    // the whole reason to pass an id, and a client cannot be the source of
                    // it — that is what would let a basket be priced at a kitchen nobody
                    // assigned to it.
                    const order = args.orderId ? await Order.findOne({ id: args.orderId }) : null;
                    // Where the customer is, before there is an order to ask. Both halves
                    // or neither: half a coordinate is not a place.
                    const coordinate = typeof args.lat === "number" && typeof args.lon === "number"
                        ? { lat: args.lat, lng: args.lon }
                        : null;
                    const adapter = await Menu.getAdapter();
                    const context = await adapter.resolveContext({
                        order,
                        cookingPointId: args.cookingPointId ?? null,
                        coordinate,
                    });
                    return { ...context, mode: adapter.name, routePlanner: Menu.routePlanner()?.name ?? null };
                }
                catch (error) {
                    sails.log.error(`GQL > [menuContext]`, error, args);
                    throw error;
                }
            },
        },
    },
};
