# Todoable

```bash
bun --hot index.ts
```

## Entry

```
http://localhost:4000/index.ts
```

## Summary

This is a simple todo app that doesn't use any dependencies. There's no bundling and everything is streamed to the client.

## Notable Features

- No dependencies but Bun and some types.
- No bundling.
- Async generators for streaming.
- SQLite for persistence.
- Very little client-side JavaScript
  - and the JavaScript that is there is written in TypeScript.
- Uses view transitions

## JavaScript features that may be unfamiliar

1. Generators

```js
function* generator() {
  for (let i = 0; i < 10; i++) {
    yield i;
  }
}
console.log([...generator()]); // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

2. Async Generators

```js
async function* stream() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    yield i;
  }
}
(async () => {
  for await (const value of stream()) {
    console.log(value);
  }
})();
```

3. Tagged Template Literals

```js
function tag(strings, ...values) {
  console.log(strings); // ['Hello ', ' world!']
  console.log(values); // ['Bun']
  return strings[0] + values[0] + strings[1];
}
console.log(tag`Hello ${"Bun"} world!`); // Hello Bun world!
```

4. Proxy

```js
const handler = {
  get: function (target, prop) {
    return prop;
  },
};
const p = new Proxy({}, handler);
console.log(p.foo); // "foo"
```

5. WeakMap

```js
const wm = new WeakMap();
const element = document.querySelector(".element");
wm.set(element, "element");
console.log(wm.get(element)); // "element"
```

6. Forms

```html
<form action="/" method="POST">
  <input type="text" name="todo" />
  <button type="submit">Add</button>
</form>
```
