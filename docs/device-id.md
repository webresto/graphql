---
title: "Device ID"
linkTitle: "DeviceID"
description: >
    Abount WebResto server deviceID 
---


> ⚠️ `X-Device-Id`  header required for all graphql request

## Device ID

`deviceId` is Unique `string` passed as Header `X-Device-Id: 3d5ab688e195587101e2aa9496448d9b`

For `subscribtions` you should pass deviceId as params 

```gql
order(deviceId: String): Order
```

> 🧠 After login you can pass only JWT token because `deviceId` present in JWT

If user restore account from same browser/device it can helps to identify. When user wants to close session on forgoten, need just select session by DeviceId

As example you can use:
[**biri**](https://github.com/dashersw/biri)
[**fingerprintjs**](https://fingerprintjs.github.io/fingerprintjs/)


Please set deviceId header globaly for all request