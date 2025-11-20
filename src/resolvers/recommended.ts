import { getRecommendElements } from "../../lib/getRecommended";

export default {
    Query: {
        recommendedForDish: {
            def: 'recommendedForDish(dishId: String): [Dish]',
            fn: async function (parent: any, args: any, context: any) {
              try {
                let defaultGroup = null;
                let listOfAllowedGroups = null;
                let recommendedByDefault = [];

                const currentDish = (await Dish.find({id: args.dishId}).limit(1))[0];
                const RECOMMENDED_GROUPID_FOR_DISHES = await Settings.get("RECOMMENDED_GROUPID_FOR_DISHES")
                const RECOMMENDED_FORCE_DISHES_IDS = (await Settings.get("RECOMMENDED_FORCE_DISHES"))?.split(";")

                const recommendedForDish = currentDish.id && await Dish.getRecommended([currentDish.id]) || [];
                const recommendedByParentGroup = currentDish.parentGroup && await Group.getRecommendedDishes([currentDish.parentGroup]) || [];

                let combinedRecommendedDishes = recommendedForDish.concat(recommendedByParentGroup);                
                
                const recommendedByForce = RECOMMENDED_FORCE_DISHES_IDS?.length ? await Dish.find({id: RECOMMENDED_FORCE_DISHES_IDS}): [];
                let result = (recommendedByForce.concat(combinedRecommendedDishes))


                
                if(result.length < 3) {
                  let criteria = {}
                  criteria['where'] = {
                    'and': [
                      { 'balance': { "!=": 0 } },
                      { 'modifier': false },
                      { 'isDeleted': false },
                      { 'visible': true }
                    ]
                  };

                  if(RECOMMENDED_GROUPID_FOR_DISHES) {
                    defaultGroup = await Group.find({id: RECOMMENDED_GROUPID_FOR_DISHES})
                    listOfAllowedGroups = await Group.getMenuTree(defaultGroup);
                  } else {
                    listOfAllowedGroups = await Group.getMenuTree();
                  }
                  
                  criteria['where']['and'].push({ 'parentGroup': { 'in': listOfAllowedGroups } })
                  if (currentDish) criteria['where']['and'].push({'parentGroup': { "!=": currentDish.parentGroup}})
                  recommendedByDefault = getRecommendElements(await Dish.find(criteria), 8);                
                }
                

                result= result.concat(recommendedByDefault);

                result =  [...new Set(result.map(dish => dish.id))].map(id =>
                  result.find(dish => dish.id === id)
                )
                return result.splice(0, 24);
              } catch (error) {
                sails.log.error(`GQL > [recommended]`, error, args);
                throw error
              }
            }
        },
        recommendedForOrder: {
          def: 'recommendedForOrder(orderId: String): [Dish]',
          fn: async function (parent: any, args: any, context: any) {
            try {
              const RECOMMENDED_GROUPID_FOR_ORDER = await Settings.get("RECOMMENDED_GROUPID_FOR_ORDER")
              const RECOMMENDED_FORCE_DISHES_IDS = (await Settings.get("RECOMMENDED_FORCE_DISHES"))?.split(";")
              const recommendedByForce = RECOMMENDED_FORCE_DISHES_IDS?.length ? await Dish.find({id: RECOMMENDED_FORCE_DISHES_IDS}): [];

              let orderDishes = [];
              if (args.orderId) {
                orderDishes = await OrderDish.find({order: args.orderId}).populate("dish");
              }
              const orderDishIds = orderDishes.map(orderDish => orderDish.dish.id);
            
              const orderDishParentGroupIds = orderDishes
              .map(orderDish => orderDish.dish.parentGroup)
              .filter(parentGroup => parentGroup !== undefined && parentGroup !== null) as string[];
            
              let defaultGroup = null;
              let listOfAllowedGroups = null;
              let recommendedByDefault = [];

              const recommendedForDish = orderDishIds.length && await Dish.getRecommended(orderDishIds) || [];
              const recommendedByParentGroup = orderDishParentGroupIds.length && await Group.getRecommendedDishes(orderDishParentGroupIds) || [];

              let combinedRecommendedDishes = recommendedForDish.concat(recommendedByParentGroup);
              let result = (recommendedByForce.concat(combinedRecommendedDishes))
                     
              if(result.length < 3) {
                let criteria = {}
                criteria['where'] = {
                  'and': [
                    { 'balance': { "!=": 0 } },
                    { 'modifier': false },
                    { 'isDeleted': false },
                    { 'visible': true }
                  ]
                };

                if(RECOMMENDED_GROUPID_FOR_ORDER) {
                  defaultGroup = await Group.find({id: RECOMMENDED_GROUPID_FOR_ORDER})
                  listOfAllowedGroups = await Group.getMenuTree(defaultGroup);
                } else {
                  listOfAllowedGroups = await Group.getMenuTree();
                }
                
                criteria['where']['and'].push({ 'parentGroup': { 'in': listOfAllowedGroups } })
                if (orderDishIds.length) {
                  criteria["where"]["and"].push({id : {"!=": orderDishIds}})
                }
                recommendedByDefault = getRecommendElements(await Dish.find(criteria), 8);                
              }
              result = result.concat(recommendedByDefault)
                
              result =  [...new Set(result.map(dish => dish.id))].map(id =>
                result.find(dish => dish.id === id)
              )
              return result.splice(0, 24);
            } catch (error) {
              sails.log.error(`GQL > [recommended]`, error, args);
              throw error
            }
          }
      }
    }
}
