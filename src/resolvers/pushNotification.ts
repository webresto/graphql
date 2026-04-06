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

        const device = await UserDevice.findOne({ id: deviceId });
        if (!device) {
          throw new Error("Device not found");
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
  },
};
