declare const _default: {
    Mutation: {
        locationSetIsDefault: {
            def: string;
            fn: (parent: any, payload: {
                locationId: string;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<boolean>;
        };
        locationDelete: {
            def: string;
            fn: (parent: any, payload: {
                locationId: string;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<boolean>;
        };
    };
};
export default _default;
