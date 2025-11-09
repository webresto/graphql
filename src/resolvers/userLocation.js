"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const userAuth = sails.config.restographql.authService;
const jwt_1 = require("../../lib/jwt");
// todo: fix types model instance to {%ModelName%}Record for User";
const adapters_1 = require("@webresto/core/adapters");
let captchaAdapter = adapters_1.Captcha.getAdapter();
const graphqlHelper_1 = require("../../lib/graphqlHelper");
graphqlHelper_1.default.addType(`#graphql    
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
exports.default = {
    Mutation: {
        // Authentication required
        locationCreate: {
            def: `#graphql
      locationCreate(
        location: InputLocation!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                if (!payload.location.streetId && !payload.location.street)
                    throw 'streetId or street are required';
                const userLocation = {
                    ...payload.location,
                    ...{ street: payload.location.streetId }
                };
                await UserLocation.create({ ...userLocation, user: auth.userId }).fetch();
                return true;
            }
        },
        // Authentication required
        locationSetIsDefault: {
            def: `#graphql
      locationSetIsDefault(
        locationId: String!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                const user = (await UserLocation.findOne({ id: payload.locationId })).user;
                if (user !== auth.userId)
                    throw `User location not found`;
                await UserLocation.update({ id: payload.locationId }, { isDefault: true }).fetch();
                return true;
            }
        },
        // Authentication required
        locationDelete: {
            def: `#graphql
      locationDelete(
        locationId: String!
      ): Boolean`,
            fn: async (parent, payload, context) => {
                const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                await UserLocation.destroy({ id: payload.locationId }).fetch();
                return true;
            }
        }
    }
};
