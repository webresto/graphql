---
title: "Login and authorization process for the webresto server"
linkTitle: "Authorization & login"
description: >
    Webresto server  GraphQL API login process
---

## Lyrics

Registration can be flexibly configured through flags in restrictions. In fact, the two main cases that we want to cover are quick registration by phone or email.

The email can be useful for corporate catering, or nutrition subscriptions. Email and phone are the same.

We understand that in most cases the phone will be selected as the login for the webresto account account. therefore it is the default when the site is deployed.

[There is a method for quick entry by OTP](#login) `login`, with quick registration. In this case, we register an account if there is none, or we carry out authorization

If a `passwordPolicy` is required, then the user must also specify a password during registration. In next login, it will be possible to enter with a password. It is possible that the password is set from the last OTP `from_otp`. So the password may be, not be, or even the last of the OTP is put

Other types of authorization must be implemented in-house and are not included in the basic package


> ⚠️ By default setting `passwordPolicy = from_otp` it means what last OTP was setting as password, but you can get OTP in any time

> ⚠️ `X-Device-Id` you should pass  [deviceId](./device-id.md)

> ⚠️ read more about [mocks](./mocks.md) 



## User restrictions

To get user settings use the user section in restrictions

```gql
{restrictions{
    user {
        loginField # by default: `phone`
        passwordPolicy # possible 3 variants ['required', 'from_otp', 'disabled'] by default: `from_otp` it means what need only OTP, for next logins  passwordRequired, disabled is means password forbidden and you need all time get OTP password
        loginOTPRequired # by default: `false`
        allowedPhoneCountries # List of all countries allowed to login by phone
        linkToProcessingPersonalData # Link to doc
        linkToUserAgreement # Link to doc
        customFields # Zodiac sign, Human desing type, Best Friend, referal link 
    }
}}

```

---

## 🛡 Authentication

Get JWTtoken from `action` field on `login` mutation responce, and next pass JWT token without any marks in header `Authorization` 
```
header: {
    Authorization: "ciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZX",
}
```


## OTPRequest
Send OTP for specific login

>  ⚠️ See stdout nodejs log in development mode you will see OTPcode

### Definition

```gql
mutation OTPRequest(
login: String! (by loginField)
captcha: Captcha! (solved captcha for label "OTPRequest:%login%")
): OTPResponse
```

1. The OTPRequest mutation requests an OTP code for the provided phone or email login.
2. The captcha provided must match the solved captcha for the label "OTPRequest:%login%".
3. The OTP is generated and sent to the provided phone or email login.

 ### Error Handling

If the provided captcha does not match, a generic error message with the message "bad captcha" will be thrown.
Example

```gql

mutation {
    OTPRequest(
        login: "13450000123",
        captcha: {
            id: "uuid",
            solution: "123n"
        }
    ) {
        id
        nextOTPSeconds
        message {
            id
            title
            type
            message
        }
        action {
            id
            type
            data
        }
    }
}
```


---

## Login

If you getting account access by OTP for unknown account, server create new account. For cases when account is registred 
server restore account and send login token automaticaly in action. When account is not registred, server make new account, (with `hasFilledAllCustomFields: false` ).  

> ⚠️ It's funny but we first create an account and then go through the process of filling it out (registration)

>Step by step:
>1. get OTP
>2. Solve captcha
>3. Send auth mutatuion and receive JWT token

> ⚠️ After login you receive JWT in action (login)

### Definition

```gql
mutation login(
  login: String!

  "(required when login field is phone)"
  phone: Phone 
  
  "(when passwordPolicy is required )"
  password: String
  
  "from otpRequest"
  otp: String! 
  
  "(solved captcha for label 'auth:%login%')"
  captcha: Captcha! 
): UserResponse
```

### Function

1. if  `passwordPolicy ==  'required'` you should pass password for setup password in next time, in other case last OTP sets as password
2. When `passwordPolicy ==  'from_otp'` you can pass password or OTP
3. When `passwordPolicy ==  'disabled'` you not need pass password
4. When loginField is phone you need pass Phone in Object format
5. When `loginOTPRequired` you should pass OTP

### Error Handling


### Example

```gql
mutation {
login(
    login: "13450000123", 
    password: "Password",
    otp: "123456"
    phone: { otp: "+1", number: "3450000123" }, 
    captcha: {
        id: "uuid",
        solution: "123n"
    }
    ) {
        user {
            id
            name
        }
        # Toast "You logined successfully", also this will be sent by Messages subscription
        message {
            id # unique id is equal subscription message id
            title
            type
            message
        }
        # Here  recive JWT token, also this will be sent by Actions subscription
        action {
            id # unique id is equal subscription action id
            type # returns `authorization`
            data # retruns `JWT_TOKEN`
        }
}}
```

---

## Logout

> 🛡 Authentication required 
>
```gql
logout(
    deviceID: String (Optional field if not pass logout from current device) 
): Response
```
      


## logout from all devices

> 🛡 Authentication required

```gql
logoutFromAllDevices: Response
```

