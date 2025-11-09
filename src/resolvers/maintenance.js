"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Query: {
        maintenance: {
            def: 'maintenance: Maintenance',
            fn: async function (parent, args, context) {
                return await Maintenance.getActiveMaintenance();
            }
        }
    }
};
