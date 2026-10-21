"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("../../lib/graphqlHelper");
(0, graphqlHelper_1.addType)(`#graphql
"""
What a storefront shows changed on the server - a signal, not the data: the storefront asks the changed data again in
its own context (the kitchen of its order, its language); one message cannot carry the menu of every visitor.
"""
type StorefrontChange {
  """
  dishes - the products of dishIds: their own fields and photos, their stock and stops at placeIds, deleted;
  menu - the whole menu: the groups, the promotions, the options of products, a point (opened or closed by its hours too);
  places - the points; cities - the cities; settings - the settings of the restaurant;
  zones - the delivery zones (opened or closed by their hours too): the terms of an address; payments - the ways to pay
  """
  kind: String!
  "the products of a change of the kind dishes"
  dishIds: [String!]
  "the points concerned; none - every one"
  placeIds: [String!]
}
`);
exports.default = {
    Subscription: {
        storefrontChanged: {
            def: `#graphql
      "What a storefront shows changed: a signal to ask it again; the changes of a moment come together, one message per kind"
      storefrontChanged: StorefrontChange`,
            fn: {
                subscribe: (rootValue, args, context) => context.pubsub.asyncIterator("storefront-changed"),
                resolve: (payload) => payload,
            },
        },
    },
};
