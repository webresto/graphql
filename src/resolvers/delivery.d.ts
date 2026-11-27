import OrderAddress from "@webresto/core/interfaces/OrderAddress";
import { Delivery } from "@webresto/core/interfaces/Delivery";
/**
 * What the customer reads, in the language they asked for.
 *
 * Core answers with a key, because `sails.__` there knows the installation's
 * default locale and not the reader's. The request does know, so the last step
 * before the wire is where the translation belongs — the same place the
 * checkout refusals are translated, and out of the same dictionary.
 *
 * Line by line, because a zone with no description of its own is described by
 * several sentences at once; each takes as many arguments as it has `%s`.
 */
export declare function translateDeliveryMessage(delivery: any, context: any): any;
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
