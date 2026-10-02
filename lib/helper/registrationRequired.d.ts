/**
 * Does this account still owe us a profile — i.e. must the client draw the "your name" form?
 *
 * One place, two callers: `registration` enforces the rule and `authExchange` reports it, so a
 * client never has to infer the operator's policy from an empty `firstName`. It is deliberately
 * NOT a property of the auth attempt: signing in is finished by then, and an unnamed account is
 * a fully valid one that some operators simply refuse to serve.
 */
export default function registrationRequired(user: {
    firstName?: string;
} | undefined): Promise<boolean>;
