declare const _default: {
    Query: {
        paymentMethod: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core").PaymentMethodRecord[]>;
        };
    };
};
export default _default;
