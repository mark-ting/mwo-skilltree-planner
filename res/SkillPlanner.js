/* global _su, strWrap, Point, HexGrid */

class SkillPlanner {
  constructor () {
    this.checkDependencies()

    // Skill tree data
    this.skills = {}
    this.coords = {}
    this.links = {}
    this.tree = {}
    this.colors = {}

    this.reset()

    // DEBUG
    this.DEBUG = false
    // END DEBUG
    this.initGrid()
  }

  checkDependencies () {
    if (typeof HexGrid !== 'function' || !_su) {
      console.log('Warning! Required dependencies not found. Please contact the dev for more info.')
    }
  }

  reset () {
    this.category = 'Firepower'
    this.active = new Set()
    this.orphan = new Set()
    this.possible = new Set()
    this.visibleActive = new Set()
    this.visibleOrphan = new Set()
    this.visiblePossible = new Set()
    this.effects = {}
    this.mouseDown = false
    this.prevHexId = null
  }

  initGrid () {
    let hexGrid = new HexGrid(48, 16, new Point(0, 160))
    hexGrid.bindCanvas(document.getElementById('hex'))
    this.hexGrid = hexGrid

    this.initEvents()
    this.initInterface()
  }

  initEvents () {
    let hexGrid = this.hexGrid
    let onMouseDown = (e) => {
      e.preventDefault()
      this.mouseDown = true
    }

    let onMouseMove = (e) => {
      e.preventDefault()
      if (this.mouseDown) {
        let point = hexGrid.getCursorCanvasPoint(e)
        let hex = hexGrid.getHexAtPoint(point)

        if (hex) {
          let hexId = this.skillHexToId(hex)

          if (hexId !== this.prevHexId) {
            this.toggleNode(hexId)
            this.prevHexId = hexId
          }
        }
      }
    }

    let onMouseUp = (e) => {
      e.preventDefault()
      let point = hexGrid.getCursorCanvasPoint(e)
      let hex = hexGrid.getHexAtPoint(point)

      if (hex) {
        let hexId = this.skillHexToId(hex)

        if (hexId !== this.prevHexId) {
          this.toggleNode(hexId)
          this.prevHexId = hexId
        }
      }
      this.prevHexId = null
      this.mouseDown = false
    }

    this.bind('mousedown', onMouseDown, this)
    this.bind('mousemove', onMouseMove, this)
    this.bind('mouseup', onMouseUp, this)
  }

  initInterface () {
    let bindEvent = (element, event, fn) => {
      document.getElementById(element).addEventListener('click', fn, false)
    }

    bindEvent('toggle-firepower', 'click', () => {
      this.category = 'Firepower'
      this.draw()
    })

    bindEvent('toggle-survival', 'click', () => {
      this.category = 'Survival'
      this.draw()
    })

    bindEvent('toggle-mobility', 'click', () => {
      this.category = 'Mobility'
      this.draw()
    })

    bindEvent('toggle-jumpjets', 'click', () => {
      this.category = 'Jump Jets'
      this.draw()
    })

    bindEvent('toggle-operations', 'click', () => {
      this.category = 'Operations'
      this.draw()
    })

    bindEvent('toggle-sensors', 'click', () => {
      this.category = 'Sensors'
      this.draw()
    })

    bindEvent('toggle-auxiliary', 'click', () => {
      this.category = 'Auxiliary'
      this.draw()
    })

    bindEvent('clear-section', 'click', () => {
      this.active = _su.difference(this.active, this.tree[this.category].nodes)
      this.draw()
    })

    bindEvent('clear-all', 'click', () => {
      this.active = new Set()
      this.draw()
    })
  }

  loadData (cb) {
    let loadColors = this.getJSON('./data/colors.json')
      .then((colors) => {
        this.colors = colors
      })
      .catch((err) => {
        console.error(err)
      })

    let loadSkills = this.getJSON('./data/latest.json')
      .then((tree) => {
        for (let category in tree) {
          let subtree = tree[category]
          // Load all skill nodes
          Object.assign(this.skills, subtree.nodes)

          this.tree[category] = {
            'root': subtree['root'],
            'nodes': new Set()
          }

          // Hex coord to node lookup
          this.coords[category] = {}
          for (let id in subtree.nodes) {
            let skill = this.skills[id]
            let coord = `(${skill.col}, ${skill.row})`
            this.coords[category][coord] = id

            // Add node to subtree
            this.tree[category]['nodes'].add(id)
          }
        }

        for (let id in this.skills) {
          let skill = this.skills[id]
          // Process node links
          this.links[id] = []
          let links = skill.links
          for (let i = 0, len = links.length; i < len; i++) {
            if (links[i]) {
              this.links[id].push(links[i])
            }
          }
        }
      })
      .catch((err) => {
        console.error(err)
      })

    Promise.all([loadColors, loadSkills])
      .then(() => {
        typeof cb === 'function' && cb()
      })
  }

  bind (action, fn, ctx) {
    document.addEventListener(action, fn.bind(ctx || this), false)
  }

  getJSON (url) {
    return new Promise((resolve, reject) => {
      let req = new window.XMLHttpRequest()
      req.open('GET', url, true)

      req.onload = function () {
        if (this.status >= 200 && this.status < 400) {
          resolve(JSON.parse(this.response))
        } else {
          reject(new Error('Failed to retrieve URL!'))
        }
      }

      req.send()
    })
  }

  skillIdToHex (id) {
    let col = this.skills[id].col
    let row = this.skills[id].row
    return `(${col}, ${row})`
  }

  skillHexToId (hex) {
    let col = hex.col
    let row = hex.row
    return this.coords[this.category][`(${col}, ${row})`]
  }

  // Toggle node state by ID
  toggleNode (nodeId) {
    // Ignore invalid nodes
    if (!nodeId || !this.tree[this.category].nodes.has(nodeId)) { return }

    if (this.active.has(nodeId)) {
      this.active.delete(nodeId)
    } else {
      this.active.add(nodeId)
    }
    this.draw()
  }

  // Draw skill node and label
  drawNode (skill, state) {
    let col = skill.col
    let row = skill.row
    this.hexGrid.drawHexCell(col, row, this.colors['cell'][state])

    let name = skill.name
    let text = (name.length > 12) ? strWrap(name) : name
    this.hexGrid.drawHexLabel(col, row, text, undefined, this.colors['label'][state])
  }

  // Recalculate state using DFS
  update () {
    let updateNodeState = () => {
      let active = new Set(this.active)
      let possible = new Set()
      let visited = new Set()

      let root = this.tree[this.category].root
      let stack = [root]

      if (!active.has(root)) {
        this.orphan = this.active
        this.possible = new Set(root)
        return
      }

      while (stack.length) {
        let cur = stack.pop()
        active.delete(cur)
        visited.add(cur)
        let neighbors = planner.links[cur]
        for (let i = 0, len = neighbors.length; i < len; i++) {
          let neighbor = neighbors[i]
          // Neighbor not visited nor queued
          if (!visited.has(neighbor) && stack.indexOf(neighbor) < 0) {
            // Neighbor active and reachable
            if (active.has(neighbor)) {
              stack.push(neighbor)
            } else {
              possible.add(neighbor)
            }
          }
        }
      }

      this.orphan = active
      this.possible = possible
    }

    let updateNodeVisibility = () => {
      let categoryNodes = this.tree[this.category].nodes
      this.visibleActive = _su.intersect(this.active, categoryNodes)
      this.visibleOrphan = _su.intersect(this.orphan, categoryNodes)
      this.visiblePossible = _su.intersect(this.possible, categoryNodes)
    }

    let updateNodeEffects = () => {
      this.effects = {}

      for (let id of this.active) {
        let effects = this.skills[id]['effects']

        for (let i = 0, len = effects.length; i < len; i++) {
          let effect = effects[i]
          if (!this.effects[effect]) {
            this.effects[effect] = 0
          }
          this.effects[effect] += 1
        }
      }
    }

    let updateInterface = () => {
      document.getElementById('active-nodes').value = this.active.size
    }

    updateNodeState()
    updateNodeVisibility()
    updateNodeEffects()
    updateInterface()
  }

  // Draw planner; calls state change internally
  draw () {
    this.update()
    this.hexGrid.clear()
    let categoryNodes = this.tree[this.category].nodes

    // Draw node links of current category
    for (let id of categoryNodes) {
      if (id) {
        let src = this.skills[id]
        let links = this.links[id]

        for (let i = 0, len = links.length; i < len; i++) {
          let dest = this.skills[links[i]]
          if (dest) {
            this.hexGrid.drawHexLink(src.col, src.row, dest.col, dest.row, this.colors['link']['inactive'])
          }
        }
      }
    }

    // Draw nodes of current category
    for (let id of categoryNodes) {
      if (id) {
        let node = this.skills[id]
        planner.drawNode(node, 'inactive')

        // BEGIN DEBUG
        if (this.DEBUG) {
          this.hexGrid.drawHexCell(node.col, node.row, this.colors['cell']['inactive'])
          this.hexGrid.drawHexLabel(node.col, node.row, id, this.colors['label']['inactive'])
        }  // END DEBUG
      }
    }

    // Draw visible active nodes, painting over
    for (let id of this.visibleActive) {
      if (id) {
        let node = this.skills[id]
        planner.drawNode(node, 'active')

        // BEGIN DEBUG
        if (this.DEBUG) {
          this.hexGrid.drawHexCell(node.col, node.row, this.colors['cell']['active'])
          this.hexGrid.drawHexLabel(node.col, node.row, id, undefined, this.colors['cell']['active'])
        }  // END DEBUG
      }
    }

    // Draw visible possible nodes, painting over
    for (let id of this.visiblePossible) {
      if (id) {
        let node = this.skills[id]
        planner.drawNode(node, 'possible')

        // BEGIN DEBUG
        if (this.DEBUG) {
          this.hexGrid.drawHexCell(node.col, node.row, this.colors['cell']['possible'])
          this.hexGrid.drawHexLabel(node.col, node.row, id, undefined, this.colors['cell']['possible'])
        }  // END DEBUG
      }
    }

    // Draw orphaned nodes, painting over
    for (let id of this.visibleOrphan) {
      if (id) {
        let node = this.skills[id]
        planner.drawNode(node, 'orphaned')

        // BEGIN DEBUG
        if (this.DEBUG) {
          this.hexGrid.drawHexCell(node.col, node.row, this.colors['cell']['orphaned'])
          this.hexGrid.drawHexLabel(node.col, node.row, id, undefined, this.colors['cell']['orphaned'])
        }  // END DEBUG
      }
    }
  }

  exportImage () {
    let image = this.hexGrid.canvas.toDataURL('image/png')
    let file = image.replace('image/png', 'image/octet-stream')
    window.location.href = file
  }
}

const planner = new SkillPlanner()
planner.loadData(() => {
  planner.draw()
})
