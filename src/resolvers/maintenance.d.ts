declare const _default: {
    Query: {
        maintenance: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<import("@webresto/core").MaintenanceRecord>;
        };
    };
};
export default _default;
