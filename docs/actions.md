---
title: "Actions"
linkTitle: "Actions"
description: >
    WebServer action subscription
---


> ⚠️ [`X-Device-Id`](./device-id.md)  You should pass deviceID


    const action = {
                  type: "PaymentRedirect",
                  data: {
                    redirectLink: paymentResponse.redirectLink,
                  },
                };


let action: Action = {
          type: "GoTo",
          data: {
            "section": "login"
          }
        }