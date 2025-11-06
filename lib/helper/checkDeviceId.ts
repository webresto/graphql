export default function checkDeviceId(context: any): void {
  if (!context.connectionParams.deviceId) {
    throw `Missed deviceId`;
  }
}