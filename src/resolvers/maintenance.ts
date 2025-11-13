
export default {
  Query: {
    maintenance: {
      def: 'maintenance: Maintenance',
      fn: async function (parent, args, context) {
        try {
          return await Maintenance.getActiveMaintenance();
        } catch (error) {
          sails.log.error(`GQL > [maintenance]`, error, args);
          throw error;
        }
      }
    }
  }
}
