
export default {
  Query: {
    maintenance: {
      def: 'maintenance: Maintenance',
      fn: async function (parent, args, context) {
        return await Maintenance.getActiveMaintenance();
      }
    }
  }
}
