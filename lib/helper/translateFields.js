"use strict";
// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__message = exports.__group = exports.__dish = exports.__order = exports.__general = void 0;
exports.translateFields = translateFields;
exports.translateOrder = translateOrder;
exports.translateDishes = translateDishes;
exports.__general = ['label', 'title', 'name', 'description', 'badge'];
exports.__order = [];
exports.__dish = [];
exports.__group = [];
exports.__message = [];
function translateFields(input, fieldsToTranslate, i18n) {
    if (Array.isArray(input)) {
        return input.map(item => translateFields(item, fieldsToTranslate, i18n));
    }
    if (typeof input === 'object' && input !== null) {
        const result = {};
        for (const key in input) {
            if (input.hasOwnProperty(key)) {
                const value = input[key];
                if (fieldsToTranslate.includes(key) && typeof value === 'string') {
                    result[key] = i18n(value);
                }
                else if (typeof value === 'object' && value !== null) {
                    result[key] = translateFields(value, fieldsToTranslate, i18n);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    return input;
}
function translateOrder(input, i18n) {
    const fieldsToTranslate = [];
    return translateFields(input, fieldsToTranslate, i18n);
}
function translateDishes(input, i18n) {
    const fieldsToTranslate = [];
    return translateFields(input, fieldsToTranslate, i18n);
}
