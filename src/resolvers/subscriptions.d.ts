/**
 * The `order-changed` event carries the order record exactly as waterline
 * handed it over: associations in it are identifiers, not objects. Sending it
 * to a subscriber as is means sending a `pickupPoint` of nothing but nulls,
 * because GraphQL resolves the fields of the type against a string. The
 * storefront merges the pushed order over its own, and the chosen place
 * disappears a second after any edit of the order. So the subscription answers
 * with the same order the query does — `Order.populate`.
 */
declare const _default: {
    Subscription: {
        orders: {
            def: string;
            fn: {
                subscribe: import("graphql-subscriptions").ResolverFn;
                resolve: (payload: any) => Promise<{
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    id?: string | undefined;
                    shortId?: string | undefined;
                    orderedAt?: number | undefined;
                    completedAt?: number | undefined;
                    state?: string | undefined;
                    concept?: string[] | undefined;
                    isMixedConcept?: boolean | undefined;
                    dishes?: number[] | import("@webresto/core").OrderDishRecord[] | undefined;
                    paymentMethod?: string | import("@webresto/core").PaymentMethodRecord | undefined;
                    paymentMethodTitle?: string | undefined;
                    paid?: boolean | undefined;
                    isPaymentPromise?: boolean | undefined;
                    promotionState?: import("@webresto/core").PromotionState[] | undefined;
                    promotionErrors?: object | object[] | undefined;
                    promotionCode?: string | import("@webresto/core/models/PromotionCode").PromotionCodeRecord | undefined;
                    promotionCodeDescription?: string | undefined;
                    promotionCodeString?: string | undefined;
                    promotionFlatDiscount?: number | undefined;
                    promotionDelivery?: import("@webresto/core/adapters/delivery/contracts").Delivery | undefined;
                    promotionCodeCheckValidTill?: string | undefined;
                    promotionUnorderable?: boolean | undefined;
                    isPromoting?: boolean | undefined;
                    dishesCount?: number | undefined;
                    uniqueDishes?: number | undefined;
                    modifiers?: any;
                    customer?: import("@webresto/core/interfaces/Customer").default | undefined;
                    address?: import("@webresto/core/interfaces/OrderAddress").default | undefined;
                    comment?: string | undefined;
                    personsCount?: string | undefined;
                    date?: string | undefined;
                    problem?: boolean | undefined;
                    rmsDelivered?: boolean | undefined;
                    rmsId?: string | undefined;
                    rmsOrderNumber?: string | undefined;
                    rmsOrderData?: any;
                    rmsDeliveryDate?: string | undefined;
                    rmsErrorMessage?: string | undefined;
                    rmsErrorCode?: string | undefined;
                    rmsStatusCode?: string | undefined;
                    rmsOrderStatus?: string | undefined;
                    pickupPoint?: string | import("@webresto/core").PlaceRecord | undefined;
                    cookingPoints?: string[] | undefined;
                    maxWaitMinutes?: number | undefined;
                    serviceType?: "delivery" | "dine-in" | "pickup" | undefined;
                    delivery?: import("@webresto/core/adapters/delivery/contracts").Delivery | null | undefined;
                    deliveryDescription?: string | undefined;
                    message?: string | undefined;
                    deliveryItem?: string | import("@webresto/core").DishRecord | undefined;
                    deliveryCost?: number | undefined;
                    totalWeight?: number | undefined;
                    trifleFrom?: number | undefined;
                    bonusesTotal?: number | undefined;
                    spendBonus?: import("@webresto/core/interfaces/SpendBonus").SpendBonus | undefined;
                    total?: number | undefined;
                    basketTotal?: number | undefined;
                    orderTotal?: number | undefined;
                    discountTotal?: number | undefined;
                    orderDate?: string | undefined;
                    tag?: string | undefined;
                    deviceId?: string | undefined;
                    orderedOnPlatform?: string | undefined;
                    nonce?: number | undefined;
                    hash?: string | undefined;
                    user?: string | import("@webresto/core").UserRecord | undefined;
                    customData?: any;
                    logs?: import("@webresto/core").OrderLogEntry[] | undefined;
                }>;
            };
        };
        order: {
            def: string;
            fn: {
                subscribe: import("graphql-subscriptions").ResolverFn;
                resolve: (payload: any) => Promise<{
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    id?: string | undefined;
                    shortId?: string | undefined;
                    orderedAt?: number | undefined;
                    completedAt?: number | undefined;
                    state?: string | undefined;
                    concept?: string[] | undefined;
                    isMixedConcept?: boolean | undefined;
                    dishes?: number[] | import("@webresto/core").OrderDishRecord[] | undefined;
                    paymentMethod?: string | import("@webresto/core").PaymentMethodRecord | undefined;
                    paymentMethodTitle?: string | undefined;
                    paid?: boolean | undefined;
                    isPaymentPromise?: boolean | undefined;
                    promotionState?: import("@webresto/core").PromotionState[] | undefined;
                    promotionErrors?: object | object[] | undefined;
                    promotionCode?: string | import("@webresto/core/models/PromotionCode").PromotionCodeRecord | undefined;
                    promotionCodeDescription?: string | undefined;
                    promotionCodeString?: string | undefined;
                    promotionFlatDiscount?: number | undefined;
                    promotionDelivery?: import("@webresto/core/adapters/delivery/contracts").Delivery | undefined;
                    promotionCodeCheckValidTill?: string | undefined;
                    promotionUnorderable?: boolean | undefined;
                    isPromoting?: boolean | undefined;
                    dishesCount?: number | undefined;
                    uniqueDishes?: number | undefined;
                    modifiers?: any;
                    customer?: import("@webresto/core/interfaces/Customer").default | undefined;
                    address?: import("@webresto/core/interfaces/OrderAddress").default | undefined;
                    comment?: string | undefined;
                    personsCount?: string | undefined;
                    date?: string | undefined;
                    problem?: boolean | undefined;
                    rmsDelivered?: boolean | undefined;
                    rmsId?: string | undefined;
                    rmsOrderNumber?: string | undefined;
                    rmsOrderData?: any;
                    rmsDeliveryDate?: string | undefined;
                    rmsErrorMessage?: string | undefined;
                    rmsErrorCode?: string | undefined;
                    rmsStatusCode?: string | undefined;
                    rmsOrderStatus?: string | undefined;
                    pickupPoint?: string | import("@webresto/core").PlaceRecord | undefined;
                    cookingPoints?: string[] | undefined;
                    maxWaitMinutes?: number | undefined;
                    serviceType?: "delivery" | "dine-in" | "pickup" | undefined;
                    delivery?: import("@webresto/core/adapters/delivery/contracts").Delivery | null | undefined;
                    deliveryDescription?: string | undefined;
                    message?: string | undefined;
                    deliveryItem?: string | import("@webresto/core").DishRecord | undefined;
                    deliveryCost?: number | undefined;
                    totalWeight?: number | undefined;
                    trifleFrom?: number | undefined;
                    bonusesTotal?: number | undefined;
                    spendBonus?: import("@webresto/core/interfaces/SpendBonus").SpendBonus | undefined;
                    total?: number | undefined;
                    basketTotal?: number | undefined;
                    orderTotal?: number | undefined;
                    discountTotal?: number | undefined;
                    orderDate?: string | undefined;
                    tag?: string | undefined;
                    deviceId?: string | undefined;
                    orderedOnPlatform?: string | undefined;
                    nonce?: number | undefined;
                    hash?: string | undefined;
                    user?: string | import("@webresto/core").UserRecord | undefined;
                    customData?: any;
                    logs?: import("@webresto/core").OrderLogEntry[] | undefined;
                }>;
            };
        };
        message: {
            def: string;
            fn: {
                subscribe: import("graphql-subscriptions").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
        action: {
            def: string;
            fn: {
                subscribe: import("graphql-subscriptions").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
        maintenance: {
            def: string;
            fn: {
                subscribe: import("graphql-subscriptions").ResolverFn;
                resolve: (payload: any) => any;
            };
        };
    };
};
export default _default;
