import { expect } from "chai";
import { createRequire } from "module";
import * as path from "path";

/**
 * What the customer reads when checkOrder is refused: the words of a refusal with their numbers. A delivery refused
 * (code 11) speaks with the delivery's own message - a key of core with its arguments ("Minimum order amount: %s",
 * 600) - and an RMS refusal (code 30) with the RMS's words as they are. Both the sources and the compiled pair are run:
 * the stand loads the `.js`.
 */
for (const ext of ["ts", "js"]) {
  describe(`checkOrder refusals (${ext})`, function () {
    const names = ["sails", "Settings", "Order"];
    const realGlobals: Record<string, any> = {};
    let JWTAuth: any;
    let realVerify: unknown;
    let checkoutResolvers: any;
    let refusal: unknown;

    const context = {
      connectionParams: { authorization: null, deviceId: "device" },
      i18n: { __: (text: string, ...args: unknown[]) => args.reduce<string>((line, arg) => line.replace("%s", String(arg)), text) },
    };

    before(function () {
      for (const name of names) realGlobals[name] = (global as any)[name];
      const log = { error() {}, warn() {}, info() {}, debug() {}, silly() {}, verbose() {} };
      (global as any).sails = { log, config: {} };
      (global as any).Settings = { get: async () => undefined };
      const order = {
        id: "cart",
        state: "CART",
        delivery: { allowed: false, message: "Minimum order amount: %s", messageArgs: ["600"] },
      };
      (global as any).Order = {
        findOne: async () => ({ ...order }),
        populate: async () => ({ ...order }),
        isOrderedState: () => false,
        update: () => ({ fetch: async () => [order] }),
        check: async () => {
          throw refusal;
        },
      };
      const load = createRequire(path.join(__dirname, "../../src/resolvers", `index.${ext}`));
      JWTAuth = load(`../../lib/jwt.${ext}`).JWTAuth;
      realVerify = JWTAuth.verify;
      JWTAuth.verify = async () => ({ userId: null });
      checkoutResolvers = load(`./checkout.${ext}`).default;
    });

    after(function () {
      JWTAuth.verify = realVerify;
      for (const name of names) (global as any)[name] = realGlobals[name];
    });

    const check = async () =>
      (await checkoutResolvers.Mutation.checkOrder.fn(null, { orderCheckout: { orderId: "cart", serviceType: "delivery", address: { formatted: "Street 1", home: "1" }, customer: {} } }, context)).message;

    it("a delivery refused says the least sum of the zone with its number", async function () {
      refusal = { code: 11, error: "Delivery not allowed" };
      expect(await check()).to.include({ type: "error", code: 11, message: "Minimum order amount: 600" });
    });

    it("an RMS refusal says the RMS's own words", async function () {
      refusal = { code: 30, error: "Не достигнута минимальная сумма заказа" };
      expect(await check()).to.include({ code: 30, message: "Не достигнута минимальная сумма заказа" });
    });
  });
}
