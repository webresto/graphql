---
title: "Catcha POW captcha"
linkTitle: "Captcha"
description: >
    WebServer generate captcha for request
---

## Get captcha type
Where a captcha is expected, it is required at the beginning to request the type of captcha, and solve it. Before making a mutation on the server

```gql
{restrictions{
    captchaType
}}
```

## POW captcha type
By default you recive `captchaType='POW'` this captcha refer from https://github.com/fabiospampinato/crypto-puzzle
This module implements a simple cryptographic captcha.

```js
import Puzzle from 'crypto-puzzle';

const difficulty = 100000;
const puzzle = await Puzzle.generate ( difficulty );
const solution = await Puzzle.solve ( puzzle.question );

console.assert ( puzzle.solution === solution );
```

The server generates a job and issues a job request to the client `captchaGetJob`


## Get captcha job

```gql
{captchaGetJob(label: "login:+12340000123") {
    id
    task
}}
```

The label is calculated according to the formula for each mutation differently. This gives us the opportunity to separate each mutation in and the task for the captcha into a separate thread. If the stream is attacked then the server will increase difficulty for separate thread.

> Default make formula logic for **`label` = [mutation name] + ":" + [some `id` or `login`]**

> ⚠️ **Any mutation which required captcha must contain label description.** See in graphql sandbox

## Other captchas
Server can connect other captcha it possible by captcha adapter
But all data types will remain the same

## Data types

```gql
type CaptchaJob {
    ""
    id: String
    ""
    task: String
}

input Captcha {
    "Captcha job ID"
    id: String
    "Resolved captcha"
    solution: String
}
```

input Captcha
