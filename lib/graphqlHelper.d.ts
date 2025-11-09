/**
 * Adds a model to the list of models for creating GraphQL schema types
 *
 *
 * @param modelName string
 * @returns void
 */
declare function addModel(modelName: string): void;
declare function addType(type: string): void;
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
declare function addResolvers(resolvers: object): void;
/**
 * Scans all sails models and adds them to the list of models for creating GraphQL schema types
 */
declare function addAllSailsModels(): void;
/**
 * Adds an array of exceptions to the current list
 * Options:
 * 1. ["Order.field"] - excludes field in Order model
 * 2. ["Order"] - excludes Order model completely
 * 3. ["field"] - excludes field from all models
 *
 * @param list array<string>
 */
declare function addToBlackList(list: Array<string>): void;
/**
 * Adds a new field to the specified model
 * Example: addCustomField("Order", "customField: string")
 *
 * @param model string
 * @param field string
 */
declare function addCustomField(model: any, field: any): void;
/**
 * Adds a field to the auto-replace list.
 * Example: addToReplaceList("Dish.image", "image: [Image]");
 *
 * @param model string
 * @param field string
 */
declare function addToReplaceList(model: any, field: any): void;
/**
 * Scans the specified directory and adds found resolvers to the GraphQL schema
 *
 * @param dir
 */
declare function addDirResolvers(dir: any): void;
/**
 * Starts schema and resolvers generation
 * Returns ready data for use during Apollo server initialization
 *
 * @returns {schemaTypes, schemaResolvers}
 */
declare function getSchema(): {
    typeDefs: string;
    resolvers: Resolvers;
};
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
declare function setWhiteList(list: object): void;
/**
 * Generates a resolver for the model. Takes into account the list of exceptions and whiteList
 *
 * @param modelname string
 * @returns void
 */
declare function addModelResolver(modelname: any): void;
declare const _default: {
    addModel: typeof addModel;
    addType: typeof addType;
    addResolvers: typeof addResolvers;
    getSchema: typeof getSchema;
    addToBlackList: typeof addToBlackList;
    addCustomField: typeof addCustomField;
    addToReplaceList: typeof addToReplaceList;
    addAllSailsModels: typeof addAllSailsModels;
    addDirResolvers: typeof addDirResolvers;
    addModelResolver: typeof addModelResolver;
    setWhiteList: typeof setWhiteList;
};
export default _default;
export { addModel, addType, addResolvers, getSchema, addToBlackList, addCustomField, addToReplaceList, addAllSailsModels, addDirResolvers, addModelResolver, setWhiteList };
interface Resolvers {
    Query?: Resolver;
    Mutation?: Resolver;
    Subscription?: Resolver;
}
interface Resolver {
    [name: string]: {
        def?: string;
        fn?: object;
        subscribe?: object;
        resolve?: object;
        [x: string]: object | string;
    };
}
