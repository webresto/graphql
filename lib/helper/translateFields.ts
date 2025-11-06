// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";

export const __general = ['label','title', 'name', 'description', 'badge'];
export const __order = []
export const __dish = []
export const __group = []
export const __message = []


export function translateFields<T extends object>(input: T, fieldsToTranslate: string[], i18n: (f: string) => string ): T 
export function translateFields<T extends object>(input: T[], fieldsToTranslate: string[], i18n: (f: string) => string ): T[] 
export function translateFields<T extends object>(input: T | T[], fieldsToTranslate: string[], i18n: (f: string) => string): T | T[] {
    if (Array.isArray(input)) {
        return input.map(item => translateFields(item, fieldsToTranslate, i18n)) as T[];
    }

    if (typeof input === 'object' && input !== null) {
        const result = {} as T;

        for (const key in input) {
            if (input.hasOwnProperty(key)) {
                const value = input[key];

                if (fieldsToTranslate.includes(key) && typeof value === 'string') {
                    result[key as keyof T] = i18n(value) as T[keyof T];
                } else if (typeof value === 'object' && value !== null) {
                    result[key as keyof T] = translateFields(value, fieldsToTranslate, i18n) as T[keyof T];
                } else {
                    result[key as keyof T] = value;
                }
            }
        }

        return result;
    }

    return input;
}

export function translateOrder(input: Order, i18n: (f: string) => string): Order {
    const fieldsToTranslate = [];
    return translateFields(input, fieldsToTranslate, i18n);
}

export function translateDishes(input: Dish[], i18n: (f: string) => string): Dish[] {
    const fieldsToTranslate = [];
    return translateFields(input, fieldsToTranslate, i18n);
}

