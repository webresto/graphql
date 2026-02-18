import * as eventHelper from "../../lib/eventHelper";
import { Action, Message } from "../../types/primitives";
// todo: fix types model instance to {%ModelName%}Record for Order"
import { OrderHelper } from "@webresto/core/libs/helpers/OrderHelper";


type CheckResponse = {
  order?: Order
  message: Message
  action?: Action
}

import graphqlHelper from "../../lib/graphqlHelper";
import Address from "@webresto/core/interfaces/Address";
import Customer from "@webresto/core/interfaces/Customer";
import { SpendBonus } from "@webresto/core/interfaces/SpendBonus";
import { JWTAuth } from "../../lib/jwt";


interface InputOrderCheckout {
  orderId: string 
  paymentMethodId: string 
  selfService?: boolean
  pickupPointId?: string 
  address?: Address
  locationId: string
  customer: Customer 
  date?: string
  personsCount?: number
  comment: string
  spendBonus: SpendBonus
  customData:{[key: string]: string | number}
}

graphqlHelper.addType(`#graphql    
  input InputOrderCheckout {
    orderId: String! 
    paymentMethodId: String!
    customer: Customer! 
    spendBonus: InputSpendBonus 
    selfService: Boolean
    pickupPointId: String 
    locationId: String
    address: Address
    date: String
    comment: String 
    personsCount: Int
    customData: Json
  }
`);

graphqlHelper.addType(`#graphql    
  input InputSpendBonus {
    bonusProgramId: String!
    amount: Int!
    adapter: String!
    bonusProgramName: String!
  } 
`);

graphqlHelper.addType(`#graphql
  type InitCheckout {
    "Order version number (always growing)"
    nonce: Int
    "Intervals during which an order can be placed"
    worktimeIntervals: [[Int!]!]
    "Will it be possible to order as quickly as possible?"
    allowSoonAsPossible: Boolean
    "Allow order by time"
    allowOrderToTime: Boolean
    "Html chunk for place top of spending bonus section on checkout"
    bonusBannerHTMLChunk: String
    "The minimum time required to cook the dish, in minutes. Added to delivery time to calculate earliest readiness."
    minCookingTimeInMinutes: Int
    "Optional textual description of cooking time (e.g. 'Prepared in 15–20 minutes')."
    cookingTimeDescription: String
  }
`);


export default {
  Query: {
    initCheckout: {
      def: 'initCheckout(orderId: String): InitCheckout',
      fn: async function (_, { orderId }, ctx) {
        try {
          let populatedOrder = await Order.populate(orderId);
          return await OrderHelper.initCheckout(populatedOrder);
        } catch (error) {
          sails.log.error(`GQL > [initCheckout]`, error, { orderId });
          throw error;
        }
      }
    },
  },
  Mutation: {
    checkOrder: {
      def: `#graphql
        checkOrder(orderCheckout: InputOrderCheckout): CheckResponse`,
      fn: async function (parent, args: { orderCheckout: InputOrderCheckout }, context): Promise<CheckResponse> {
        let data = args.orderCheckout;

        if (!context.connectionParams.deviceId) {
          throw `Missed deviceId`
        }

        // if (data.date) {
        //     let date = moment(data.date)
        //     if(!date.isValid()){
        //         return eventHelper.sendMessage(args.orderId, "Please order.date format is ISO (YYYY-MM-DD HH:mm:ss)");
        //     } else {
        //     data.date = date.format('YYYY-MM-DD HH:mm:ss');
        //     }
        // }

        let isSelfService: boolean;
        let address: Address = null

        let message;
        try {
          var order = await Order.findOne(data.orderId);
          const shouldSendSucessMessage = order.state !== "CHECKOUT"
          if (!order) {
            message = eventHelper.sendMessage({
              deviceId: context.connectionParams.deviceId,
              type: "error",
              title: context.i18n.__("Order not found"),
              message: context.i18n.__("Order with id %s not found", data.orderId),
            });
          }

          //@ts-ignore
          if (data.selfService) {
            isSelfService = true;
            order.pickupPoint = data.pickupPointId;
          } else {
            order.pickupPoint = null;
            if(!data.address && !data.locationId) throw `Address is required for non self service orders`
          }

          if (Order.isOrderedState(order.state)) {
            message = eventHelper.sendMessage({
              deviceId: context.connectionParams.deviceId,
              type: "error",
              title: context.i18n.__("Error"),
              message: context.i18n.__("Cart was ordered"),
            });
          }

          if (data.paymentMethodId) {
            if (!PaymentMethod.checkAvailable(data.paymentMethodId)) {
              message = eventHelper.sendMessage({
                deviceId: context.connectionParams.deviceId,
                type: "error",
                title: context.i18n.__("Error"),
                message: context.i18n.__("Checking the payment system ended in failure"),
              });
            }
          }

          if (!data.selfService) {
            if (data.locationId) {
              address = await UserLocation.findOne({id: data.locationId}) as Address;
              if (!address) throw `locationId not found`
            } else {
              if (data.address) {
                address = data.address;
              }
  
              address = {
                city: address.city || (await Settings.use("city") as string),
                street: address.street,
                ...address.streetId && {streetId: address.streetId},
                home: address.home,
                ...address.housing && {housing: address.housing},
                ...address.apartment && {apartment: address.apartment},
                ...address.index && {index: address.index},
                ...address.entrance && {entrance: address.entrance},
                ...address.floor && {floor: address.floor},
                ...address.apartment && {apartment: address.apartment},
                ...address.comment && {comment: address.comment},
              }  
            }
          }
          
          order.personsCount =  data.personsCount ? data.personsCount+"" : "";
          if (data.comment) order.comment = data.comment;

          order.date = data.date;

          // callback: boolean -call back to clarify details
          if (data.customData && data.customData.callback) {
            if (!order.customData) order.customData = {};
            order.customData.callback = data.customData.callback;
          }

          await Order.update({ id: order.id }, order).fetch();

          let userId = null;
          if (context && context.connectionParams.authorization) {
            userId = (await JWTAuth.verify(context.connectionParams.authorization)).userId;
          }

          await Order.check(
            {id: order.id},
            data.customer,
            isSelfService,
            data.address,
            data.paymentMethodId,
            userId,
            data.spendBonus !== undefined && userId !== null ? data.spendBonus : null
          );

          order = await Order.findOne({id: data.orderId});
          
          if(!order) {
            throw new Error(`Order with id: \`${data.orderId}\` not found`)
          }

          if (order.state === "CHECKOUT" && shouldSendSucessMessage) {
            message = {
              deviceId: context.connectionParams.deviceId,
              type: "info",
              title: context.i18n.__("Attention"),
              message: order.message
                ? context.i18n.__(order.message)
                : context.i18n.__("Ready for order"),
            };

          } else {
            if (order.message) {
              message = {
                deviceId: context.connectionParams.deviceId,
                type: "error",
                title: "Attention",
                message: order.message
                  ? context.i18n.__(order.message)
                  : context.i18n.__("It was not possible to check the order"),
              }
            }
          }

          if(message){
            eventHelper.sendMessage(message);
          }

          return { 
            order: order, 
           ...message && { message: message } 
          };
        } catch (e) {
          sails.log.error(`GQL > [checkOrder]`, e, args);
          let cleanErrorMessage = e.message ? e.message?.replace(/[^\w\s]/gi, '').slice(0, 128) : null;
          let message = {
            type: "error",
            title: context.i18n.__("Error"),
            message: 
              cleanErrorMessage ? `${cleanErrorMessage} ...` : 
              e.error ? e.error : 'unknown error'
          } as Message;
          if (e.code === 1) {
            message.message = context.i18n.__("Enter the name of the customer");
          } else if (e.code === 2) {
            message.message = context.i18n.__("Enter the customer's phone");
          } else if (e.code === 3) {
            message.message = context.i18n.__("The wrong format of the name of the customer");
          } else if (e.code === 4) {
            message.message = context.i18n.__("The wrong format of the customer phone number");
          } else if (e.code === 5) {
            message.message = context.i18n.__("No point of Street");
          } else if (e.code === 6) {
            message.message = context.i18n.__("Not indicated the house number");
          } else if (e.code === 7) {
            message.message = context.i18n.__("The city is not indicated");
          } else if (e.code === 8) {
            message.message = context.i18n.__("The payment system is not available");
          } else if (e.code === 11) {
            message.message = order.delivery?.message || "Delivery calculation error";
          } else if (e.code === 10) {
            message.message = context.i18n.__("The date of execution of the order is not true");
          } else if (e.code === 15) {
              message.message = context.i18n.__("Ordering for a date in the past is not possible");
          } else if (e.code === 16) {
            message.message = context.i18n.__("Date not allowed");
          } else if (e.code === 17) {
            message.message = context.i18n.__("The date should account for the minimum delivery time; choose a slightly later time");              
          } else {
            message.message = e.error
              ? e.error
              : context.i18n.__(`Problem when checking the order: %s`, e);
          }

          order = await Order.findOne(data.orderId);
          sails.log.error(`GQL > [checkOrder]`, e, args)
          eventHelper.sendMessage(message);
          return { 
            order,
            message
          };
        }
      },
    },
    sendOrder: {
      def: "sendOrder(orderId: String!): CheckResponse",
      fn: async function (parent, args, context) {
        if (!context.connectionParams.deviceId) {
            throw `Missed deviceId`;
        }
        let data = args;
        
        var order = await Order.findOne({ id: data.orderId });
        if (!order) {
            const errorMessage = context.i18n.__(`Order with id %s not found`, data.orderId);
            eventHelper.sendMessage({
                deviceId: context.connectionParams.deviceId,
                type: "error",
                title: context.i18n.__("Order not found"),
                message: errorMessage,
            });
            sails.log.error(`${errorMessage}`, args);
            throw new Error(errorMessage);
        }
        if (!order.isPaymentPromise) {
            try {
                let paymentResponse = await Order.payment({ id: order.id });
                const action = {
                    deviceId: context.connectionParams.deviceId,
                    type: "Redirect",
                    data: {
                        link: paymentResponse.redirectLink,
                    },
                };
                eventHelper.sendAction(action);
                order = await Order.populate({ id: order.id });
                return { order: order, action: action };
            }
            catch (e) {
                eventHelper.sendMessage({
                    deviceId: context.connectionParams.deviceId,
                    type: "error",
                    title: context.i18n.__("Error"),
                    message: context.i18n.__("The payment of the payment has ended unsuccessfully"),
                });
                const error = `External payment: ${e}`
                sails.log.error(`GQL > [sendOrder]`, error, args);
                throw new Error(error);
            }
        }

        try {
            await Order.order({ id: order.id });
            order = await Order.findOne({ id: data.orderId });
            const message = {
                type: "info",
                title: context.i18n.__("Successfully"),
                message: context.i18n.__("Your order is accepted for processing"),
            };
            // eventHelper.sendMessage(message);
            return { order: order, message: message };
        }
        catch (e) {
            const error = `Order finalize error:, ${e}`
            sails.log.error(`GQL > [sendOrder]`, error, args);
            throw new Error(error);
        }
      },
    },
  },
}
