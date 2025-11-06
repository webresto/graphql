---
title: "User methods"
linkTitle: "User methods"
description: >
    User methods after login
---

> ⚠️ `X-Device-Id` you should pass  [deviceId](./device-id.md)

## Get user info

> 🛡 Authentication required 

To get user model data

```gql
    aboutMe {
        firstName
        lastName
        hasFilledAllCustomFields
        customFields
    }
```

---


## Update user info

> 🛡 Authentication required 

Update user model

### Definition

```gql
mutation updateMe(
    user: InputUser
): UserResponse
```

## Delete the User

> 🛡 Authentication required 

Deleting after depend of webresto server flag `KEEP_DELETED_USER_DAYS`

### Definition

```gql
mutation deleteMe(
    otp: String
): UserResponse
```