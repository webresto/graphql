"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const graphql_1 = require("../src/graphql");
const bindTranslations_1 = require("./bindTranslations");
let cache = null;
const eventHelper_1 = require("./eventHelper");
async function default_1() {
    try {
        sails.log.debug('>>> graphql hook starting');
        sails.on('clear_cache', async function () {
            cache = null;
        });
        sails.on('lifted', async function () {
            try {
                const graphServer = await graphql_1.default.init();
                // inject middleware into express app
                sails.hooks.http.app.use(graphServer.getMiddleware());
                let layer = sails.hooks.http.app._router.stack.slice(-1)[0];
                sails.hooks.http.app._router.stack.splice(1, 0, layer);
                graphServer.installSubscriptionHandlers(sails.hooks.http.server);
                sails.emit('graphql-middleware:loaded');
            }
            catch (error) {
                sails.emit('graphql-middleware:error');
                const banner = `
====================================================
🚨 CRITICAL GRAPHQL ERROR! Application halted. 🚨
====================================================

❌ Initialization failed:
${error?.stack || error?.message || error}

🕐 App is paused to prevent further corruption.
====================================================
`;
                sails.log.error(banner);
                const sab = new SharedArrayBuffer(4);
                const int32 = new Int32Array(sab);
                Atomics.wait(int32, 0, 0);
            }
        });
        if (!await Settings.get("JWT_SECRET")) {
            const random = (0, eventHelper_1.getRandom)(36);
            await Settings.set("JWT_SECRET", { key: "JWT_SECRET", value: random });
        }
        (0, bindTranslations_1.default)();
    }
    catch (e) {
        sails.log.error('graphql > afterHook > error1', e);
    }
}
