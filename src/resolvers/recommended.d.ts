declare const _default: {
    Query: {
        recommendedForDish: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core").DishRecord[]>;
        };
        recommendedForOrder: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core").DishRecord[]>;
        };
    };
};
export default _default;
