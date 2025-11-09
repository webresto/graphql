"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Mutation: {
        dialogBoxAnswerProcess: {
            def: `#graphql
      dialogBoxAnswerProcess(askId: String, answerId: String): Boolean`,
            fn: async function (parent, args, context) {
                try {
                    DialogBox.answerProcess(args.askId, args.answerId);
                    return true;
                }
                catch (error) {
                    throw new Error(error);
                }
            }
        }
    },
};
