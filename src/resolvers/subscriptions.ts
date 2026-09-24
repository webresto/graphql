import { withFilter } from 'apollo-server';
import checkDeviceId from '../../lib/helper/checkDeviceId';

/**
 * The `order-changed` event carries the order record exactly as waterline
 * handed it over: associations in it are identifiers, not objects. Sending it
 * to a subscriber as is means sending a `pickupPoint` of nothing but nulls,
 * because GraphQL resolves the fields of the type against a string. The
 * storefront merges the pushed order over its own, and the chosen place
 * disappears a second after any edit of the order. So the subscription answers
 * with the same order the query does — `Order.populate`.
 */

export default {
  Subscription: {
    orders: {
      def: `#graphql
      "Subscribe to updates for multiple orders by orderIds. Returns the single changed Order."
      orders(orderIds: [String!]!, deviceId: String): Order
      `,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) => {
            if (args.deviceId) {
              context.connectionParams.deviceId = args.deviceId;
            }
            checkDeviceId(context);
            return context.pubsub.asyncIterator('order-changed');
          },
          (payload, args, context, info) => {
            return Array.isArray(args.orderIds) && args.orderIds.includes(payload.id);
          }
        ),
        resolve: payload => Order.populate(payload.id),
      }
    },

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
        resolve: payload => Order.populate(payload.id),
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
