"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const userAuth = sails.config.restographql.authService;
const jwt_1 = require("../../lib/jwt");
// todo: fix types model instance to {%ModelName%}Record for User";
const adapters_1 = require("@webresto/core/adapters");
let captchaAdapter = adapters_1.Captcha.getAdapter();
// Saved addresses are written by delivered orders (`UserLocation.remember`),
// never by the storefront: it only picks the default and deletes.
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
                    const user = (await UserLocation.findOne({ id: payload.locationId })).user;
                    if (user !== auth.userId)
                        throw `User location not found`;
                    await UserLocation.update({ id: payload.locationId }, { isDefault: true }).fetch();
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
                    await UserLocation.destroy({ id: payload.locationId }).fetch();
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
