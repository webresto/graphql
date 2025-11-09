"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkDeviceId;
function checkDeviceId(context) {
    if (!context.connectionParams.deviceId) {
        throw `Missed deviceId`;
    }
}
