import OrderAddress from "@webresto/core/interfaces/Address";
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
                type: "alley" | "building" | "commune" | "district" | "entrance" | "house" | "place" | "quarter" | "range" | "street" | "unit" | "ward";
                name: string;
                parent: string | null;
                point: import("@webresto/core/lib/address").AddressPoint | null;
                ancestors: string[];
            }[]>;
        };
        addressPath: {
            def: string;
            fn: (_parent: any, args: {
                id: string;
            }) => Promise<{
                id: string;
                type: "alley" | "building" | "commune" | "district" | "entrance" | "house" | "place" | "quarter" | "range" | "street" | "unit" | "ward";
                name: string;
                parent: string | null;
                point: import("@webresto/core/lib/address").AddressPoint | null;
                ancestors: string[];
            }[]>;
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
