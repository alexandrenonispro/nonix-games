// floodFill.worker.ts — s'exécute dans un thread séparé

function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b, 255]
}

self.onmessage = (e: MessageEvent) => {
  const { imageData, width, height, startX, startY, fillColor } = e.data as {
    imageData: ImageData
    width: number
    height: number
    startX: number
    startY: number
    fillColor: string
  }

  const data = imageData.data
  const [fr, fg, fb] = hexToRgba(fillColor)

  const si = (startY * width + startX) * 4
  const tr = data[si]!, tg = data[si+1]!, tb = data[si+2]!, ta = data[si+3]!

  if (Math.abs(tr - fr) < 5 && Math.abs(tg - fg) < 5 && Math.abs(tb - fb) < 5) {
    self.postMessage({ imageData, changed: false })
    return
  }

  const filled = new Uint8Array(width * height)

  const isSimilar = (p: number) => {
    const i = p * 4
    return Math.abs(data[i]! - tr) <= 80 &&
           Math.abs(data[i+1]! - tg) <= 80 &&
           Math.abs(data[i+2]! - tb) <= 80 &&
           Math.abs(data[i+3]! - ta) <= 80
  }

  const paint = (p: number) => {
    const i = p * 4
    data[i] = fr; data[i+1] = fg; data[i+2] = fb; data[i+3] = 255
    filled[p] = 1
  }

  // BFS depuis le point cliqué
  const startPos = startY * width + startX
  const visited = new Uint8Array(width * height)
  const stack: number[] = [startPos]
  visited[startPos] = 1

  while (stack.length > 0) {
    const p = stack.pop()!
    if (!isSimilar(p)) continue
    paint(p)
    const x = p % width, y = Math.floor(p / width)
    if (x > 0       && !visited[p-1])        { visited[p-1] = 1;        stack.push(p-1) }
    if (x < width-1 && !visited[p+1])        { visited[p+1] = 1;        stack.push(p+1) }
    if (y > 0       && !visited[p-width])     { visited[p-width] = 1;    stack.push(p-width) }
    if (y < height-1 && !visited[p+width])   { visited[p+width] = 1;    stack.push(p+width) }
    if (x > 0 && y > 0               && !visited[p-width-1]) { visited[p-width-1] = 1; stack.push(p-width-1) }
    if (x < width-1 && y > 0         && !visited[p-width+1]) { visited[p-width+1] = 1; stack.push(p-width+1) }
    if (x > 0 && y < height-1        && !visited[p+width-1]) { visited[p+width-1] = 1; stack.push(p+width-1) }
    if (x < width-1 && y < height-1  && !visited[p+width+1]) { visited[p+width+1] = 1; stack.push(p+width+1) }
  }

  // Passes d'absorption des pixels isolés d'antialiasing
  for (let pass = 0; pass < 8; pass++) {
    let changed = false
    for (let p = width + 1; p < width * height - width - 1; p++) {
      if (filled[p]) continue
      const x = p % width
      if (x === 0 || x === width - 1) continue
      const n4 = (filled[p-1] ? 1 : 0) + (filled[p+1] ? 1 : 0) +
                 (filled[p-width] ? 1 : 0) + (filled[p+width] ? 1 : 0)
      const n8 = n4 + (filled[p-width-1] ? 1 : 0) + (filled[p-width+1] ? 1 : 0) +
                      (filled[p+width-1] ? 1 : 0) + (filled[p+width+1] ? 1 : 0)
      if (n4 >= 3 || n8 >= 6) {
        paint(p); changed = true
      }
    }
    if (!changed) break
  }

  // Renvoyer les données modifiées au thread principal via transfert (zero-copy)
  self.postMessage({ imageData, changed: true }, [imageData.data.buffer])
}
