import { addToReplaceList, addType } from "@webresto/graphql/lib/graphqlHelper";

// init
addToReplaceList("Dish.modifiers", "modifiers: [GroupModifier]");
addToReplaceList("OrderDish.modifiers", "modifiers: [OrderModifier]");

addType(`
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
addType(`
type OrderModifier {
  id: String
  dish: Dish
  amount: Int
  groupId: String
  group: Group
}
`);

// resolver
export default {

}
