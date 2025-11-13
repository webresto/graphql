"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Query: {
        menu: {
            def: "menu(concept: String, topLevelGroupId: String): [Group]",
            fn: async (parent, args, context, info) => {
                try {
                    return await Group.getMenuGroups(args.concept, args.topLevelGroupId);
                }
                catch (error) {
                    sails.log.error(`GQL > [menu]`, error, args);
                    throw error;
                }
            }
        }
    }
};
