export default {
  Query: {
    menu: {
      def: "menu(concept: String, topLevelGroupId: String): [Group]",
      fn: async (parent, args, context, info) => {
        return await Group.getMenuGroups(args.concept, args.topLevelGroupId);
      }
    }
  }
}