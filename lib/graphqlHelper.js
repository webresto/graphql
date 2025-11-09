"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addModel = addModel;
exports.addType = addType;
exports.addResolvers = addResolvers;
exports.getSchema = getSchema;
exports.addToBlackList = addToBlackList;
exports.addCustomField = addCustomField;
exports.addToReplaceList = addToReplaceList;
exports.addAllSailsModels = addAllSailsModels;
exports.addDirResolvers = addDirResolvers;
exports.addModelResolver = addModelResolver;
exports.setWhiteList = setWhiteList;
const _ = require("lodash");
const worktime_1 = require("@webresto/worktime");
const WLCriteria = require("waterline-criteria");
const jwt_1 = require("./jwt");
const fs = require("fs");
const path = require("path");
const scalarTypes = {
    string: "String",
    number: "Float",
    boolean: "Boolean",
    // json: "Json",
    // "array": "Array",
};
const schemaResolvers = {};
const schemaTypes = [];
const schemaUnions = {};
const schemaScalars = new Set();
const blackList = [];
const customFields = {};
const replaceList = {};
const models = new Set();
/**
 * Adds a model to the list of models for creating GraphQL schema types
 *
 *
 * @param modelName string
 * @returns void
 */
function addModel(modelName) {
    modelName = firstLetterToUpperCase(modelName);
    if (blackList.includes(modelName)) {
        // schemaScalars.add(modelName);
        return;
    }
    models.add(modelName.toLowerCase());
}
function addType(type) {
    schemaTypes.push(type);
}
/**
 * Merges a new resolver with the resolvers object. The new resolver will replace the old one if names match
 *
 * @param resolvers
 * resolverExample = {
 *      def: "user(id: string)",
 *      fn: function (parent, args, context) {
 *          return User.find({id: args.id})
 *      }
 * }
 */
function addResolvers(resolvers) {
    _.merge(schemaResolvers, resolvers);
}
/**
 * Scans all sails models and adds them to the list of models for creating GraphQL schema types
 */
function addAllSailsModels() {
    Object.keys(sails.models).forEach((key) => {
        if (key.includes("__"))
            return;
        if (sails.models[key].graphql && sails.models[key].graphql.public === false) {
            addToBlackList([key]);
            return;
        }
        addModel(key);
    });
}
/**
 * Adds an array of exceptions to the current list
 * Options:
 * 1. ["Order.field"] - excludes field in Order model
 * 2. ["Order"] - excludes Order model completely
 * 3. ["field"] - excludes field from all models
 *
 * @param list array<string>
 */
function addToBlackList(list) {
    blackList.push(...list);
}
/**
 * Adds a new field to the specified model
 * Example: addCustomField("Order", "customField: string")
 *
 * @param model string
 * @param field string
 */
function addCustomField(model, field) {
    customFields[model] = customFields[model] === undefined ? "" : customFields[model];
    customFields[model] += `${field}\n`;
}
/**
 * Adds a field to the auto-replace list.
 * Example: addToReplaceList("Dish.image", "image: [Image]");
 *
 * @param model string
 * @param field string
 */
function addToReplaceList(model, field) {
    replaceList[model] = field;
}
/**
 * Scans the specified directory and adds found resolvers to the GraphQL schema
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
 * Starts schema and resolvers generation
 * Returns ready data for use during Apollo server initialization
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
 * Iterates through all model fields and generates a type for the GraphQL schema
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
                scalarType = "Phone";
            }
            else {
                const attrType = attributes[prop].type;
                if (typeof attrType === 'string' && scalarTypes[attrType.toLowerCase()]) {
                    scalarType = scalarTypes[attrType.toLowerCase()];
                }
                else if (typeof attrType === 'string') {
                    scalarType = firstLetterToUpperCase(attrType);
                    schemaScalars.add(scalarType);
                }
                else {
                    sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - invalid type:`, attrType);
                    continue;
                }
            }
            type += '  ' + prop + ': ' + scalarType + '\n';
        }
        // MODEL SCHEMA GENERATION
        if (attributes[prop].model) {
            let relationModel = sails.models[attributes[prop].model.toLowerCase()];
            if (!relationModel || !relationModel.attributes || !relationModel.primaryKey) {
                sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - relation model not found or invalid:`, attributes[prop].model);
                continue;
            }
            const primaryKeyAttr = relationModel.attributes[relationModel.primaryKey];
            if (!primaryKeyAttr || !primaryKeyAttr.type) {
                sails.log.error(`GraphQL: Skipping field ${modelName}.${prop} - relation model primary key type not found`);
                continue;
            }
            scalarType = scalarTypes[primaryKeyAttr.type.toLowerCase()];
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
 * Combines resolvers and types. Separates query descriptions from resolvers.
 * Returns the ready schema and resolvers for use in Apollo server
 *
 * @param typeDefsObj
 * @returns
 */
function createSchema(typeDefsObj) {
    let schema = '';
    const resolvers = {};
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
            }
            else {
                if (res.def) {
                    schema += '\n' + res.def + '\n';
                }
                if (res.fn) {
                    resolvers[key] = res.fn;
                }
                else {
                    resolvers[key] = res;
                }
            }
        });
    }
    return { typeDefs: schema, resolvers };
}
// AUTOGENERATE RESOLVERS -----------------------------------------------
// Generation of resolvers based on the list of models. The list of models is automatically added to the schema.
const whiteList = {
// group: ['subscription', 'query'] // order - modelname , 'subscription' - resolver type
};
let modelsResolvers = { Query: {} };
const apollo_server_1 = require("apollo-server");
/**
 * Patches waterline criteria during auto-generation
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
 * Adds whiteList
 * Example: setWhiteList({
    page: ['query'],
    promotion: ['query'],
    maintenance: ['query', 'subscription']
  })
 *
 * @param list
 */
function setWhiteList(list) {
    _.merge(whiteList, list);
}
/**
 * Generates a resolver for the model. Takes into account the list of exceptions and whiteList
 *
 * @param modelname string
 * @returns void
 */
function addModelResolver(modelname) {
    if (!sails.models[modelname])
        return;
    let modelName = sails.models[modelname].globalId;
    if (!modelName) {
        sails.log.error('graphql >>> Wrong Model Name :' + modelname);
        return;
    }
    // Query resolver
    if (whiteList[modelname].includes('query') && !blackList.includes(`${modelName}`)) {
        models.add(modelname); // make schema Type for Model
        const methodName = firstLetterToLowerCase(modelName);
        let resolverQuery = {
            def: `""" [autogenerated] ${isAuthRequired(modelname) ? '\n[auth required]' : ''}""" ${methodName}(criteria: Json, skip: Int, limit: Int, sort: String): [${modelName}]`,
            fn: async function (parent, args, context) {
                let criteria = args.criteria || {};
                criteria = sanitizeCriteria(modelname, criteria);
                // If model has User field need auth
                if (isAuthRequired(modelName)) {
                    let auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                        if (modelName.toLowerCase() === "user") {
                            criteria.id = auth.userId;
                        }
                        else {
                            criteria.user = auth.userId;
                        }
                    }
                    else {
                        throw 'Authorization failed';
                    }
                }
                let query;
                if (criteria.where === undefined) {
                    query = { where: criteria };
                }
                else {
                    query = criteria;
                }
                //sorting
                if (sails.models[modelname].attributes.sortOrder) {
                    query.sort = 'sortOrder ASC';
                }
                let ORMrequest = sails.models[modelname].find(query);
                if (args.skip) {
                    ORMrequest.skip(args.skip);
                }
                if (args.limit) {
                    ORMrequest.limit(args.limit);
                }
                if (args.sort) {
                    ORMrequest.sort(args.sort);
                }
                else {
                    if (sails.models[modelname].attributes.sortOrder) {
                        ORMrequest.sort('sortOrder ASC');
                    }
                }
                let result = await ORMrequest;
                emitter.emit(`graphql-query-${modelname}`, result);
                //worktime filter
                if (sails.models[modelname].attributes.worktime) {
                    result = result.filter(record => {
                        if (!record.worktime)
                            return true;
                        try {
                            return (worktime_1.WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow;
                        }
                        catch (error) {
                            sails.log.error("Graphql > helper > error: ", error);
                        }
                    });
                }
                result.forEach(item => {
                    emitter.emit(`http-api:before-send-${modelname.toLowerCase()}`, item);
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
                    let auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                    if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                        if (modelName.toLowerCase() === "user") {
                            criteria.id = auth.userId;
                        }
                        else {
                            criteria.user = auth.userId;
                        }
                    }
                    else {
                        throw 'Authorization failed';
                    }
                }
                let query;
                if (criteria.where === undefined) {
                    query = { where: criteria };
                }
                else {
                    query = criteria;
                }
                let ORMrequest = sails.models[modelname].find(query);
                let result = await ORMrequest;
                //worktime filter
                if (sails.models[modelname].attributes.worktime) {
                    result = result.filter(record => {
                        if (!record.worktime)
                            return true;
                        try {
                            return (worktime_1.WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow;
                        }
                        catch (error) {
                            sails.log.error("Graphql > helper > error: ", error);
                        }
                    });
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
        if (key.includes("__"))
            return;
        if (blackList.includes(`${modelName}.${key}`) || blackList.includes(`${key}`))
            return;
        if (typeof sails.models[modelname].attributes[key] === 'function')
            return;
        if (sails.models[modelname].attributes[key].graphql) {
            if (sails.models[modelname].attributes[key].graphql.public === false)
                return;
        }
        let modelAttribute = sails.models[modelname].attributes[key];
        if (modelAttribute.collection || modelAttribute.model) {
            let modelRelationType = modelAttribute.collection
                ? "collection"
                : "model";
            let relationKey = modelAttribute.via !== undefined
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
                            let auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                            if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                                if (modelName.toLowerCase() === "user") {
                                    criteria["id"] = auth.userId;
                                }
                                else {
                                    criteria["user"] = auth.userId;
                                }
                            }
                            else {
                                throw 'Authorization failed';
                            }
                        }
                        let result = await sails.models[modelAttribute[modelRelationType]].findOne(criteria);
                        // TODO: this need only for support legacy patching (discount)
                        emitter.emit(`http-api:before-send-${modelAttribute.model.toLowerCase()}`, result);
                        // celan if not work time
                        if (result && result.worktime && !worktime_1.WorkTimeValidator.isWorkNow({ worktime: result.worktime }).workNow) {
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
                        let parentPrimaryKey = sails.models[modelname].primaryKey;
                        let criteria = {};
                        criteria[relationKey] = parent[parentPrimaryKey];
                        criteria = sanitizeCriteria(modelAttribute[modelRelationType], criteria);
                        // Check access rights
                        if (isAuthRequired(modelAttribute[modelRelationType])) {
                            let auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                            if (auth.userId && UserDevice.checkSession(auth.sessionId, auth.userId, { lastIP: "IP", userAgent: context.connectionParams["user-agent"] })) {
                                if (modelName.toLowerCase() === "user") {
                                    criteria["id"] = auth.userId;
                                }
                                else {
                                    criteria["user"] = auth.userId;
                                }
                            }
                            else {
                                throw 'Authorization failed';
                            }
                        }
                        let result = null;
                        let sortingCriteriaThrough = undefined;
                        if (modelAttribute.through && sails.models[modelAttribute.through] && sails.models[modelAttribute.through].attributes.sortOrder) {
                            sortingCriteriaThrough = { sort: 'sortOrder ASC' };
                        }
                        result = (await sails.models[modelname].findOne({ id: parent.id }).populate(key, sortingCriteriaThrough))[key];
                        // This is strange for collections, but let it be for now. Collections if they will store sorting queue then this turns out to be global for the record, not for the connection
                        if (result && modelAttribute.through === undefined && sails.models[modelAttribute[modelRelationType]].attributes.sortOrder) {
                            result.sort((a, b) => a.sortOrder - b.sortOrder);
                        }
                        if (!result)
                            result = [];
                        // TODO: this need only for support legacy patching (discount)
                        if (result && result.length) {
                            result.forEach(item => {
                                emitter.emit(`http-api:before-send-${modelAttribute.collection.toLowerCase()}`, item);
                            });
                        }
                        if (sails.models[modelAttribute[modelRelationType]].attributes.worktime && Array.isArray(result) && result.length > 0) {
                            result = result.filter(record => {
                                if (!record.worktime)
                                    return true;
                                try {
                                    return (worktime_1.WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow;
                                }
                                catch (error) {
                                    sails.log.error("Graphql > helper > error: ", error);
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
                subscribe: (0, apollo_server_1.withFilter)((rootValue, args, context, info) => context.pubsub.asyncIterator(modelName), async (payload, args, context, info) => {
                    // For User models
                    if (sails.models[modelname].attributes.user || modelname === 'user') {
                        let auth = await jwt_1.JWTAuth.verify(context.connectionParams.authorization);
                        if (!args.criteria) {
                            args.criteria = {};
                        }
                        if (auth.userId) {
                            if (modelName.toLowerCase() === "user") {
                                args.criteria.id = auth.userId;
                            }
                            else {
                                args.criteria.user = auth.userId;
                            }
                        }
                        else {
                            throw 'Authorization failed';
                        }
                    }
                    return checkCriteria(payload, args.criteria);
                    // Filter by waterline criteria
                    function checkCriteria(payload, criteria) {
                        // For id's array
                        if (Array.isArray(criteria) || typeof criteria === "string") {
                            return (WLCriteria(payload, { where: { id: criteria } }).results).length > 0;
                        }
                        // Where cause
                        if (typeof criteria === 'object' && !Array.isArray(criteria) && criteria !== null) {
                            return (WLCriteria(payload, { where: criteria }).results).length > 0;
                        }
                        return false;
                    }
                }),
                resolve: (payload) => {
                    return payload;
                },
            },
        };
        // add publish in model
        modelPublishExtend(modelname);
        if (!modelsResolvers.Subscription)
            modelsResolvers.Subscription = {};
        modelsResolvers.Subscription[methodName] = subscription;
    }
}
/**
 * Internal function used during resolver auto-generation
 * Modifies the model. Adds message broadcasting on afterUpdate & afterCreate
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
        }
        else {
            cb();
        }
    };
    let afterUpdate = sails.models[modelname].afterUpdate;
    sails.models[modelname].afterUpdate = async function (values, cb) {
        await sails.models[modelname].publish(values.id);
        if (afterUpdate) {
            afterUpdate(values, cb);
        }
        else {
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
function isAuthRequired(modelname) {
    modelname = modelname.toLowerCase();
    return sails.models[modelname].attributes.user !== undefined || modelname === 'user';
}
exports.default = {
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
};
