declare const _default: {
    Query: {
        bonusProgram: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core").BonusProgramRecord[]>;
        };
    };
    Mutation: {
        userRegistrationInBonusProgram: {
            def: string;
            fn: (parent: any, payload: {
                bonusProgramId: string;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<UserBonusProgram>;
        };
        userDeleteInBonusProgram: {
            def: string;
            fn: (parent: any, payload: {
                bonusProgramId: string;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<boolean>;
        };
    };
};
export default _default;
