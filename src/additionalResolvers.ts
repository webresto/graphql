import { carryMenuContext, menuContextFor, menuContextOf } from "../lib/graphqlHelper";

const DataLoader = require('dataloader');

export const additionalResolver = {
  GroupModifier: {
    group: async (parent: { id?: string /** here id means rmsID */ }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.id) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          const rows = await Group.find({
            where: {
              or: [{id: ids, isDeleted: false}, {rmsId: ids, isDeleted: false}] } 
            } 
          );
          const sortedInIdsOrder = ids.map((id: string) => rows.find(x => x.id === id));
          return sortedInIdsOrder;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return await dl.load(parent.id);
    }
  },
  Modifier: {
    dish: async (parent: { id?: string /** here id means rmsID */}, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.id) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (id: any) => {
          const rows = await Dish.find({ where:
            {or: [
              {id: id, isDeleted: false},
              {rmsId: id, isDeleted: false}
            ]}
          });
          const sortedInIdsOrder = id.map((id: string) => rows.find(x => {
            return x.id === id ? x.id === id : x.rmsId === id ? x.rmsId === id : false
          }));
          return sortedInIdsOrder;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      // An option is offered only where the menu that shows its dish can sell
      // it: the dish's own context, carried down from the query.
      const row = await dl.load(parent.id);
      if (!row) return row;
      const [offered] = await (await Adapter.get("menu")).filterProducts([row], await menuContextOf(parent));
      return offered ?? null;
    }
  },

  OrderModifier: {
    // Not filtered by stock: the option is already in the basket, and the
    // basket's own recount is what judges it.
    dish: async (parent: { id: string }, args: any, context: any, info: any) => {
      if (!parent.id) return null
      return (await Dish.find({ where:
        {or: [
          {id: parent.id, isDeleted: false},
          {rmsId: parent.id, isDeleted: false}
        ]}
      // @ts-ignore //TODO: Deprecated populateAll
      }).populateAll())[0];
    },
    group: async (parent: { id: string, groupId: string; }, args: any) => {
      if (!parent.id && !parent.groupId) return null
      return (await Group.find(
        {where: {
          or: [{id: parent.groupId, isDeleted: false}, {rmsId: parent.id, isDeleted: false}] } 
        }
        // @ts-ignore //TODO: Deprecated populateAll 
        ).populateAll())[0];
    }
  },

  Dish: {
    parentGroup: async (parent: { parentGroup: any; }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.parentGroup) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      // need to investigate why getting object instead of string
      if (typeof parent.parentGroup === "object") {
        return parent.parentGroup;
      }

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          // Waterline can return data not by ids array sorting
          return (await Group.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));  
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return await dl.load(parent.parentGroup);
    },
    images: async (parent: { id: any; }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      
      const sortImages = (images) => {
        return images.sort((a, b) => {
          return (+new Date(b.uploadDate) - +new Date(a.uploadDate));
        });
      };

      if (!parent.id) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          const rows = await Dish.find({id: ids}).populate('images');
          const images = ids.map((id: string) => rows.find(x => x.id === id)?.images);
          return images;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return sortImages(await dl.load(parent.id));
    }
  },
  Group: {
    parentGroup: async (parent: { parentGroup: any; }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.parentGroup) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      // need to investigate why getting object instead of string
      if (typeof parent.parentGroup === "object") {
        return parent.parentGroup;
      }

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          return (await Group.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));  
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return  await dl.load(parent.parentGroup);
    }
  },
  Order: {
    dishes: async (parent: { dishes: any; id: any; }, args: any, context: any, info: any) => {
      if (typeof parent.dishes === "object") {
        return parent.dishes;
      }

      return await OrderDish.find({order: parent.id});
    },
    // Stored as ids, in route order; served as the places, in the same order.
    cookingPoints: async (parent: { cookingPoints?: string[] }) => {
      const ids = parent.cookingPoints ?? [];
      if (!ids.length) return [];
      const places = await Place.find({ id: ids });
      return ids.map((id) => places.find((place) => place.id === id)).filter(Boolean);
    },
  },
  OrderDish: {
    // OrderDish is not auto-generated, so its associations get no resolvers of
    // their own: without this the stored id comes back as an empty Place.
    cookingPoint: async (parent: { cookingPoint?: string | null }) => {
      if (!parent.cookingPoint) return null;
      return await Place.findOne({ id: parent.cookingPoint });
    },
    // The line's dish is read in its order's menu context: its `balance` is what
    // that order's kitchens hold, not what every kitchen of every city does.
    dish: async (parent: { dish: any; order?: any }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      
      if (!parent.dish) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;
      const orderId = typeof parent.order === "object" ? parent.order?.id : parent.order;
      // A copy: one dish object can serve lines of several orders in one response.
      const inOrder = (dish: any) => (dish ? carryMenuContext({ ...dish }, menuContextFor(orderId ?? null)) : dish);

      if (typeof parent.dish === "object") {
        return inOrder(parent.dish);
      }

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          return (await Dish.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));  
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return inOrder(await dl.load(parent.dish));
    },
    
  }
}

