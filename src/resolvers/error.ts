export default {
  Query: {
    errorCheck: {
      def: 'errorCheck: Boolean',
      fn: async () => {
        try {
          throw new Error(        
            `modifier required (amount, id) for dish: amount: `
          );
          // await Order.check(
          //   {id: "order.id"}
          // );
          // try {
          // } catch (error) {
          //   console.log(JSON.stringify(error), error.trace())
          //   throw error;
          // }
          return true
        } catch (error) {
          sails.log.error(`GQL > [errorCheck]`, error, {});
          throw error;
        }
      }
    }
  },
}