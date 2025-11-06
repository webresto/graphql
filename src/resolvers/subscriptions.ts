import { withFilter } from 'apollo-server';
import checkDeviceId from '../../lib/helper/checkDeviceId';

export default {
  Subscription: {
    order: {
      def: `#graphql
      "If you authorized you should send Authorization header;"
      order(deviceId: String): Order
      `,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) => {
            if (args.deviceId) {
              context.connectionParams.deviceId = args.deviceId;
            }

            checkDeviceId(context);


            return context.pubsub.asyncIterator('order-changed')
          },

          (payload, query, context, info) => {
            return payload.deviceId === context.connectionParams.deviceId;
          }
        ),
        resolve: payload => {
          const order = payload;
          return order;
        }
      }
    },
    message: {
      def: `#graphql
      "If you authorized you should send Authorization header, and pass X-Device-Id header;"
      message(deviceId: String): Message
      `,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) => {

            if (args.deviceId) {
              context.connectionParams.deviceId = args.deviceId;
            }

            checkDeviceId(context);


            return context.pubsub.asyncIterator('message')
          },
          (payload, query, context, info) => {
            // console.log(payload.deviceId, context.connectionParams.deviceId)
            return payload.deviceId === context.connectionParams.deviceId;
          }
        ),
        resolve: payload => {
          return payload.message;
        }
      }
    },
    action: {
      def: `#graphql
      "If you authorized you should send Authorization header, and pass X-Device-Id header; Please read full documentation for Actions https://docs.webresto.org/docs/graphql/actions/"
      action(deviceId: String): Action
      `,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) => {
            if (args.deviceId) {
              context.connectionParams.deviceId = args.deviceId;
            }

            checkDeviceId(context);


            return context.pubsub.asyncIterator('action')
          },
          (payload, query, context, info) => {
            // console.log(payload.deviceId, context.connectionParams.deviceId)
            return payload.deviceId === context.connectionParams.deviceId;
          }
        ),
        resolve: payload => {
          return payload.action;
        }
      }
    },
    maintenance: {
      def: `
      "No maintenance when recive null"
      maintenance: Maintenance`,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) => context.pubsub.asyncIterator('maintenance'),
          (payload, query) => {
            return true;
          }
        ),
        resolve: payload => {
          return payload;
        }
      }
    }
  }
}
