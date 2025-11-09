import User from "@webresto/core/models/User"
export interface RestoGraphQLConfig { 
  // /** 
  //  * This method retruns user by context.connectionParams.authorization
  //  *`function(context.connectionParams.authorization){
  //  *  user = ...
  //  *  retrun user
  //  * }`
  //  */
  // authService(token: string): Promise<User>
  whiteListAutoGen?: {[key: string]: string[]}
  blackList?: string[]
}