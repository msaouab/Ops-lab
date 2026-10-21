# Web fundamentals MCQ (fullstack online test)

A full-stack candidate reported multiple-choice questions on **HTML, CSS, JavaScript and React**
in the online test. 30 questions; aim for **15 minutes**. Answers are in `web-mcq-answers.md`.

## JavaScript

1. `typeof null` → (a) "null" (b) "object" (c) "undefined" (d) throws
2. `[1, 2, 3].map(parseInt)` → (a) [1, 2, 3] (b) [1, NaN, NaN] (c) [NaN, NaN, NaN] (d) [1, 2, NaN]
3. `0.1 + 0.2 === 0.3` → (a) true (b) false
4. What does this print?
   ```js
   for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));
   ```
   (a) 0 1 2 (b) 3 3 3 (c) 2 2 2 (d) undefined ×3
5. Order of output?
   ```js
   console.log("A");
   setTimeout(() => console.log("B"));
   Promise.resolve().then(() => console.log("C"));
   console.log("D");
   ```
   (a) A B C D (b) A D B C (c) A D C B (d) A C D B
6. `"5" == 5` → (a) true (b) false
7. Which makes a shallow copy of `obj`? (a) `obj` (b) `{ ...obj }` (c) `Object.freeze(obj)` (d) `JSON.parse(obj)`
8. `[].reduce((a, b) => a + b)` → (a) 0 (b) undefined (c) TypeError (d) NaN
9. In an arrow function, `this` is: (a) the caller (b) always `window` (c) taken from the enclosing scope (d) undefined
10. `const a = [1, 2]; a.push(3);` → (a) TypeError (b) a is [1, 2, 3] (c) a is [1, 2]
11. Best way to test if `x` is NaN: (a) `x === NaN` (b) `Number.isNaN(x)` (c) `x == NaN` (d) `typeof x === "NaN"`
12. `user?.address?.city` when `user.address` is undefined → (a) TypeError (b) undefined (c) null (d) ""
13. `JSON.stringify({ a: undefined, b: 1 })` → (a) `{"a":null,"b":1}` (b) `{"b":1}` (c) `{"a":undefined,"b":1}`
14. `Promise.all([p1, p2, p3])` rejects: (a) only if all reject (b) as soon as any rejects (c) never
15. A search box should call the API only after the user stops typing for 300 ms. This technique is:
    (a) throttling (b) memoization (c) debouncing (d) polling

## CSS

16. Which selector wins? (a) `#nav a` (b) `.menu .link a` (c) `nav ul li a`
17. With `box-sizing: border-box`, `width` includes: (a) content only (b) content + padding + border (c) content + margin
18. Centre a child both ways in a flex container: (a) `margin: auto` on parent (b) `justify-content: center; align-items: center` (c) `text-align: center`
19. `position: absolute` is positioned relative to: (a) the viewport (b) the parent (c) the nearest positioned ancestor (d) the body
20. Difference between `display: none` and `visibility: hidden`:
    (a) none (b) `display: none` removes the element from layout, `visibility: hidden` keeps its space
21. `1rem` is relative to: (a) the parent font size (b) the root element font size (c) the viewport width
22. `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` gives:
    (a) exactly 200px columns (b) as many columns as fit, each at least 200px, sharing extra space (c) one column

## HTML

23. Semantic element for the main site navigation: (a) `<div class="nav">` (b) `<nav>` (c) `<menu>` (d) `<header>`
24. Default `type` of a `<button>` inside a `<form>`: (a) button (b) submit (c) reset
25. Attribute that describes an image for screen readers: (a) title (b) alt (c) aria-image (d) src

## React

26. Why do list items need a `key`? (a) for CSS (b) so React can match items between renders (c) for SEO
27. `useEffect(fn, [])` runs: (a) on every render (b) once after the first render (c) before the first render
28. With `count = 0`, after `setCount(count + 1); setCount(count + 1);` in one handler, count is: (a) 0 (b) 1 (c) 2
29. Where should a function component fetch data when it mounts? (a) in the body (b) in `useEffect` (c) in `useMemo`
30. A "controlled" input is one whose: (a) value comes from state and changes via onChange (b) ref is used (c) value is read on submit only
