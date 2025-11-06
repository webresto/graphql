// export interface SpendBonus {
//   bonusProgramId: string
//   amount: number
//   adapter: string
//   bonusProgramName: string
// }

import { JWTAuth } from "../../lib/jwt";
// todo: fix types model instance to {%ModelName%}Record for UserBonusProgram";

export default {
    Query: {
      bonusProgram: {
            def: 'bonusProgramAlived(orderId: String): [BonusProgram]',
            fn: async function (parent, args, context) {
              const orderId = args.orderId;
              try {
                if (orderId) {
                  const order = await Order.findOne({id: orderId});
                  if(!order) throw `order not found`
                }

                const data = await BonusProgram.getAvailable();
                await emitter.emit('graphql-return-bonus-program', orderId, data);
                return data;
              } catch (e) {
                sails.log.error(e); 
                throw `${JSON.stringify(e)}`
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
        fn: async (
          parent: any,
          payload: { bonusProgramId: string },
          context: { connectionParams: { authorization: string } }
        ): Promise<UserBonusProgram> => {

          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );
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
        fn: async (
          parent: any,
          payload: { bonusProgramId: string },
          context: { connectionParams: { authorization: string } }
        ): Promise<boolean> => {

          const auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );
          let adapter = await BonusProgram.getAdapter(payload.bonusProgramId);
          try {
            await UserBonusProgram.delete(auth.userId, adapter.id);
            return true
          } catch (error) {
            throw `Error deleting user in bonus program`
          }
        }
      }
    }
}
