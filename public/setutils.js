/**
 * setutils.js
 * Author: mat3049
 * Date: 05/28/2017
 * Implementation of set operations for ES6 Sets.
 */

const _su = {
  union: (a, b) => new Set([...a, ...b]),
  difference: (a, b) => new Set([...a].filter(x => !b.has(x))),
  intersect: (a, b) => new Set([...a].filter(x => b.has(x)))
}
