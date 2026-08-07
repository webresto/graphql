import { addToReplaceList, addType } from "@webresto/graphql/lib/graphqlHelper";

// init
addToReplaceList("Dish.modifiers", "modifiers: [GroupModifier]");
addToReplaceList("OrderDish.modifiers", "modifiers: [OrderModifier]");

addType(`
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
addType(`
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
export default {

}
