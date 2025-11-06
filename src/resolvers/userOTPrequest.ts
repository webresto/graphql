// const userAuth = sails.config.restographql.authService;
import { Captcha } from "@webresto/core/adapters";
import { OTP } from "@webresto/core/adapters"
import { ResolvedCaptcha } from "@webresto/core/adapters/captcha/CaptchaAdapter"
import { Message, Action, Response } from "../../types/primitives";

import graphqlHelper from "../../lib/graphqlHelper";

type OTPResponse = {
  id: Number
  nextOTPSeconds: Number
  message: Message
  action?: Action
}

graphqlHelper.addType(`#graphql    
  type OTPResponse {
    id: String
    nextOTPAfterSeconds: Int
    message: Message
    action: Action
  }
  `)

type OTPPayload = { 
  login: string
  captcha: ResolvedCaptcha
}

export default {
  Mutation: {
    OTPRequest: {
      def: `#graphql
      OTPRequest(

        "Phone login is 'phone.code+phone.number' for phone only digits"
        login: String!,

        "Solved captcha for label 'otpRequest:%login%'"
        captcha: Captcha!

        ): OTPResponse`,
      fn: async (parent: any, payload: OTPPayload, context: any): Promise<OTPResponse> => {
        // console.log(!(await captchaAdapter).check(payload.captcha, `otprequest:${payload.login}`))
        let captchaAdapter = await Captcha.getAdapter();

        if (await captchaAdapter.check(payload.captcha, `otpRequest:${payload.login}`) === false) { 
          throw `bad captcha`
        }
        let OTPAdapter = await OTP.getAdapter();

        let otp = await OTPAdapter.get(payload.login);
        let message: Message = {
          deviceId: null,
          title: context.i18n.__("Success"),
          type: "info",
          message: context.i18n.__("OTP sended")
        } 

        // Here should be Emmiter for midificate Action And Message
        let action: Action = {
          deviceId: null,
          type: "",
          data: {}
        }


        return {
          id: otp.id,
          nextOTPSeconds: 300,
          message: message,
          action: action
        };
      },
    }
  }
};
