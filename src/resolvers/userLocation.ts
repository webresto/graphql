import { Adapter } from "@webresto/core/adapters/index";
import OrderAddress from "@webresto/core/interfaces/OrderAddress";
import { JWTAuth } from "../../lib/jwt";

// Saved addresses are written by placed orders (`UserLocation.remember`) and
// by the customer in the profile (locationCreate); the storefront also picks
// the default and deletes. Those two look a location up by id and the caller
// together, so an id of someone else's location is refused like one that does
// not exist.
export default {
  Mutation: {
    // Authentication required. True - kept; false - the customer has this line already
    locationCreate: {
      def: `#graphql
      locationCreate(
        address: AddressInput!
      ): Boolean`,
      fn: async (
        parent: any,
        payload: { address: OrderAddress },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          // the line an order to this address would keep: rebuilt from the catalog node, as Order.check does
          const { formatted } = await (await Adapter.get("geo")).describe(payload.address);
          return await UserLocation.remember(auth.userId, { ...payload.address, formatted });
        } catch (error) {
          sails.log.error(`GQL > [locationCreate]`, error, payload);
          throw error;
        }
      }
    },
    // Authentication required
    locationSetIsDefault: {
      def: `#graphql
      locationSetIsDefault(
        locationId: String!
      ): Boolean`,
      fn: async (
        parent: any,
        payload: { locationId: string },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          await UserLocation.setDefault(auth.userId, payload.locationId)
          return true
        } catch (error) {
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
      fn: async (
        parent: any,
        payload: { locationId: string },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {
        try {
          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          const [location] = await UserLocation.destroy({id: payload.locationId, user: auth.userId}).fetch()
          if (!location) throw `User location not found`
          return true
        } catch (error) {
          sails.log.error(`GQL > [locationDelete]`, error, payload);
          throw error;
        }
      }
    }
  }
};
