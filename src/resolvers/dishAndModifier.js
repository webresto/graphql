"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("@webresto/graphql/lib/graphqlHelper");
// init
(0, graphqlHelper_1.addToReplaceList)("Dish.modifiers", "modifiers: [GroupModifier]");
(0, graphqlHelper_1.addToReplaceList)("OrderDish.modifiers", "modifiers: [OrderModifier]");
(0, graphqlHelper_1.addType)(`
type GroupModifier {
  id: String
  rmsId: String
  maxAmount: Int
  minAmount: Int
  modifierId: String
  required: Boolean
  amount: Int
  defaultAmount: Int
  freeOfChargeAmount: Int
  freeAmount: Int
  groupId: String
  isSingleModifierGroupWrapper: Boolean
  childModifiers: [Modifier]
  group: Group
}
type Modifier {
  id: String
  rmsId: String
  modifierId: String
  maxAmount: Int
  minAmount: Int
  defaultAmount: Int
  hideIfDefaultAmount: Boolean
  required: Boolean
  amount: Int
  freeOfChargeAmount: Int
  freeAmount: Int
  dish: Dish
}
`);
(0, graphqlHelper_1.addType)(`
type OrderModifier {
  id: String
  rmsId: String
  modifierId: String
  dish: Dish
  amount: Int
  groupId: String
  group: Group
}
`);
// resolver
exports.default = {};
