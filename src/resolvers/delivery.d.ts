import OrderAddress from "@webresto/core/interfaces/OrderAddress";
import { Delivery } from "@webresto/core/adapters/delivery/contracts";
declare const _default: {
    Query: {
        addressSearch: {
            def: string;
            fn: (_parent: any, args: {
                city: string;
                parent?: string;
                query: string;
            }) => Promise<{
                id: string;
                type: string;
                name: string;
                parent: string | null;
                point: import("@webresto/core/interfaces/Geo").AddressPoint | null;
                ancestors: string[];
            }[]>;
        };
        addressPath: {
            def: string;
            fn: (_parent: any, args: {
                id: string;
            }) => Promise<{
                id: string;
                type: string;
                name: string;
                parent: string | null;
                point: import("@webresto/core/interfaces/Geo").AddressPoint | null;
                ancestors: string[];
            }[]>;
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
