import graphql from '../src/graphql';
import bindTranslations from './bindTranslations';
let cache = null;
import { getRandom } from "./eventHelper";

declare var sails: any;

export default async function () {
  try {

    sails.log.debug('>>> graphql hook starting');
    sails.on('clear_cache', async function (){
      cache = null;
    });
    sails.on('lifted', async function (){
      try {
        const graphServer = await graphql.init();

        // inject middleware into express app
        sails.hooks.http.app.use(graphServer.getMiddleware());
        let layer = sails.hooks.http.app._router.stack.slice(-1)[0]
        sails.hooks.http.app._router.stack.splice(1, 0, layer)
        graphServer.installSubscriptionHandlers(sails.hooks.http.server);
        sails.emit('graphql-middleware:loaded');
      } catch (error) {
        sails.emit('graphql-middleware:error');
        sails.log.error('GraphQL init error:',error);
        sails.log.error('Critical GraphQL schema error, shutting down application');
        process.exit(1);
      }
    });


    if (!await Settings.get("JWT_SECRET")) {
      const random = getRandom(36);
      await Settings.set("JWT_SECRET", {key: "JWT_SECRET", value: random})
    }


    bindTranslations()
  } catch (e) {
    sails.log.error('graphql > afterHook > error1', e);
  }
}

