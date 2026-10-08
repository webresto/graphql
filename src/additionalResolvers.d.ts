export declare const additionalResolver: {
    GroupModifier: {
        group: (parent: {
            id?: string; /** here id means rmsID */
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
    };
    Modifier: {
        dish: (parent: {
            id?: string; /** here id means rmsID */
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
    };
    OrderModifier: {
        dish: (parent: {
            id: string;
        }, args: any, context: any, info: any) => Promise<any>;
        group: (parent: {
            id: string;
            groupId: string;
        }, args: any) => Promise<any>;
    };
    Dish: {
        parentGroup: (parent: {
            parentGroup: any;
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
        images: (parent: {
            id: any;
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
    };
    Group: {
        parentGroup: (parent: {
            parentGroup: any;
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
    };
    Order: {
        dishes: (parent: {
            dishes: any;
            id: any;
        }, args: any, context: any, info: any) => Promise<any>;
        cookingPoints: (parent: {
            cookingPoints?: string[];
        }) => Promise<import("@webresto/core/models/Place").PlaceRecord[]>;
        paymentMethod: (parent: {
            paymentMethod: any;
        }) => Promise<any>;
        pickupPoint: (parent: {
            pickupPoint: any;
        }) => Promise<any>;
    };
    OrderDish: {
        cookingPoint: (parent: {
            cookingPoint?: string | null;
        }) => Promise<import("@webresto/core/models/Place").PlaceRecord>;
        dish: (parent: {
            dish: any;
            order?: any;
        }, args: any, context: {
            dataloaders: WeakMap<object, any>;
        }, info: {
            fieldNodes: any;
        }) => Promise<any>;
    };
};
