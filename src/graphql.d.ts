import { ApolloServer } from "apollo-server-express";
import { PubSub } from "apollo-server";
declare const _default: {
    getPubsub: () => PubSub;
    getServer: () => ApolloServer;
    addAdditionalResolver: (resolver: any) => void;
    init: () => Promise<ApolloServer>;
};
export default _default;
