'use strict';
/// <reference path="../node_modules/@webresto/core/interfaces/globalTypes.d.ts"/>

const helper = require('./lib/graphqlHelper').default;

module.exports = function (sails) {
  return {
    defaults: require('./lib/defaults'),
    initialize: require('./lib/initialize').default(sails)
  };
};

export * from './lib/eventHelper';
export * from './lib/graphqlHelper';