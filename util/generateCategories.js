process.chdir(__dirname)
const jsonfile = require('jsonfile')

// Skill tree data
let links = jsonfile.readFileSync('./out/NodeLinks.json')

function dfsTree (root) {
  let stack = [root]
  let visited = []

  while (stack.length) {
    let cur = stack.pop()
    visited.push(cur)
    let neighbors = links[cur]
    if (neighbors) {
      for (let i = 0, len = neighbors.length; i < len; i++) {
        let neighbor = neighbors[i]
        // Not visited and not in stack

        if (visited.indexOf(neighbor) < 0 && stack.indexOf(neighbor) < 0) {
          stack.push(neighbor)
        }
      }
    }
  }

  // Visited yeli
  return visited
}

// TODO: parse this from game data
let roots = {
  'Firepower': '0',
  'Survival': '64',
  'Mobility': '117',
  'Jump Jets': '156',
  'Operations': '161',
  'Sensors': '195',
  'Auxiliary': '215'
}

let categories = {}

for (let category in roots) {
  let root = roots[category]
  categories[category] = dfsTree(root)
}

jsonfile.writeFile('out/NodeCategories.json', categories, () => {
  console.log('Node categories generated!')
})
