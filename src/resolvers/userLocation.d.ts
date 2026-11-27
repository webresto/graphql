import OrderAddress from "@webresto/core/interfaces/OrderAddress";
declare const _default: {
    Mutation: {
        locationCreate: {
            def: string;
            fn: (parent: any, payload: {
                address: OrderAddress;
            }, context: {
                connectionParams: {
                    authorization: string;
                };
            }) => Promise<boolean>;
        };
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
