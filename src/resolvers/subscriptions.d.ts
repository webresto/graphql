/**
 * Событие `order-changed` несёт запись заказа такой, какой её отдал ватерлайн:
 * ассоциации в ней — идентификаторы, а не объекты. Отдать её подписчику как
 * есть значит прислать `pickupPoint` из одних null: GraphQL разрешает поля
 * типа на строке. Витрина мержит присланный заказ поверх своего, и выбранная
 * точка пропадает через секунду после любой правки заказа. Поэтому подписка
 * отвечает тем же заказом, что и запрос, — `Order.populate`.
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
                    address?: import("@webresto/core/interfaces/Address").default | undefined;
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
                    cookingPoint?: string | import("@webresto/core").PlaceRecord | null | undefined;
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
                    address?: import("@webresto/core/interfaces/Address").default | undefined;
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
                    cookingPoint?: string | import("@webresto/core").PlaceRecord | null | undefined;
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
