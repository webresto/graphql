interface InputLocation {
    street: string;
    streetId: string;
    home: string;
    name?: string;
    city?: string;
    housing?: string;
    isDefault?: boolean;
    index?: string;
    entrance?: string;
    floor?: string;
    apartment?: string;
    doorphone?: string;
    comment?: string;
    customData?: {
        [key: string]: string | boolean | number;
    };
}
declare const _default: {
    Mutation: {
        locationCreate: {
            def: string;
            fn: (parent: any, payload: {
                location: InputLocation;
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
