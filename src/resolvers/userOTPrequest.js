"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const userAuth = sails.config.restographql.authService;
const adapters_1 = require("@webresto/core/adapters");
const adapters_2 = require("@webresto/core/adapters");
const graphqlHelper_1 = require("../../lib/graphqlHelper");
graphqlHelper_1.default.addType(`#graphql    
  type OTPResponse {
    id: String
    nextOTPAfterSeconds: Int
    message: Message
    action: Action
  }
  `);
exports.default = {
    Mutation: {
        OTPRequest: {
            def: `#graphql
      OTPRequest(

        "Phone login is 'phone.code+phone.number' for phone only digits"
        login: String!,

        "Solved captcha for label 'otpRequest:%login%'"
        captcha: Captcha!

        ): OTPResponse`,
            fn: async (parent, payload, context) => {
                // console.log(!(await captchaAdapter).check(payload.captcha, `otprequest:${payload.login}`))
                let captchaAdapter = await adapters_1.Captcha.getAdapter();
                if (await captchaAdapter.check(payload.captcha, `otpRequest:${payload.login}`) === false) {
                    throw `bad captcha`;
                }
                let OTPAdapter = await adapters_2.OTP.getAdapter();
                let otp = await OTPAdapter.get(payload.login);
                let message = {
                    deviceId: null,
                    title: context.i18n.__("Success"),
                    type: "info",
                    message: context.i18n.__("OTP sended")
                };
                // Here should be Emmiter for midificate Action And Message
                let action = {
                    deviceId: null,
                    type: "",
                    data: {}
                };
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
