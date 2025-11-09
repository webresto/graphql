"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.additionalResolver = void 0;
const DataLoader = require('dataloader');
exports.additionalResolver = {
    GroupModifier: {
        modifierId: async (parent, args, context, info) => {
            if (parent.modifierId)
                return parent.modifierId;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (id) => {
                    const rows = await Group.find({
                        rmsId: id, isDeleted: false
                    });
                    const sortedInIdsOrder = id.map((id) => rows.find(x => {
                        return x.rmsId === id;
                    }));
                    return sortedInIdsOrder;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return (await dl.load(parent.id)).id;
        },
        group: async (parent, args, context, info) => {
            if (!parent.modifierId && !parent.id)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    const rows = await Group.find({
                        where: {
                            or: [{ id: ids, isDeleted: false }, { rmsId: ids, isDeleted: false }]
                        }
                    });
                    const sortedInIdsOrder = ids.map((id) => rows.find(x => x.id === id));
                    return sortedInIdsOrder;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return await dl.load(parent.modifierId ? parent.modifierId : parent.id);
        }
    },
    Modifier: {
        modifierId: async (parent, args, context, info) => {
            if (parent.modifierId)
                return parent.modifierId;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (id) => {
                    const rows = await Dish.find({
                        rmsId: id, balance: { "!=": 0 }, isDeleted: false
                    });
                    const sortedInIdsOrder = id.map((id) => rows.find(x => {
                        return x.rmsId === id;
                    }));
                    return sortedInIdsOrder;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return (await dl.load(parent.id)).id;
        },
        dish: async (parent, args, context, info) => {
            if (!parent.modifierId && !parent.id)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (id) => {
                    const rows = await Dish.find({ where: { or: [
                                { id: id, balance: { "!=": 0 }, isDeleted: false },
                                { rmsId: id, balance: { "!=": 0 }, isDeleted: false }
                            ] }
                    });
                    const sortedInIdsOrder = id.map((id) => rows.find(x => {
                        return x.id === id ? x.id === id : x.rmsId === id ? x.rmsId === id : false;
                    }));
                    return sortedInIdsOrder;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return await dl.load(parent.modifierId ? parent.modifierId : parent.id);
        }
    },
    OrderModifier: {
        dish: async (parent, args, context, info) => {
            if (!parent.id && !parent.modifierId)
                return null;
            return (await Dish.find({ where: { or: [
                        { id: parent.id, balance: { "!=": 0 }, isDeleted: false },
                        { rmsId: parent.id, balance: { "!=": 0 }, isDeleted: false }
                    ] }
                // @ts-ignore //TODO: Deprecated populateAll 
            }).populateAll())[0];
        },
        group: async (parent, args) => {
            if (!parent.id && !parent.groupId)
                return null;
            return (await Group.find({ where: {
                    or: [{ id: parent.groupId, isDeleted: false }, { rmsId: parent.id, isDeleted: false }]
                }
            }
            // @ts-ignore //TODO: Deprecated populateAll 
            ).populateAll())[0];
        }
    },
    Dish: {
        parentGroup: async (parent, args, context, info) => {
            if (!parent.parentGroup)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            // need to investigate why getting object instead of string
            if (typeof parent.parentGroup === "object") {
                return parent.parentGroup;
            }
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    // Waterline can return data not by ids array sorting
                    return (await Group.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return await dl.load(parent.parentGroup);
        },
        images: async (parent, args, context, info) => {
            const sortImages = (images) => {
                return images.sort((a, b) => {
                    return (+new Date(b.uploadDate) - +new Date(a.uploadDate));
                });
            };
            if (!parent.id)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    const rows = await Dish.find({ id: ids }).populate('images');
                    const images = ids.map((id) => rows.find(x => x.id === id)?.images);
                    return images;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return sortImages(await dl.load(parent.id));
        }
    },
    Group: {
        parentGroup: async (parent, args, context, info) => {
            if (!parent.parentGroup)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            // need to investigate why getting object instead of string
            if (typeof parent.parentGroup === "object") {
                return parent.parentGroup;
            }
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    return (await Group.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return await dl.load(parent.parentGroup);
        }
    },
    Order: {
        dishes: async (parent, args, context, info) => {
            if (typeof parent.dishes === "object") {
                return parent.dishes;
            }
            return await OrderDish.find({ order: parent.id });
        },
    },
    OrderDish: {
        dish: async (parent, args, context, info) => {
            if (!parent.dish)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            if (typeof parent.dish === "object") {
                return parent.dish;
            }
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    return (await Dish.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return await dl.load(parent.dish);
        },
    }
};
