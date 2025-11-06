import { Captcha } from "@webresto/core/adapters/index"
export default {
  Query: {
    captchaGetJob: {
      def: 'captchaGetJob(label: String): CaptchaJob',
      fn: async (parent: any, args: { label: string } , context: any, info: any) => {
        try {
          return (await Captcha.getAdapter()).getJob(args.label)
        } catch (error) {
          sails.log.error(error)
          throw error
        }
      }
    }
  }
}