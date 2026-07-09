import { JWTAuth } from "../../lib/jwt";
import graphqlHelper from "../../lib/graphqlHelper";
import checkDeviceId from "../../lib/helper/checkDeviceId";

export default {
  Mutation: {
    registerNotificationToken: {
      def: `#graphql
      """
      Register or update a push notification token for the current device.
      Call this after login and whenever FCM rotates the token.
      """
      registerNotificationToken(
        token: String!
        platform: String!
        provider: String!
      ): Boolean`,
      fn: async (
        _: any,
        { token, platform, provider }: { token: string; platform: string; provider: string },
        context: any
      ) => {
        checkDeviceId(context);
        const deviceId = context.connectionParams.deviceId;

        let device = await UserDevice.findOne({ id: deviceId });
        if (!device) {
          // A device always exists on the client side, but it may not be registered yet and has no user
          // until login. Create it empty (user === null) so guests can receive push notifications;
          // it will be bound to the user later in User.authDevice on login.
          device = await UserDevice.create({
            id: deviceId,
            userAgent: context.connectionParams?.["user-agent"] ?? undefined,
          }).fetch();
        }

        await UserDevice.setNotificationToken(deviceId, {
          provider,
          platform: platform as any,
          token,
          updatedAt: Date.now(),
        });

        return true;
      },
    },

    markNotificationRead: {
      def: `#graphql
      """
      Mark a notification as read. The notification id is used as a read token —
      only the recipient who received it knows the UUID.
      """
      markNotificationRead(id: ID!): Boolean`,
      fn: async (_: any, { id }: { id: string }, context: any) => {
        let userId: string | null = null;
        try {
          if (context?.connectionParams?.authorization) {
            userId = (await JWTAuth.verify(context.connectionParams.authorization)).userId;
          }
        } catch (_e) {
          // not authenticated — still allow for null-user notifications
        }

        const notification = await Notification.findOne({ id });
        if (!notification) {
          return false;
        }

        // Проверка принадлежности: уведомление либо для этого пользователя, либо системное (user === null)
        if (notification.user && notification.user !== userId) {
          return false;
        }

        await Notification.updateOne({ id }).set({
          status: "read",
          readAt: Date.now(),
        });

        return true;
      },
    },

    markNotificationDelivered: {
      def: `#graphql
      """
      Acknowledge that the device received and displayed the notification (deliveredAt),
      independent of read. Idempotent. No JWT check: possession of the UUID id already
      proves receipt, and the ack may come from an unauthenticated context (service worker).
      """
      markNotificationDelivered(id: ID!): Boolean`,
      fn: async (_: any, { id }: { id: string }) => {
        const notification = await Notification.findOne({ id });
        if (!notification) {
          return false;
        }

        if (notification.deliveredAt) {
          return true;
        }

        await Notification.updateOne({ id }).set({
          deliveredAt: Date.now(),
        });
        await Notification.log({ id }, "info", "delivery", "Delivery acknowledged by device (markNotificationDelivered)");

        return true;
      },
    },
  },
};
