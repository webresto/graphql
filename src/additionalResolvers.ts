const DataLoader = require('dataloader');

export const additionalResolver = {
  GroupModifier: {
    modifierId: async (parent: { modifierId?: string;  id?: string /** here id means rmsID */}, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (parent.modifierId) return parent.modifierId;
      
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (id: any) => {
          const rows = await Group.find({
            rmsId: id, isDeleted: false
          });
          const sortedInIdsOrder = id.map((id: string) => rows.find(x => {
            return x.rmsId === id
          }));
          return sortedInIdsOrder;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return (await dl.load(parent.id)).id;
    },
    group: async (parent: { modifierId?: string; id?: string /** here id means rmsID */ }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.modifierId && !parent.id) return;
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
      return await dl.load(parent.modifierId ? parent.modifierId : parent.id);
    }
  },
  Modifier: {
    modifierId: async (parent: { modifierId?: string;  id?: string /** here id means rmsID */}, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (parent.modifierId) return parent.modifierId;
      
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (id: any) => {
          const rows = await Dish.find({
            rmsId: id, balance: { "!=": 0 }, isDeleted: false
          });
          const sortedInIdsOrder = id.map((id: string) => rows.find(x => {
            return x.rmsId === id
          }));
          return sortedInIdsOrder;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return (await dl.load(parent.id)).id;
    },
    dish: async (parent: { modifierId?: string;  id?: string /** here id means rmsID */}, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      if (!parent.modifierId && !parent.id) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (id: any) => {
          const rows = await Dish.find({ where: 
            {or: [
              {id: id, balance: { "!=": 0 }, isDeleted: false},
              {rmsId: id, balance: { "!=": 0 }, isDeleted: false}
            ]}
          });
          const sortedInIdsOrder = id.map((id: string) => rows.find(x => {
            return x.id === id ? x.id === id : x.rmsId === id ? x.rmsId === id : false
          }));
          return sortedInIdsOrder;
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return await dl.load(parent.modifierId ? parent.modifierId : parent.id);
    }
  },

  OrderModifier: {
    dish: async (parent: { id: string; modifierId: string}, args: any, context: any, info: any) => {
      if (!parent.id && !parent.modifierId) return null
      return (await Dish.find({ where: 
        {or: [
          {id: parent.id, balance: { "!=": 0 }, isDeleted: false}, 
          {rmsId: parent.id, balance: { "!=": 0 }, isDeleted: false}
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

  },
  OrderDish: {
    dish: async (parent: { dish: any; }, args: any, context: { dataloaders: WeakMap<object, any>; }, info: { fieldNodes: any; }) => {
      
      if (!parent.dish) return;
      if (!context.dataloaders) context.dataloaders = new WeakMap();
      const dataloaders = context.dataloaders;

      if (typeof parent.dish === "object") {
        return parent.dish;
      }

      let dl = dataloaders.get(info.fieldNodes);
      if (!dl) {
        dl = new DataLoader(async (ids: any) => {
          return (await Dish.find(ids)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));  
        });
        dataloaders.set(info.fieldNodes, dl);
      }
      return await dl.load(parent.dish);
    },
    
  }
}

