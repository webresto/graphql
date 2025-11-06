import HookTools from "@webresto/core/libs/hookTools";
import afterHook from "./afterHook";

export default function ToInitialize() {
  /**
   * List of hooks that required
   */
  const requiredHooks = [
    'restocore',
  ];

  return function initialize(cb) {
    /**
     * AFTER OTHERS HOOKS
     */
    HookTools.waitForHooks('graphql', requiredHooks, afterHook);
    return cb();
  }
};
