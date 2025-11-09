"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlHelper_1 = require("../../lib/graphqlHelper");
graphqlHelper_1.default.addType(`#graphql
  type Telemetry {
    "System uptime in seconds"
    uptime: Float
    i18n: String
    locale: String
  }
`);
exports.default = {
    Query: {
        telemetry: {
            def: 'telemetry: Telemetry',
            fn: () => ({})
        }
    },
    Telemetry: {
        uptime: () => process.uptime(),
        //@ts-ignore
        i18n: (parent, args, context, info) => context.i18n.__('Status here'),
        locale: (parent, args, context, info) => context.connectionParams.locale
    }
};
