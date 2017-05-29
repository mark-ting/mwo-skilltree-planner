/**
 * stringwrap.js
 * Author: mat3049
 * Date: 05/26/2017
 */

/**
 * Replaces space closest to string center with a newline.
 * If string contains no spaces, returns original string.
 * @param {string} str - String to split.
 */
function strWrap (str) {
  function getSpaces (str) {
    let spaces = []

    for (let i = 0, len = str.length; i < len; i++) {
      if (str[i] === ' ') { spaces.push(i) }
    }
    return spaces
  }

  let spaces = getSpaces(str)
  let half = Math.trunc(str.length / 2)

  let closest = Infinity
  let index

  for (let i = 0, len = spaces.length; i < len; i++) {
    let dist = Math.abs(half - spaces[i])
    if (dist < closest) {
      closest = dist
      index = i
    }
  }

  let center = spaces[index]
  return center ? str.substr(0, center) + '\n' + str.substr(center + 1) : str
}
