declare const _default: {
    Query: {
        recommendedForDish: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<any[]>;
        };
        recommendedForOrder: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<any[]>;
        };
    };
};
export default _default;
