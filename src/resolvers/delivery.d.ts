import OrderAddress from "@webresto/core/interfaces/OrderAddress";
import { Delivery } from "@webresto/core/interfaces/Delivery";
declare const _default: {
    Query: {
        addressSearch: {
            def: string;
            fn: (_parent: any, args: {
                city: string;
                parent?: string;
                query: string;
            }) => Promise<import("@webresto/core/interfaces/Geo").AddressNode[]>;
        };
        addressPath: {
            def: string;
            fn: (_parent: any, args: {
                id: string;
            }) => Promise<import("@webresto/core/interfaces/Geo").AddressNode[]>;
        };
        addressByCoordinate: {
            def: string;
            fn: (_parent: any, args: {
                lat: number;
                lon: number;
                city: string;
            }) => Promise<OrderAddress | null>;
        };
    };
    Mutation: {
        checkDeliveryAbility: {
            def: string;
            fn: (_parent: any, args: {
                address: OrderAddress;
            }, _context: any) => Promise<Delivery>;
        };
    };
    Delivery: {
        message: (parent: any, _args: unknown, context: any) => any;
    };
    OrderDeliveryState: {
        message: (parent: any, _args: unknown, context: any) => any;
    };
};
export default _default;
