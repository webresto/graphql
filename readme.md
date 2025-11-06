# Order
Корзина
-  Запросить новую корзину getNewOrder
-  Подписатся на изменения корзины order(id: String)
-  Добавить блюдо addToOrder
-  Изменить количество orderSetAmount
-  Удалить блюдо removeFromOrder

# Menu
- Получение блюд dish, dishes (без параметров вернет все блюда)
- Получение групп group, groups (без параметров вернет корневые группы)

# Checkout
- Проверка checkOrder
- Заказ sendOrder

# Subscription
- сообщения и ошибки - message
- переходы и экшены - action
- измененная корзина  - order

# criteria: Json
query запросы waterline ORM
https://0.12.sailsjs.com/documentation/concepts/models-and-orm/query-language#?criteria-modifiers
```js
// поиск по полю id
criteria = {id: "some-unique-id"}
// можно перечислить массив (условие OR), вернутся записи имеющие slug1 или slug2
criteria = {slug: ["slag1", "slag2"]}
// перечисление полей равносильно условию AND, вернутся записи с id = "some-unique-id" AND slug = "slug1"
criteria = {id: "some-unique-id", slug: "slug1"}


// дополнительный условия
'lessThan'
'lessThanOrEqual'
'greaterThan'
'greaterThanOrEqual'
'not'
'like'
'contains'
'startsWith'
'endsWith'
// пример
criteria = {price: {lessThan: 100}}

// сортировка и пагинация. Чтобы использовать сортировку или лимиты основной запрос нужно поместить в where: {}
criteria = {
  where: {price: {lessThan: 100}},
  skip: 20,
  limit: 10,
  sort: 'price DESC'
}

// graphql аналоги запросов для LF :
/*
1.  https://api.lifenadym.com/navigation
query{
  navigation{
    ...
  }
}
2. https://api.lifenadym.com/page/kafe
query{
  pages(criteria: {path: "kafe"}}){
    ...
  }
}
3.  https://api.lifenadym.com/api/0.5/menu?groupSlug=dostavka
query{
  groups(criteria: {slug: "dostavka"}){
    ...
  }
}

4. Запрос по поду с json
promotions(criteria: {section: {contains:"dostavka"}})
*/
```


# Backend helpers
- sendMessage(orderId, message) - отправление собщения через подписку PubSub
- sendAction(orderId, action)
- addModel(modelName) - генерирует тип из модели. Не использовать! при автоматической генерации всех моделей через addAllSailsModels
- addType(string) - добавить тип в виде готовой схемы
- addResolvers - добавить resolvers
- getSchema - возвращает сгенерированную схему и соедененные резолверсы
- addToBlackList
- addCustomField
- addToReplaceList
- addAllSailsModels - Генерирует схему по sails моделям.

# Пример использования
## Использование хука
Хук должен находиться в папке node_modules.

Код можно вставить в config/bootstrap.js или в afterHook при оспользовании в друших хуках. Главное чтобы код был выполнен до sails lifted, т.к. генерация GraphQL схемы происходит на этом событии.

Хук автоматически сканирует и добавляет в схему все модели проекта, находящиеся в sails.models

Автоматически добавляются резолверсы в папке проекта api/resolvers


```typescript
// импортируем хелпер
import * as helper from '@webresto/graphql'
// доп импорты
const path = require('path');

// добавляем resolvers из указанной папки
helper.addDirResolvers(path.resolve(__dirname, './resolvers'));
// все модели sails будут автоматически занесены в схему GraphQL

// Игнорируем при генерации поле dontShow модели Picture
helper.addToBlackList(["Picture.dontShow"]);

// для простых задач выше перечисленного достаточно. Ниже описанны дополнительные возможности.

// Добавляем резолверс вручную
helper.addResolvers(
  // структура резолверса
  {
    // Название основного элемента, обычно Query, Mutation, Subscription
    Query: {
      // имя должно совпадать с именем метода в GraphQL схеме ниже
      sayHi: {
          // описание метода в GraphQL схеме. При генерации будет полностью перенесено в неизменном виде
          def: 'sayHi: String',
          // функция резолвер. Стандартный резолвер GraphQL, после генерации схемы будет расположен в переменной sayHi. Для подписок может быть объектом, а не функцией
          fn: function (parent, args, context){
              return "Hi there! Welcome to GraphQL!";
          },
      }
    }
  }
);

// пример добавления типов в схему. Для существующих типов обязательно расширять тип, то есть писать extend type. Такие типы как Query, Mutation, Subscription определены поумолчанию, их обязательно расширять. Если добавляется метод, к нему обязательно нужно добавить резолвер.
helper.addType(`extend type Query {
            sayAnotherWord: String
          }
        `);

```

пример резолверса

```typescript
export default {
  // основные типы Query, Mutation, Subscription будут записаны в соответствующий тип
  Query: {
    dish: {
      def: 'dish(id: String): Dish',
      fn: async function (parent, args, context, info) {
        return await Dish.findOne({id: args.id});
      }
    }
  }
  Subscription: {
    dish: {
      def: 'dish: Dish',
      // для типа Subscription резолвер должен содержать функции subscribe & resolve
      fn: {
        subscribe: function (parent, args, context, info) {
          return context.pubsub.asyncIterator("dish-changed");
        },
        resolve: payload => {
          return payload;
        }
      }
    }
  },

  // пример резолверса полей типа Dish
  Dish: {
    // функция по умолчанию, можно не писать. Можно заменить любой логикой, главное что бы возвращаемый тип соответствовал схеме
    filed1: (parent, args, context, info) => parent.field1
  }
}
```




## Black List
Варианты:
1. ["Order.field"] - исключает поле field в модели Order
2. ["Order"] - исключает модель Order полностью
3. ["field] - исключает поле field из всех моделей

### example
    ```
    grqlHelper.addToBlackList(["createdAt", "updatedAt"]);
    ```
    исключает поля "createdAt", "updatedAt" из автоматической генерации

## addResolvers
Пример добавления:
- def - описание метода для graphQl schema. Попадет в основные типы Query, Mutation, Subscription. Для примера ниже будет "type Query { orderDish(id: Int!): OrderDish }"
- fn - метод или объект. Попадет в Resolvers согласно структуре, для примера ниже будет - Resolvers = {Query:{orderDish: fn}}
- При вызове соеденяет объекты: _.merge(oldResolvers, newResolvers);
```
const resolvers = {
    Query: {
        orderDish: {
            def: 'orderDish(id: Int!): OrderDish',
            fn: async function (parent, args, context) {
                return await OrderDish.findOne({id: args.id});
            }
        }
    }
}
```

## addToReplaceList
addToReplaceList(path, field)
### example
Замена поля и его типизация. Если добавляется новый тип, его необходимо описать, иначе вылетит исключение graphql
```
grqlHelper.addToReplaceList("Dish.image", "image: [Image]");
grqlHelper.addType("scalar Image");
```

## addCustomField
Добавляет поле в указанную модель. Нет проверки на совпадение полей. Если поля совпадут graphql не запустится.
```
grqlHelper.addCustomField("Order", "customField: String")
```
Результат:
type Order {
    ...
    customField: String
    ...
}

## setWhiteList
Добавляет модели в белый лист автогенератора. Можно установить генерацию для query запросов и подписок
```ts
/**
 * Добавляет whiteList
 * Пример: setWhiteList({
    page: ['query'],
    promotion: ['query'],
    maintenance: ['query', 'subscription']
  })
 *
 * @param list
 */
// Пример использования в хуках или проекте
import * as helper from '@webresto/graphql'

helper.setWhiteList({
    page: ['query'],
    promotion: ['query'],
    maintenance: ['query', 'subscription']
  })
```
