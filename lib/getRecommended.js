"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendElements = getRecommendElements;
function getRecommendElements(array, count) {
    if (!Array.isArray(array) || array.length === 0 || count <= 0) {
        return [];
    }
    if (array.length <= count) {
        return array;
    }
    const maxPrice = Math.max(...array.map(item => item.price));
    const minPrice = maxPrice * 0.2; // 20% of the maximum price
    const maxPriceRange = maxPrice * 0.8; // 80% of the maximum price
    let filteredArray = array.filter(item => item.price >= minPrice && item.price <= maxPriceRange);
    if (filteredArray.length === 0) {
        filteredArray = array;
    }
    const randomElements = [];
    const indices = new Set();
    while (randomElements.length < count && indices.size < filteredArray.length) {
        const index = Math.floor(Math.random() * filteredArray.length);
        if (!indices.has(index)) {
            indices.add(index);
            randomElements.push(filteredArray[index]);
        }
    }
    return randomElements.reverse();
}
