import { Action, Message } from "../../types/primitives";
type CheckResponse = {
    order?: Order;
    message: Message;
    action?: Action;
};
import Address from "@webresto/core/interfaces/Address";
import Customer from "@webresto/core/interfaces/Customer";
import { SpendBonus } from "@webresto/core/interfaces/SpendBonus";
interface InputOrderCheckout {
    orderId: string;
    paymentMethodId: string;
    platform?: string;
    selfService?: boolean;
    pickupPointId?: string;
    address?: Address;
    locationId: string;
    customer: Customer;
    date?: string;
    /** ASAP with a ceiling, in minutes. Mutually exclusive with `date`. */
    maxWaitMinutes?: number;
    personsCount?: number;
    comment: string;
    spendBonus: SpendBonus;
    customData: {
        [key: string]: string | number;
    };
}
declare const _default: {
    Query: {
        initCheckout: {
            def: string;
            fn: (_: any, { orderId }: {
                orderId: any;
            }, ctx: any) => Promise<import("@webresto/core/libs/helpers/OrderHelper").InitCheckout>;
        };
    };
    Mutation: {
        checkOrder: {
            def: string;
            fn: (parent: any, args: {
                orderCheckout: InputOrderCheckout;
            }, context: any) => Promise<CheckResponse>;
        };
        sendOrder: {
            def: string;
            fn: (parent: any, args: any, context: any) => Promise<{
                order: import("@webresto/core/models/Order").OrderRecord;
                action: {
                    deviceId: any;
                    type: string;
                    data: {
                        link: string | undefined;
                    };
                };
                message?: undefined;
            } | {
                action?: undefined;
                order: import("@webresto/core/models/Order").OrderRecord;
                message: {
                    type: string;
                    title: any;
                    message: any;
                };
            }>;
        };
    };
};
export default _default;
