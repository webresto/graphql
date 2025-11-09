export declare const __general: string[];
export declare const __order: any[];
export declare const __dish: any[];
export declare const __group: any[];
export declare const __message: any[];
export declare function translateFields<T extends object>(input: T, fieldsToTranslate: string[], i18n: (f: string) => string): T;
export declare function translateFields<T extends object>(input: T[], fieldsToTranslate: string[], i18n: (f: string) => string): T[];
export declare function translateOrder(input: Order, i18n: (f: string) => string): Order;
export declare function translateDishes(input: Dish[], i18n: (f: string) => string): Dish[];
