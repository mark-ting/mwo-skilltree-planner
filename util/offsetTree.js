process.chdir(__dirname)
const jsonfile = require('jsonfile')

// Center column offset from left canvas border
const OFFSET = 8

// Skill tree data
let skills = {}
let links = {}
let tree = {}
let coords = {}

function loadData (cb) {
  let treeData = jsonfile.readFileSync('./out/SkillTree.json')
  for (let category in treeData) {
    let subtree = treeData[category]
    // Load all skill nodes
    Object.assign(skills, subtree['nodes'])

    tree[category] = {
      'root': subtree['root'],
      'nodes': new Set()
    }

    // Hex coord to node lookup
    coords[category] = {}
    for (let id in subtree.nodes) {
      let skill = skills[id]
      let coord = `(${skill.col}, ${skill.row})`
      coords[category][coord] = id

      // Add node to subtree
      tree[category]['nodes'].add(id)
    }
  }

  for (let id in skills) {
    let skill = skills[id]
    // Process node links
    links[id] = []
    let nodeLinks = skill.links
    for (let i = 0, len = nodeLinks.length; i < len; i++) {
      if (nodeLinks[i]) {
        links[id].push(nodeLinks[i])
      }
    }
  }
}

loadData()

function dfsFindTreeLeftRight (root) {
  let stack = [root]
  let visited = []

  let left = Infinity
  let right = -Infinity

  while (stack.length) {
    let cur = stack.pop()
    let col = skills[cur]['col']

    if (col < left) {
      left = col
    }

    if (col > right) {
      right = col
    }

    visited.push(cur)
    let neighbors = links[cur]
    for (let i = 0, len = neighbors.length; i < len; i++) {
      let neighbor = neighbors[i]
      // Not visited and not in stack

      if (visited.indexOf(neighbor) < 0 && stack.indexOf(neighbor) < 0) {
        stack.push(neighbor)
      }
    }
  }

  return [left, right]
}

let offset = {}

for (let category in tree) {
  let subtree = tree[category]
  let root = subtree.root

  let bounds = dfsFindTreeLeftRight(root)
  let left = bounds[0]
  let right = bounds[1]
  let mid = Math.floor((left + right) / 2)

  offset[category] = mid - (OFFSET + (mid & 1))
}

let tree2 = Object.assign(tree, {})
let skills2 = {}

for (let category in tree) {
  let subtree = tree[category]
  skills2[category] = {
    'nodes': {}
  }
  for (let id of subtree['nodes']) {
    let node2 = skills[id]
    node2.col = node2.col - offset[category]
    skills2[category]['nodes'][id] = node2
  }
}

for (let category in tree) {
  tree2[category] = {
    'root': tree[category]['root'],
    'nodes': skills2[category]['nodes']
  }
}

jsonfile.writeFile('./out/SkillTreeFinal.json', tree2, () => {
  console.log('Tree offsets applied!')
})
