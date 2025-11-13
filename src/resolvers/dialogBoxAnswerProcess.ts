import * as eventHelper from "../../lib/eventHelper";
import { Action, Message } from "../../types/primitives";


export default {
  Mutation: {
    dialogBoxAnswerProcess: {
      def: `#graphql
      dialogBoxAnswerProcess(askId: String, answerId: String): Boolean`,
      fn: async function (parent, args: { askId: string, answerId:string }, context): Promise<boolean> {
        try {
          DialogBox.answerProcess(args.askId, args.answerId);
          return true 
        } catch (error) {
          sails.log.error(`GQL > [dialogBoxAnswerProcess]`, error, args);
          throw new Error(error);
        }
      }
    }
  },
}
