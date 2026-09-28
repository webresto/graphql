"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("@webresto/graphql/lib/graphqlHelper");
(0, graphqlHelper_1.addType)(`type PickupPoint {
  id: String
  title: String
  address: String
  order: Int
  enable: Boolean
  worktime: Json
  active: Boolean
  phone: String
  """Takes pickup orders: the customer collects and leaves."""
  isPickupPoint: Boolean
  """Has a room to eat in: takes dine-in orders."""
  hasDiningArea: Boolean
  """City this point is listed in."""
  city: String
  coordinate: Json
}`);
exports.default = {
    Query: {
        pickuppoints: {
            def: "pickuppoints: [PickupPoint]",
            fn: async () => {
                try {
                    // Both kinds of "the customer comes to us": the storefront
                    // narrows the list by the flags, which is why they are on the
                    // type. Splitting this into two queries would only make the
                    // storefront ask twice for one list.
                    let result = await Place.find({
                        enable: true,
                        or: [{ isPickupPoint: true }, { hasDiningArea: true }],
                    });
                    return result;
                }
                catch (error) {
                    sails.log.error(`GQL > [pickupPoint]`, error, {});
                    throw error;
                }
            }
        }
    }
};
