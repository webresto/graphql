"use strict";
// export interface SpendBonus {
//   bonusProgramId: string
//   amount: number
//   adapter: string
//   bonusProgramName: string
// }
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../lib/jwt");
// todo: fix types model instance to {%ModelName%}Record for UserBonusProgram";
exports.default = {
    Query: {
        bonusProgram: {
            def: 'bonusProgramAlived(orderId: String): [BonusProgram]',
            fn: async function (parent, args, context) {
                const orderId = args.orderId;
                try {
                    if (orderId) {
                        const order = await Order.findOne({ id: orderId });
                        if (!order)
                            throw `order not found`;
                    }
                    const data = await BonusProgram.getAvailable();
                    await emitter.emit('graphql-return-bonus-program', orderId, data);
                    return data;
                }
                catch (e) {
                    sails.log.error(e);
                    throw `${JSON.stringify(e)}`;
                }
            }
        }
    },
    Mutation: {
        // Authentication required
        userRegistrationInBonusProgram: {
            def: `#graphql
        userRegistrationInBonusProgram(
          bonusProgramId: String!
        ): UserBonusProgram`,
            fn: async (parent, payload, context) => {
                const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                let adapter = await BonusProgram.getAdapter(payload.bonusProgramId);
                return await UserBonusProgram.registration(auth.userId, adapter.id);
            }
        },
        // Authentication required
        userDeleteInBonusProgram: {
            def: `#graphql
        userDeleteInBonusProgram(
          bonusProgramId: String!
        ): Boolean`,
            fn: async (parent, payload, context) => {
                const auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                let adapter = await BonusProgram.getAdapter(payload.bonusProgramId);
                try {
                    await UserBonusProgram.delete(auth.userId, adapter.id);
                    return true;
                }
                catch (error) {
                    throw `Error deleting user in bonus program`;
                }
            }
        }
    }
};
