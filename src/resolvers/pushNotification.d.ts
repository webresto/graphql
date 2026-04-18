declare const _default: {
    Mutation: {
        registerNotificationToken: {
            def: string;
            fn: (_: any, { token, platform, provider }: {
                token: string;
                platform: string;
                provider: string;
            }, context: any) => Promise<boolean>;
        };
        markNotificationRead: {
            def: string;
            fn: (_: any, { id }: {
                id: string;
            }, context: any) => Promise<boolean>;
        };
    };
};
export default _default;
