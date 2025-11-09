"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("@webresto/graphql/lib/graphqlHelper");
// init
(0, graphqlHelper_1.addToReplaceList)("Dish.modifiers", "modifiers: [GroupModifier]");
(0, graphqlHelper_1.addToReplaceList)("OrderDish.modifiers", "modifiers: [OrderModifier]");
(0, graphqlHelper_1.addType)(`
type GroupModifier {
  "rmsId"
  id: String
  maxAmount: Int
  minAmount: Int
  modifierId: String
  required: Boolean
  childModifiers: [Modifier]
  group: Group
}
type Modifier {
  "rmsId"
  id: String
  modifierId: String
  maxAmount: Int
  minAmount: Int
  defaultAmount: Int
  hideIfDefaultAmount: Boolean
  dish: Dish
}
`);
(0, graphqlHelper_1.addType)(`
type OrderModifier {
  id: String
  dish: Dish
  amount: Int
  groupId: String
  group: Group
}
`);
// resolver
exports.default = {};
