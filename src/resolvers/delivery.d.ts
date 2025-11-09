import Address from "@webresto/core/interfaces/Address";
import { Delivery } from "@webresto/core/adapters/delivery/DeliveryAdapter";
declare const _default: {
    Query: {
        streets: {
            def: string;
            fn: () => Promise<import("@webresto/core").StreetRecord[]>;
        };
    };
    Mutation: {
        checkDeliveryAbility: {
            def: string;
            fn: (_parent: any, args: {
                address: Address;
            }, _context: any) => Promise<Delivery>;
        };
    };
};
export default _default;
