declare const _default: {
    Mutation: {
        dialogBoxAnswerProcess: {
            def: string;
            fn: (parent: any, args: {
                askId: string;
                answerId: string;
            }, context: any) => Promise<boolean>;
        };
    };
};
export default _default;
