// TypeScript version of HexGrid.js
// Inspired by https://github.com/rrreese/Hexagon.js
// Like above, math from http://blog.ruslans.com/2011/02/hexagonal-grid-math.html

export interface ShapeColor {
  width?: number
  stroke?: string
  fill?: string
}

export interface TextColor {
  alignment?: string
  baseline?: string
  font?: string
  fill?: string
  lineHeight?: number
}

export interface Hex {
  col: number
  row: number
}

export class Point {
  x: number
  y: number

  constructor (x: number, y: number) {
    this.x = x
    this.y = y
  }

  // Perform Cartesian vector addition
  add (point: Point): Point {
    return new Point(this.x + point.x, this.y + point.y)
  }

  // Perform Cartesian vector subtraction
  subtract (point: Point): Point {
    return new Point(this.x - point.x, this.y - point.y)
  }

  // Check if point in triangle
  isInTriangle (a: Point, b: Point, c: Point): boolean {
    // Use barycentric coordinates
    // http://www.gamedev.net/community/forums/topic.asp?topic_id=295943
    let area = 0.5 * (-b.y * c.x + a.y * (-b.x + c.x) + a.x * (b.y - c.y) + b.x * c.y)
    let sign = (area < 0) ? -1 : 1

    let s = sign * (a.y * c.x - a.x * c.y + this.x * (c.y - a.y) + this.y * (a.x - c.x))
    let t = sign * (a.x * b.y - a.y * b.x + this.x * (a.y - b.y) + this.y * (b.x - a.x))
    return (s > 0 && t > 0 && (s + t < 2 * area * sign))
  }

  // Check if point in rectangle (top-left, bottom-right points)
  isInRectangle (a: Point, b: Point): boolean {
    let x = this.x >= a.x && this.x <= b.x
    let y = this.y >= a.y && this.y <= b.y
    return (x && y)
  }
}

interface HexGridCell {
  height: number
  width: number
  delta: number
  radius: number
}

interface HexGridPadding {
  height: number
  width: number
}

interface HexGridHex {
  height: number
  width: number
}

export class HexGrid {
  origin: Point
  cell: HexGridCell
  padding: HexGridPadding
  hex: HexGridHex
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D

  constructor (radius: number, padding: number, origin: Point = new Point(0, 0)) {
    this.origin = origin

    // Cell dimensions
    this.cell = {
      height: Math.sqrt(3) * radius,
      width: 2 * radius,
      delta: 1.5 * radius,
      radius: radius
    }

    // Padding dimensions
    this.padding = {
      height: Math.sqrt(3) / 2 * padding,
      width: padding
    }

    // Hex dimensions (distance between hex centers)
    this.hex = {
      width: this.cell.delta + this.padding.width,
      height: this.cell.height + this.padding.height
    }
  }

  bindCanvas (canvas): void {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
  }

  bind (action, fn, ctx): void {
    this.canvas.addEventListener(action, fn.bind(ctx || this), false)
  }

  clear (): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  // Draw line from A to B
  drawLine (a: Point, b: Point, color): void {
    let ctx = this.context
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)

    ctx.lineWidth = color.width || 1
    ctx.strokeStyle = color.stroke || 'white'
    ctx.stroke()
  }

  // Draw cell around center
  drawHexagon (center: Point, color: ShapeColor): void {
    let x = center.x
    let y = center.y

    let ctx = this.context
    // Goes CW from Cartesian 0 deg
    ctx.beginPath()
    ctx.moveTo(x + this.cell.radius, y)
    ctx.lineTo(x + (this.cell.radius / 2), y + this.cell.height / 2)
    ctx.lineTo(x - (this.cell.radius / 2), y + this.cell.height / 2)
    ctx.lineTo(x - this.cell.radius, y)
    ctx.lineTo(x - (this.cell.radius / 2), y - this.cell.height / 2)
    ctx.lineTo(x + (this.cell.radius / 2), y - this.cell.height / 2)
    ctx.closePath()

    ctx.lineWidth = color.width || 1
    ctx.strokeStyle = color.stroke || 'white'
    ctx.fillStyle = color.fill || 'gray'
    ctx.stroke()
    ctx.fill()
  }

  // Draw text aligned to an anchor point
  drawText (anchor: Point, text: string, color: TextColor): void {
    let x = anchor.x
    let y = anchor.y

    let ctx = this.context
    ctx.textAlign = color.alignment || 'center'
    ctx.textBaseline = color.baseline || 'middle'
    ctx.font = color.font || '12px sans-serif'
    ctx.fillStyle = color.fill || 'white'
    let lineHeight = color.lineHeight || 16

    // TODO: improve alignment and offset of multiline rendering
    let lines = text.split('\n')
    if (lines.length > 1) {
      for (let i = 0, len = lines.length; i < len; i++) {
        ctx.fillText(lines[i], x, y + (i - 0.5) * lineHeight)
      }
    } else {
      ctx.fillText(text, x, y)
    }
  }

  drawHexCell (col: number, row: number, color: ShapeColor = {}): void {
    let center = this.getHexCenter(col, row)
    this.drawHexagon(center, color)
  }

  drawHexLabel (col: number, row: number, text: string, offset: Point = new Point(0, 0), color: ShapeColor = {}): void {
    let anchor = this.getHexCenter(col, row).add(offset)
    this.drawText(anchor, text, color)
  }

  drawHexLink (col1: number, row1: number, col2: number, row2: number, color: ShapeColor = {}): void {
    let a = this.getHexCenter(col1, row1)
    let b = this.getHexCenter(col2, row2)
    this.drawLine(a, b, color)
  }

  getHexCenter (col: number, row: number): Point {
    let x = col * this.hex.width
    let yOffset = (col & 1) ? 0 : (this.hex.height / 2)
    let y = row * this.hex.height + yOffset
    return this.origin.add(new Point(x, y))
  }

  isPointInCell (point: Point, col: number, row: number): boolean {
    let center = this.getHexCenter(col, row)
    let x = center.x
    let y = center.y

    // Hexagon vertices going by Cartesian CW
    let p1 = new Point(x + this.cell.radius, y)
    let p2 = new Point(x + (this.cell.radius / 2), y + this.cell.height / 2)
    let p3 = new Point(x - (this.cell.radius / 2), y + this.cell.height / 2)
    let p4 = new Point(x - this.cell.radius, y)
    let p5 = new Point(x - (this.cell.radius / 2), y - this.cell.height / 2)
    let p6 = new Point(x + (this.cell.radius / 2), y - this.cell.height / 2)

    // 3, 4, 5 form left-side triangle; 1, 2, 6 form right-side triangle
    // 5, 2 are TL and BR bounds for center rectangle
    return point.isInTriangle(p3, p4, p5) || point.isInRectangle(p5, p2) || point.isInTriangle(p6, p1, p2)
  }

  getHexAtPoint (point: Point): Hex | null {
    let offsetPoint = point.subtract(this.origin)

    let colApprox = offsetPoint.x / this.hex.width
    let col = Math.floor(colApprox)

    // Apply (undo) odd-col offset
    let rowApprox = (offsetPoint.y - (col & 1 ? 0 : this.hex.height / 2)) / this.hex.height
    let row = Math.floor(rowApprox)

    // Check (guessed) cell closest to point
    if (this.isPointInCell(point, col, row)) {
      return { col: col, row: row }
    }

    // Check cell below guess
    if (this.isPointInCell(point, col, row + 1)) {
      return { col: col, row: row + 1 }
    }

    let brRow = row + (col & 1 ? 0 : 1)
    // Check cell to bottom-right of guessed cell
    if (this.isPointInCell(point, col + 1, brRow)) {
      return { col: col + 1, row: brRow }
    }
  }

  getCursorCanvasPoint (e: MouseEvent): Point {
    let rect = this.canvas.getBoundingClientRect()
    return new Point(e.clientX - rect.left, e.clientY - rect.top)
  }
}
