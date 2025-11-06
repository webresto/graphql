// const userAuth = sails.config.restographql.authService;
import { JWTAuth } from "../../lib/jwt";
import { Phone } from "@webresto/core/models/User";
// todo: fix types model instance to {%ModelName%}Record for User";
import { Captcha } from "@webresto/core/adapters";
import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter";
import { Message, Action, Response } from "../../types/primitives";
let captchaAdapter = Captcha.getAdapter();

import graphqlHelper from "../../lib/graphqlHelper";

// define UserResponse
interface UserResponse extends Response {
  user: User | undefined;
}


interface InputLocation {
  street: string
  streetId: string
  home: string
  name?: string
  city?: string
  housing?: string
  isDefault?: boolean
  index?: string
  entrance?: string
  floor?: string
  apartment?: string
  doorphone?: string
  comment?: string
  customData?: {
    [key: string]: string | boolean | number;
  }
}

graphqlHelper.addType(`#graphql    
  input InputLocation {
    street: String
    streetId: String
    home: String!
    name: String
    city: String
    housing: String
    isDefault: Boolean
    index: String
    entrance: String
    floor: String
    apartment: String
    doorphone: String
    comment: String
    customFields: Json
  } 
  `);

export default {
  Mutation: {
    // Authentication required
    locationCreate: {
      def: `#graphql
      locationCreate(
        location: InputLocation!
      ): Boolean`,
      fn: async (
        parent: any,
        payload: { location: InputLocation },
        context: { connectionParams: { authorization: string } }
      ): Promise<boolean> => {
        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );
        
        if (!payload.location.streetId && !payload.location.street) throw 'streetId or street are required'

        const userLocation = {
          ...payload.location,
          ...{street: payload.location.streetId}
        }
        await UserLocation.create({...userLocation, user: auth.userId}).fetch()
        return true
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
        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );

        const user = (await UserLocation.findOne({id: payload.locationId})).user as string
        if (user !== auth.userId) throw `User location not found`

        await UserLocation.update({id: payload.locationId}, {isDefault: true}).fetch()
        return true
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
        const auth = await JWTAuth.verify(
          context.connectionParams.authorization
        );
        
        await UserLocation.destroy({id: payload.locationId}).fetch()
        return true
      }
    }
  }
};
