"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.additionalResolver = void 0;
const graphqlHelper_1 = require("../lib/graphqlHelper");
const DataLoader = require('dataloader');
exports.additionalResolver = {
    GroupModifier: {
        group: async (parent, args, context, info) => {
            if (!parent.id)
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
            return await dl.load(parent.id);
        }
    },
    Modifier: {
        dish: async (parent, args, context, info) => {
            if (!parent.id)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (id) => {
                    const rows = await Dish.find({ where: { or: [
                                { id: id, isDeleted: false },
                                { rmsId: id, isDeleted: false }
                            ] }
                    });
                    const sortedInIdsOrder = id.map((id) => rows.find(x => {
                        return x.id === id ? x.id === id : x.rmsId === id ? x.rmsId === id : false;
                    }));
                    return sortedInIdsOrder;
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            // An option is offered only where the menu that shows its dish can sell
            // it: the dish's own context, carried down from the query. A stopped
            // option is not shown even when the menu shows stopped dishes
            // (SHOW_UNAVAILABLE_DISHES): it is chosen, not looked at - as
            // Dish.getDishModifiers decides.
            const row = await dl.load(parent.id);
            if (!row)
                return row;
            const adapter = await Adapter.get("menu");
            const menuContext = await (0, graphqlHelper_1.menuContextOf)(parent);
            const [offered] = await adapter.filterProducts([row], menuContext);
            if (!offered || !(await adapter.canAddProduct(row, 1, menuContext)).available)
                return null;
            return offered;
        }
    },
    OrderModifier: {
        // Not filtered by stock: the option is already in the basket, and the
        // basket's own recount is what judges it.
        dish: async (parent, args, context, info) => {
            if (!parent.id)
                return null;
            return (await Dish.find({ where: { or: [
                        { id: parent.id, isDeleted: false },
                        { rmsId: parent.id, isDeleted: false }
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
        // The variants of a box (the type - graphql.ts, DishVariants): each mapping with its dish, read as a dish in the
        // context the box was read in. A mapping whose dish is gone, deleted or switched off is left out.
        variants: async (parent) => {
            const variants = parent?.variants;
            if (!variants?.mappings?.length)
                return null;
            const ids = variants.mappings.map((mapping) => mapping.rel).filter((id) => !!id);
            const rows = ids.length ? await Dish.find({ id: ids, isDeleted: false, enable: true }) : [];
            const context = (0, graphqlHelper_1.menuContextOf)(parent);
            const byId = new Map(rows.map((row) => [row.id, (0, graphqlHelper_1.carryMenuContext)(row, context)]));
            return {
                options: variants.options ?? [],
                mappings: variants.mappings
                    .filter((mapping) => mapping.rel && byId.has(mapping.rel))
                    .map((mapping) => ({ values: mapping.values, isDefault: mapping.isDefault === true, dish: byId.get(mapping.rel) })),
            };
        },
        // A dish with variants (core's `interfaces/Variants.ts`) and its variant share their photos at reading, both ways:
        // a variant without photos of its own shows its box's, a box without its own - its default variant's. No copies of
        // files, and it serves the menu, the card of a dish and a line of the cart alike.
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
            const own = sortImages((await dl.load(parent.id)) ?? []);
            if (own.length)
                return own;
            const mappings = parent.variants?.mappings ?? [];
            const other = parent.parentId ?? (mappings.find((mapping) => mapping.isDefault) ?? mappings[0])?.rel;
            return other ? sortImages((await dl.load(other)) ?? []) : own;
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
        // Stored as ids, in route order; served as the places, in the same order.
        cookingPoints: async (parent) => {
            const ids = parent.cookingPoints ?? [];
            if (!ids.length)
                return [];
            const places = await Place.find({ id: ids });
            return ids.map((id) => places.find((place) => place.id === id)).filter(Boolean);
        },
        // checkOrder, sendOrder and the `order-changed` subscription payload return the order
        // as Waterline gives it (Order.findOne / Order.update().fetch()): associations are ids.
        // Without a resolver GraphQL resolves PaymentMethod / PickupPoint fields on a string and
        // answers {id: null, title: null}, which then overwrites the client cache.
        // Resolve the id the same way Order.populate does.
        paymentMethod: async (parent) => {
            if (!parent.paymentMethod)
                return null;
            if (typeof parent.paymentMethod === "object") {
                return parent.paymentMethod;
            }
            return (await PaymentMethod.findOne({ id: parent.paymentMethod })) ?? null;
        },
        pickupPoint: async (parent) => {
            if (!parent.pickupPoint)
                return null;
            if (typeof parent.pickupPoint === "object") {
                return parent.pickupPoint;
            }
            return (await Place.findOne({ id: parent.pickupPoint })) ?? null;
        },
    },
    OrderDish: {
        // OrderDish is not auto-generated, so its associations get no resolvers of
        // their own: without this the stored id comes back as an empty Place.
        cookingPoint: async (parent) => {
            if (!parent.cookingPoint)
                return null;
            return await Place.findOne({ id: parent.cookingPoint });
        },
        // The line's dish is read in its order's menu context: its `balance` is what
        // that order's kitchens hold, not what every kitchen of every city does.
        dish: async (parent, args, context, info) => {
            if (!parent.dish)
                return;
            if (!context.dataloaders)
                context.dataloaders = new WeakMap();
            const dataloaders = context.dataloaders;
            const orderId = typeof parent.order === "object" ? parent.order?.id : parent.order;
            // A copy: one dish object can serve lines of several orders in one response.
            const inOrder = (dish) => (dish ? (0, graphqlHelper_1.carryMenuContext)({ ...dish }, (0, graphqlHelper_1.menuContextFor)(orderId ?? null)) : dish);
            if (typeof parent.dish === "object") {
                return inOrder(parent.dish);
            }
            let dl = dataloaders.get(info.fieldNodes);
            if (!dl) {
                dl = new DataLoader(async (ids) => {
                    return (await Dish.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
                });
                dataloaders.set(info.fieldNodes, dl);
            }
            return inOrder(await dl.load(parent.dish));
        },
        // The box of the line's dish when that dish is a variant (core's `OrderDish.parentDish`): its name and attributes
        // name the line, in the order's menu context like the dish.
        parentDish: async (parent) => {
            if (!parent.parentDish)
                return null;
            const id = typeof parent.parentDish === "object" ? parent.parentDish.id : parent.parentDish;
            const orderId = typeof parent.order === "object" ? parent.order?.id : parent.order;
            const box = await Dish.findOne({ id });
            return box ? (0, graphqlHelper_1.carryMenuContext)({ ...box }, (0, graphqlHelper_1.menuContextFor)(orderId ?? null)) : null;
        },
    }
};
