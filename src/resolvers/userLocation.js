"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../lib/jwt");
// Saved addresses are written by delivered orders (`UserLocation.remember`),
// never by the storefront: it only picks the default and deletes. Both look a
// location up by id and the caller together, so an id of someone else's
// location is refused like one that does not exist.
exports.default = {
    Mutation: {
        // Authentication required
        locationSetIsDefault: {
            def: `#graphql
      locationSetIsDefault(
        locationId: String!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    await UserLocation.setDefault(auth.userId, payload.locationId);
                    return true;
                }
                catch (error) {
                    sails.log.error(`GQL > [locationSetIsDefault]`, error, payload);
                    throw error;
                }
            }
        },
        // Authentication required
        locationDelete: {
            def: `#graphql
      locationDelete(
        locationId: String!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                try {
                    const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    const [location] = await UserLocation.destroy({ id: payload.locationId, user: auth.userId }).fetch();
                    if (!location)
                        throw `User location not found`;
                    return true;
                }
                catch (error) {
                    sails.log.error(`GQL > [locationDelete]`, error, payload);
                    throw error;
                }
            }
        }
    }
};
