import { addType } from "@webresto/graphql/lib/graphqlHelper"
addType(`type PickupPoint {
  id: String
  title: String
  address: String
  order: Int
  enable: Boolean
  worktime: Json
  active: Boolean
  phone: String
}`);

exports.default = {
    Query: {
      pickuppoints: {
            def: "pickuppoints: [PickupPoint]",
            fn: async () => {
                let result = await Place.find({ isPickupPoint: true, enable: true });
                return result;
            }
        }
    }
};
