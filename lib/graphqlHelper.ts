import _ = require("lodash");
import { WorkTimeValidator } from '@webresto/worktime'

import *  as WLCriteria from 'waterline-criteria';
import { JWTAuth } from "./jwt";

import * as fs from 'fs';
import * as path from 'path';

const scalarTypes = {
  string: "String",
  number: "Float",
  boolean: "Boolean",
  // json: "Json",
  // "array": "Array",
}

const schemaResolvers = {};
const schemaTypes = [];
const schemaUnions = {};
const schemaScalars: Set<string> = new Set();
const blackList = [];
const customFields = {};
const replaceList = {};

const models: Set<string> = new Set();

/**
 * Добавляет модель в список моделей для создания типов схемы graphql
 *
 *
 * @param modelName string
 * @returns void
 */

function addModel(modelName: string) {
  modelName = firstLetterToUpperCase(modelName);
  if (blackList.includes(modelName)) {
    // schemaScalars.add(modelName);
    return;
  }
  models.add(modelName.toLowerCase());
}

function addType(type: string) {
  schemaTypes.push(type);
}
/**
 * Мержит новый резолвер с объектом резолверов. Новый резолвер заменит старый при совпадении имен
 *
 * @param resolvers
 * resolverExample = {
 *      def: "user(id: string)",
 *      fn: function (parent, args, context) {
 *          return User.find({id: args.id})
 *      }
 * }
 */
function addResolvers(resolvers: object) {
  _.merge(schemaResolvers, resolvers);
}

/**
 * Сканирует все модели sails и добавляет их в список моделей для создания типов схемы graphql
 */
function addAllSailsModels() {
  Object.keys(sails.models).forEach((key) => {
    if (key.includes("__")) return;
    if (sails.models[key].graphql && sails.models[key].graphql.public === false) {
      addToBlackList([key]);
      return;
    }
    addModel(key);
  });
}

/**
 * Добавляет массив с исключениями к текущему списку
 * Варианты:
 * 1. ["Order.field"] - исключает поле field в модели Order
 * 2. ["Order"] - исключает модель Order полностью
 * 3. ["field] - исключает поле field из всех моделей
 *
 * @param list array<string>
 */
function addToBlackList(list: Array<string>) {
  blackList.push(...list);
}

/**
 * Добавляет в указаную модель новое поле
 * Пример: addCustomField("Order", "customField: string")
 *
 * @param model string
 * @param field string
 */
function addCustomField(model, field) {
  customFields[model] = customFields[model] === undefined ? "" : customFields[model]
  customFields[model] += `${field}\n`;
}

/**
 * Добавляет в список автозамены поле.
 * Пример: addToReplaceList("Dish.image", "image: [Image]");
 *
 * @param model string
 * @param field string
 */
function addToReplaceList(model, field) {
  replaceList[model] = field;
}

/**
 * Сканирует указанную директорию и добавляет найденные резолверсы в схему graphql
 *
 * @param dir
 */
function addDirResolvers(dir) {
  let files = fs.readdirSync(dir);
  for (let file of files) {
    if (file.substr(-3) == ".js") {
      const resolver = require(path.join(dir, file)).default;
      if (resolver) {
        addResolvers(resolver);
      }
    }
  }
}

/**
 * Запускает генерацию схемы и резолверсов
 * Возвращает готовые данные для использования при инициализации apollo server
 *
 * @returns {schemaTypes, schemaResolvers}
 */
function getSchema() {
  Object.keys(whiteList).forEach(modelname => {
    if (sails.models[modelname]?.graphql?.public !== false) {
      addModelResolver(modelname);
    }
  });

  addResolvers(modelsResolvers);
  return createSchema({ types: schemaTypes, resolvers: schemaResolvers });
}

function firstLetterToUpperCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function firstLetterToLowerCase(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * Перебирает все поля модели и генерирует тип для схемы graphql
 *
 * @param model sails.model
 * @returns string
 */
function createType(model) {
  if (!model) {
    console.error('GraphQL: Model is undefined');
    return '';
  }
  const modelName = model.globalId;
  if (!modelName) {
    console.error('GraphQL: Model globalId is undefined for model:', model);
    return '';
  }
  const attributes = model._attributes || model.attributes;
  if (!attributes) {
    console.error('GraphQL: Model attributes are undefined for model:', modelName);
    return '';
  }
  let type = 'type ' + modelName + '{\n';
  for (let prop in attributes) {
    if (blackList.includes(`${modelName}.${prop}`) || blackList.includes(prop))
      continue;
    if (replaceList[`${modelName}.${prop}`] || replaceList[prop]) {
      const newField = replaceList[`${modelName}.${prop}`] || replaceList[prop];
      type += `  ${newField}\n`;
      continue;
    }

    let scalarType;
    if (attributes[prop].type) {

      // TODO: make method  add AddModelFieldType(path, type) for pass custom type for specific model
      if (modelName.toLowerCase() === "user" && prop === "phone") {
        scalarType = "Phone"
      } else {
        const attrType = attributes[prop].type;
        if (typeof attrType === 'string' && scalarTypes[attrType.toLowerCase()]) {
          scalarType = scalarTypes[attrType.toLowerCase()];
        } else if (typeof attrType === 'string') {
          scalarType = firstLetterToUpperCase(attrType);
          schemaScalars.add(scalarType);
        } else {
          sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - invalid type:`, attrType);
          continue;
        }
      }
      type += '  ' + prop + ': ' + scalarType + '\n';
    }

    // MODEL SCHEMA GENERATION
    if (attributes[prop].model) {
      let relationModel = sails.models[attributes[prop].model.toLowerCase()]
      if (!relationModel || !relationModel.attributes || !relationModel.primaryKey) {
        sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - relation model not found or invalid:`, attributes[prop].model);
        continue;
      }
      const primaryKeyAttr = relationModel.attributes[relationModel.primaryKey];
      if (!primaryKeyAttr || !primaryKeyAttr.type) {
        sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - relation model primary key type not found`);
        continue;
      }
      scalarType = scalarTypes[primaryKeyAttr.type.toLowerCase()]
      const name = sails.models[attributes[prop].model.toLowerCase()].globalId;
      type += `  ${prop}: ${name}\n`;

      // Virtual Id field
      type += `  ${prop}Id: ${scalarType}\n`;

    }

    // COLLECTION SCHEMA GENERATION
    if (attributes[prop].collection) {
      let collectionModel = sails.models[attributes[prop].collection.toLowerCase()];
      if (!collectionModel || !collectionModel.attributes || !collectionModel.primaryKey) {
        sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - collection model not found or invalid:`, attributes[prop].collection);
        continue;
      }
      const primaryKeyAttr = collectionModel.attributes[collectionModel.primaryKey];
      if (!primaryKeyAttr || !primaryKeyAttr.type) {
        sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - collection model primary key type not found`);
        continue;
      }
      scalarType = scalarTypes[primaryKeyAttr.type.toLowerCase()];
      const name = sails.models[attributes[prop].collection.toLowerCase()].globalId;
      type += `  ${prop}: [${name}]\n`;
    }
  }
  if (customFields[modelName]) {
    type += `  ${customFields[modelName]}\n`;
  }
  if (!attributes.customData) {
    type += `""" [autogenerated] ${isAuthRequired(modelName) ? '\n[auth required]' : ''}"""  customData: Json`;
  }
  type += '}\n';
  return type;
}

/**
 * Соеденяет резолверсы и типы. Отделяет от резолверсов описание запросов.
 * Возвращает готовую схему и резолверсы для использования в apollo server
 *
 * @param typeDefsObj
 * @returns
 */
function createSchema(typeDefsObj) {
  let schema = '';
  const resolvers: Resolvers = {};
  if (Array.isArray(typeDefsObj.types)) {
    schema += typeDefsObj.types.join('\n');
  }
  // add types from models
  for (let model of models) {
    const sailsModel = sails.models[model];
    if (!sailsModel) {
      sails.log.error(`GraphQL: Skipping model ${model} - not found in sails.models`);
      continue;
    }
    if (!sailsModel.globalId) {
      sails.log.error(`GraphQL: Skipping model ${model} - no globalId defined`);
      continue;
    }
    const typeString = createType(sailsModel);
    if (typeString) {
      schema += typeString;
    }
  }
  // add union
  for (let prop in schemaUnions) {
    schema += `scalar ${prop}\n`;
  }
  // add scalar
  for (let scalar of schemaScalars) {
    schema += `scalar ${scalar}\n`;
  }
  // add resolver and type definition
  if (typeDefsObj.resolvers) {
    Object.keys(typeDefsObj.resolvers).forEach(key => {
      resolvers[key] = {};
      const res = typeDefsObj.resolvers[key];

      if (['Query', 'Mutation', 'Subscription'].includes(key)) {
        let typeString = `extend type ${key}{\n`;
        for (let prop in res) {
          typeString += '  ' + res[prop].def + '\n';
          resolvers[key][prop] = res[prop].fn;
        }
        typeString += '}\n';
        schema += '\n' + typeString;
      } else {
        if (res.def) {
          schema += '\n' + res.def + '\n';
        }
        if (res.fn) {
          resolvers[key] = res.fn;
        } else {
          resolvers[key] = res;
        }
      }
    })
  }
  return { typeDefs: schema, resolvers };
}


// AUTOGENERATE RESOLVERS -----------------------------------------------

// генерация резолверсов по списку моделей. Список моделей автоматически добавляется в схему.
const whiteList = {
  // group: ['subscription', 'query'] // order - modelname , 'subscription' - resolver type
}

let modelsResolvers: { Query?: object, Subscription?: object } = { Query: {} };
import { withFilter } from "apollo-server";

/**
 * Патчит waterline criteria во время автогенерации
 *
 * @param modelname
 * @param criteria
 * @returns
 */
function sanitizeCriteria(modelname, criteria) {

  if (sails.models[modelname].attributes.visible) {
    criteria.visible = true;
  }

  if (sails.models[modelname].attributes.enable) {
    criteria.enable = true;
  }

  if (sails.models[modelname].attributes.isDeleted) {
    criteria.isDeleted = false;
  }

  switch (modelname) {
    case 'dish':
      criteria.balance = { '!=': 0 };
      criteria.isDeleted = false;
      break;
    case 'group':
      criteria.isDeleted = false;
      break;
  }
  return criteria;
}

/**
 * Добавляет whiteList
 * Пример: setWhiteList({
    page: ['query'],
    promotion: ['query'],
    maintenance: ['query', 'subscription']
  })
 *
 * @param list
 */
function setWhiteList(list: object) {
  _.merge(whiteList, list);
}

/**
 * Генерирует резолвер для модели. Учитывает список исключений и whiteList
 *
 * @param modelname string
 * @returns void
 */

function addModelResolver(modelname) {
  if (!sails.models[modelname]) return;
  let modelName = sails.models[modelname].globalId;
  if (!modelName) {
    sails.log.error('graphql >>> Wrong Model Name :' + modelname);
    return;
  }

  // Query resolver
  if (whiteList[modelname].includes('query') && !blackList.includes(`${modelName}`)) {
    models.add(modelname); // make schema Type for Model
    const methodName = firstLetterToLowerCase(modelName)
    let resolverQuery = {
      def: `""" [autogenerated] ${isAuthRequired(modelname) ? '\n[auth required]' : ''}""" ${methodName}(criteria: Json, skip: Int, limit: Int, sort: String): [${modelName}]`,
      fn: async function (parent, args, context) {

        let criteria = args.criteria || {};
        criteria = sanitizeCriteria(modelname, criteria);

        // If model has User field need auth
        if (isAuthRequired(modelName)) {
          let auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
            if (modelName.toLowerCase() === "user") {
              criteria.id = auth.userId
            } else {
              criteria.user = auth.userId
            }
          } else {
            throw 'Authorization failed'
          }
        }


        let query: any;
        if (criteria.where === undefined) {
          query = { where: criteria }
        } else {
          query = criteria
        }

        //sorting
        if (sails.models[modelname].attributes.sortOrder) {
          query.sort = 'sortOrder ASC'
        }


        let ORMrequest = sails.models[modelname].find(query);

        if (args.skip) {
          ORMrequest.skip(args.skip)
        }

        if (args.limit) {
          ORMrequest.limit(args.limit)
        }

        if (args.sort) {
          ORMrequest.sort(args.sort)
        } else {
          if (sails.models[modelname].attributes.sortOrder) {
            ORMrequest.sort('sortOrder ASC')
          }
        }

        let result = await ORMrequest

        emitter.emit(`graphql-query-${modelname}`, result);

        //worktime filter

        if (sails.models[modelname].attributes.worktime) {
          result = result.filter(record => {
            if (!record.worktime) return true;
            try {
              return (WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow
            } catch (error) {
              sails.log.error("Graphql > helper > error: ", error)
            }
          })
        }

        result.forEach(item => {

          emitter.emit(
            `http-api:before-send-${modelname.toLowerCase()}`,
            item
          );
        });

        return result;
      },
    };
    modelsResolvers.Query[methodName] = resolverQuery;


    let resolverQueryCount = {
      def: `""" [autogenerated] ${isAuthRequired(modelname) ? '\n[auth required]' : ''}""" ${methodName}Count(criteria: Json): Int`,
      fn: async function (parent, args, context) {

        let criteria = args.criteria || {};
        criteria = sanitizeCriteria(modelname, criteria);

        // If model has User field need auth
        if (isAuthRequired(modelName)) {
          let auth = await JWTAuth.verify(
            context.connectionParams.authorization
          );

          if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
            if (modelName.toLowerCase() === "user") {
              criteria.id = auth.userId
            } else {
              criteria.user = auth.userId
            }
          } else {
            throw 'Authorization failed'
          }
        }


        let query: any;
        if (criteria.where === undefined) {
          query = { where: criteria }
        } else {
          query = criteria
        }



        let ORMrequest = sails.models[modelname].find(query);

        let result = await ORMrequest

        //worktime filter
        if (sails.models[modelname].attributes.worktime) {
          result = result.filter(record => {
            if (!record.worktime) return true;
            try {
              return (WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow
            } catch (error) {
              sails.log.error("Graphql > helper > error: ", error)
            }
          })
        }

        return result.length;
      },
    };

    modelsResolvers.Query[`${methodName}Count`] = resolverQueryCount;

  }
  // Model fields resolvers
  let resolvers = {};
  // iterate separate resolvers in model (type])
  Object.keys(sails.models[modelname].attributes).forEach((key) => {
    if (key.includes("__")) return;
    if (blackList.includes(`${modelName}.${key}`) || blackList.includes(`${key}`)) return;
    if (typeof sails.models[modelname].attributes[key] === 'function') return;

    if (sails.models[modelname].attributes[key].graphql) {
      if (sails.models[modelname].attributes[key].graphql.public === false)
        return;
    }

    let modelAttribute = sails.models[modelname].attributes[key];

    if (modelAttribute.collection || modelAttribute.model) {
      let modelRelationType = modelAttribute.collection
        ? "collection"
        : "model";

      let relationKey =
        modelAttribute.via !== undefined
          ? modelAttribute.via
          : "id";



      switch (modelRelationType) {
        case "model":
          resolvers[key] = async (parent, args, context) => {
            let criteria = {};
            criteria[relationKey] = parent[key];
            criteria = sanitizeCriteria(modelAttribute[modelRelationType], criteria);

            // Check access rights
            if (isAuthRequired(modelAttribute[modelRelationType])) {
              let auth = await JWTAuth.verify(
                context.connectionParams.authorization
              );

              if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                if (modelName.toLowerCase() === "user") {
                  criteria["id"] = auth.userId
                } else {
                  criteria["user"] = auth.userId
                }
              } else {
                throw 'Authorization failed'
              }
            }

            let result = await sails.models[modelAttribute[modelRelationType]].findOne(criteria);

            // TODO: this need only for support legacy patching (discount)
            emitter.emit(
              `http-api:before-send-${modelAttribute.model.toLowerCase()}`,
              result
            );

            // celan if not work time
            if (result && result.worktime && !WorkTimeValidator.isWorkNow({ worktime: result.worktime }).workNow) {
              result = null;
            }
            return result;
          };

          // add virtual ids  
          resolvers[`${key}Id`] = async (parent, args, context) => {
            return parent && parent[key];
          };

          return;
        case "collection":
          resolvers[key] = async (parent, args, context) => {
            let parentPrimaryKey = sails.models[modelname].primaryKey
            let criteria = {}
            criteria[relationKey] = parent[parentPrimaryKey];
            criteria = sanitizeCriteria(modelAttribute[modelRelationType], criteria);

            // Check access rights
            if (isAuthRequired(modelAttribute[modelRelationType])) {
              let auth = await JWTAuth.verify(
                context.connectionParams.authorization
              );

              if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                if (modelName.toLowerCase() === "user") {
                  criteria["id"] = auth.userId
                } else {
                  criteria["user"] = auth.userId
                }
              } else {
                throw 'Authorization failed'
              }
            }

            let result: any = null;
            let sortingCriteriaThrough = undefined;
            if(modelAttribute.through && sails.models[modelAttribute.through] && sails.models[modelAttribute.through].attributes.sortOrder){
              sortingCriteriaThrough = { sort: 'sortOrder ASC' };
            }
            result = (await sails.models[modelname].findOne({ id: parent.id }).populate(key, sortingCriteriaThrough))[key];
            
            // Это странно для коллекций, но пусть пока будет. Коллекции если будут хранить очередь сортировки то это получается глобально для записи а не для связи
            if (result && modelAttribute.through === undefined && sails.models[modelAttribute[modelRelationType]].attributes.sortOrder) {
              result.sort((a, b) => a.sortOrder - b.sortOrder);
            }
            
            if (!result) result = []

            // TODO: this need only for support legacy patching (discount)
            if (result && result.length) {
              result.forEach(item => {
                emitter.emit(
                  `http-api:before-send-${modelAttribute.collection.toLowerCase()}`,
                  item
                );
              });
            }

            if (sails.models[modelAttribute[modelRelationType]].attributes.worktime && Array.isArray(result) && result.length > 0) {
              result = result.filter(record => {
                if (!record.worktime) return true
                try {
                  return (WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow
                } catch (error) {
                  sails.log.error("Graphql > helper > error: ", error)
                }
              });
            }

            return result;
          };

          return;
        default:
          // empty
          break;
      }
    }

    resolvers[key] = async (parent, args, context) => {
      return parent && parent[key];
    };
  });

  modelsResolvers[modelName] = resolvers;


  // Subscription resolver
  if (!blackList.includes(`${modelName}`) && whiteList[modelname].includes('subscription')) {
    models.add(modelname);
    const methodName = `${firstLetterToLowerCase(modelName)}`;
    let subscription = {
      def: `""" [autogenerated] ${isAuthRequired(modelname) ? '\n[auth required]' : ''} """ ${methodName}(criteria: Json): ${modelName} `,
      fn: {
        subscribe: withFilter(
          (rootValue, args, context, info) =>
            context.pubsub.asyncIterator(modelName),
          async (payload, args, context, info) => {

            // For User models
            if (sails.models[modelname].attributes.user || modelname === 'user') {

              let auth = await JWTAuth.verify(
                context.connectionParams.authorization
              );

              if (!args.criteria) {
                args.criteria = {}
              }

              if (auth.userId) {
                if (modelName.toLowerCase() === "user") {
                  args.criteria.id = auth.userId
                } else {
                  args.criteria.user = auth.userId
                }
              } else {
                throw 'Authorization failed'
              }
            }

            return checkCriteria(payload, args.criteria)

            // Filter by waterline criteria
            function checkCriteria(payload: any, criteria: any): boolean {

              // For id's array
              if (Array.isArray(criteria) || typeof criteria === "string") {
                return (WLCriteria(payload, { where: { id: criteria } }).results).length > 0
              }

              // Where cause
              if (typeof criteria === 'object' && !Array.isArray(criteria) && criteria !== null) {
                return (WLCriteria(payload, { where: criteria }).results).length > 0
              }

              return false
            }

          }
        ),
        resolve: (payload) => {
          return payload;
        },
      },
    };
    // add publish in model
    modelPublishExtend(modelname);
    if (!modelsResolvers.Subscription) modelsResolvers.Subscription = {};
    modelsResolvers.Subscription[methodName] = subscription;
  }
}

/**
 * Внутренняя функция используется при автогенерации резолверов
 * Модифицирует модель. Добавляет рассылку сообщений при afterUpdate & afterCreate
 *
 * @param modelname
 */
function modelPublishExtend(modelname) {
  let modelName = sails.models[modelname].globalId;

  let afterCreate = sails.models[modelname].afterCreate;
  sails.models[modelname].afterCreate = async function (values, cb) {
    await sails.models[modelname].publish(values.id);
    if (afterCreate) {
      afterCreate(values, cb);
    } else {
      cb();
    }
  };

  let afterUpdate = sails.models[modelname].afterUpdate;
  sails.models[modelname].afterUpdate = async function (values, cb) {
    await sails.models[modelname].publish(values.id);
    if (afterUpdate) {
      afterUpdate(values, cb);
    } else {
      cb();
    }
  };

  let modelPublishExtendObj = {
    publish: async function (id) {
      let data = await sails.models[modelname].findOne(id);
      // `http-api:request-${modelAttribute.collection.toLowerCase()}model-list`,

      emitter.emit(`http-api:before-send-${modelname.toLowerCase()}`, data);
      sails.graphql.pubsub.publish(modelName, data);
    },
  };

  _.merge(sails.models[modelname], modelPublishExtendObj);
}

function isAuthRequired(modelname: string): Boolean {
  modelname = modelname.toLowerCase();
  return sails.models[modelname].attributes.user !== undefined || modelname === 'user';
}

export default {
  addModel,
  addType,
  addResolvers,
  getSchema,

  addToBlackList,
  addCustomField,
  addToReplaceList,
  addAllSailsModels,
  addDirResolvers,

  addModelResolver,
  setWhiteList
}
export {
  addModel,
  addType,
  addResolvers,
  getSchema,

  addToBlackList,
  addCustomField,
  addToReplaceList,
  addAllSailsModels,
  addDirResolvers,

  addModelResolver,
  setWhiteList
}

interface Resolvers {
  Query?: Resolver,
  Mutation?: Resolver,
  Subscription?: Resolver
}
interface Resolver {
  [name: string]: {
    def?: string,
    fn?: object,
    subscribe?: object,
    resolve?: object,
    [x: string]: object | string
  }
}
