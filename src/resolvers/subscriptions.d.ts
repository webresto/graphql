declare const _default: {
    Subscription: {
        order: {
            def: string;
            fn: {
                subscribe: import("apollo-server").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
        message: {
            def: string;
            fn: {
                subscribe: import("apollo-server").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
        action: {
            def: string;
            fn: {
                subscribe: import("apollo-server").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
        maintenance: {
            def: string;
            fn: {
                subscribe: import("apollo-server").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
    };
};
export default _default;
