export default {
    Query: {
        paymentMethod: {
            def: 'paymentMethod(orderId: String!): [PaymentMethod]',
            fn: async function (parent, args, context) {
              const orderId = args.orderId;
                try {
                  const order = await Order.findOne({id: orderId});
                  if(!order) {
                    // TODO: implement logic for event
                    sails.log.error(`order not found`)
                  }
                  
                  const data = await PaymentMethod.getAvailable();
                  await emitter.emit('graphql-return-payment-method', orderId, data);
                  return data;
                } catch (e) {
                  sails.log.error(e, args); 
                  throw e
                }
            }
        }
    }
}
