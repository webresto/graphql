// const userAuth = sails.config.restographql.authService;
import { JWTAuth } from "../../lib/jwt";
import { Phone } from "@webresto/core/models/User";
// todo: fix types model instance to {%ModelName%}Record for User";
import { Captcha } from "@webresto/core/adapters";
import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter";
import { Message, Action, Response } from "../../types/primitives";
let captchaAdapter = Captcha.getAdapter();

// define UserResponse
interface UserResponse extends Response {
  user: User | undefined;
}


// Saved addresses are written by delivered orders (`UserLocation.remember`),
// never by the storefront: it only picks the default and deletes.
export default {
  Mutation: {
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

          const user = (await UserLocation.findOne({id: payload.locationId})).user as string
          if (user !== auth.userId) throw `User location not found`

          await UserLocation.update({id: payload.locationId}, {isDefault: true}).fetch()
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
          
          await UserLocation.destroy({id: payload.locationId}).fetch()
          return true
        } catch (error) {
          sails.log.error(`GQL > [locationDelete]`, error, payload);
          throw error;
        }
      }
    }
  }
};
