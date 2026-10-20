import { addType } from "../../lib/graphqlHelper";

addType(`#graphql
"""
What a storefront shows changed on the server - a signal, not the data: the storefront asks the changed data again in
its own context (the kitchen of its order, its language); one message cannot carry the menu of every visitor.
"""
type StorefrontChange {
  """
  dishes - the products of dishIds: their own fields, or their stock and stops at placeIds;
  menu - the whole menu: the groups, the promotions, the options of products, a point;
  places - the points; cities - the cities; settings - the settings of the restaurant
  """
  kind: String!
  "the products of a change of the kind dishes"
  dishIds: [String!]
  "the points concerned; none - every one"
  placeIds: [String!]
}
`);

export default {
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
