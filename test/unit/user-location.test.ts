import { expect } from "chai";
import { createRequire } from "module";
import * as path from "path";

/**
 * Saved addresses are the caller's own: an id of someone else's location is
 * refused like an id that does not exist.
 *
 * The resolvers are called directly against in-memory rows. Both the sources
 * and the compiled pair are run: the stand loads the `.js`.
 */
for (const ext of ["ts", "js"]) {
  describe(`UserLocation resolvers, owner only (${ext})`, function () {
    type Row = Record<string, any>;

    const names = ["sails", "Settings", "UserLocation", "Order"];
    const realGlobals: Row = {};
    let JWTAuth: any;
    let realVerify: unknown;
    let locationResolvers: any;
    let checkoutResolvers: any;

    let locations: Row[] = [];
    let checkedAddress: unknown;
    let defaultSetFor: unknown[];

    const matches = (row: Row, criteria: Row) => Object.entries(criteria).every(([key, value]) => row[key] === value);

    /** The caller is whoever the token names. */
    const as = (userId: string | null) => ({
      connectionParams: { authorization: userId, deviceId: "device" },
      i18n: { __: (text: string, ...args: unknown[]) => args.reduce<string>((line, arg) => line.replace("%s", String(arg)), text) },
    });

    before(function () {
      for (const name of names) realGlobals[name] = (global as any)[name];
      const log = { error() {}, warn() {}, info() {}, debug() {}, silly() {}, verbose() {} };
      (global as any).sails = { log, config: {} };
      (global as any).Settings = { get: async () => undefined };

      (global as any).UserLocation = {
        findOne: async (criteria: Row) => locations.find((row) => matches(row, criteria)),
        destroy: (criteria: Row) => ({
          fetch: async () => {
            const gone = locations.filter((row) => matches(row, criteria));
            locations = locations.filter((row) => !gone.includes(row));
            return gone;
          },
        }),
        setDefault: async (...args: unknown[]) => {
          defaultSetFor = args;
        },
      };

      const order = { id: "cart", state: "CART" };
      (global as any).Order = {
        findOne: async () => ({ ...order }),
        populate: async () => ({ ...order }),
        isOrderedState: () => false,
        update: () => ({ fetch: async () => [order] }),
        check: async (_criteria: unknown, _customer: unknown, _serviceType: unknown, address: unknown) => {
          checkedAddress = address;
        },
      };

      // On behalf of a file of the same kind: tsx hands a TypeScript importer
      // the `.ts` even when it asks for the `.js`.
      const load = createRequire(path.join(__dirname, "../../src/resolvers", `index.${ext}`));
      JWTAuth = load(`../../lib/jwt.${ext}`).JWTAuth;
      realVerify = JWTAuth.verify;
      JWTAuth.verify = async (token: string) => ({ userId: token });

      locationResolvers = load(`./userLocation.${ext}`).default;
      checkoutResolvers = load(`./checkout.${ext}`).default;
    });

    after(function () {
      JWTAuth.verify = realVerify;
      for (const name of names) (global as any)[name] = realGlobals[name];
    });

    beforeEach(function () {
      locations = [
        { id: "mine", user: "user-1", formatted: "Ленина, 97", coordinate: { lat: 56.8429, lon: 60.6408 } },
        { id: "theirs", user: "user-2", formatted: "Малышева, 45", home: "45" },
      ];
      checkedAddress = undefined;
      defaultSetFor = [];
    });

    const remove = (locationId: string, userId: string) =>
      locationResolvers.Mutation.locationDelete.fn(null, { locationId }, as(userId));

    const check = (locationId: string, userId: string | null) =>
      checkoutResolvers.Mutation.checkOrder.fn(
        null,
        { orderCheckout: { orderId: "cart", serviceType: "delivery", locationId, customer: {} } },
        as(userId),
      );

    it("sets the default among the caller's own locations", async function () {
      await locationResolvers.Mutation.locationSetIsDefault.fn(null, { locationId: "theirs" }, as("user-1"));

      expect(defaultSetFor).to.deep.equal(["user-1", "theirs"]);
    });

    it("deletes the caller's own location", async function () {
      expect(await remove("mine", "user-1")).to.equal(true);
      expect(locations.map((row) => row.id)).to.deep.equal(["theirs"]);
    });

    it("refuses to delete someone else's location, as one that does not exist", async function () {
      const refusals: unknown[] = [];
      for (const id of ["theirs", "nowhere"]) {
        try {
          await remove(id, "user-1");
        } catch (error) {
          refusals.push(error);
        }
      }

      expect(refusals).to.deep.equal(["User location not found", "User location not found"]);
      expect(locations.map((row) => row.id)).to.deep.equal(["mine", "theirs"]);
    });

    it("checks the order with the caller's own location as its address", async function () {
      const response = await check("mine", "user-1");

      expect(response.message?.type).to.not.equal("error");
      expect(checkedAddress).to.deep.equal({
        city: undefined,
        node: null,
        formatted: "Ленина, 97",
        coordinate: { lat: 56.8429, lon: 60.6408 },
      });
    });

    it("refuses someone else's location on the order, as one that does not exist", async function () {
      const foreign = await check("theirs", "user-1");
      const anonymous = await check("mine", null);
      const missing = await check("nowhere", "user-1");

      const refusal = "Problem when checking the order: locationId not found";
      expect([foreign, anonymous, missing].map((response) => response.message.message)).to.deep.equal([
        refusal,
        refusal,
        refusal,
      ]);
      expect(checkedAddress).to.equal(undefined);
    });
  });
}
