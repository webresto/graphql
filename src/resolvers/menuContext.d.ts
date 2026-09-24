declare const _default: {
    Query: {
        menuContext: {
            def: string;
            fn: (parent: any, args: {
                orderId?: string;
                cookingPointId?: string;
                lat?: number;
                lon?: number;
            }) => Promise<any>;
        };
    };
};
export default _default;
