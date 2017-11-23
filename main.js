/*
MIT License

Copyright (c) 2017 Richard Marks

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const SCREEN_WIDTH = 640
const SCREEN_HEIGHT = 400

// game states
const GS_TITLE = 'title'
const GS_PLAY = 'play'
const GS_GAMEOVER = 'gameover'

// keyboard key codes
const KEY_UP = 38
const KEY_DOWN = 40
const KEY_LEFT = 37
const KEY_RIGHT = 39
const KEY_W = 87
const KEY_S = 83
const KEY_A = 65
const KEY_D = 68
const KEY_ENTER = 13
const KEY_SPACE = 32
const KEY_ESCAPE = 27
const KEY_SHIFT = 16
const KEY_CTRL = 17

const game = {
  canvas: undefined,

  loadHighScore () {
    return ~~(window.localStorage.getItem('highScore')) || 0
  },

  saveHighScore (score) {
    game.highScore = score
    window.localStorage.setItem('highScore', `${score}`)
  },

  spawnBox ({ x, y, vx, vy, width, height, ai }) {
    const box = {
      x,
      y,
      vx,
      vy,
      width,
      height,
      ai,
      get halfWidth () { return box.width * 0.5 },
      get halfHeight () { return box.height * 0.5 },

      reset () {
        box.x = x
        box.y = y
        box.vx = vx
        box.vy = vy
        box.width = width
        box.height = height
      },

      update (deltaTime) {
        ai && ai.update && ai.update(deltaTime)
      },

      render (renderingContext) {
        renderingContext.translate(box.x, box.y)
        renderingContext.fillRect(-box.halfWidth, -box.halfHeight, box.width, box.height)
        renderingContext.translate(-box.x, -box.y)
      }
    }

    ai && ai.attach && ai.attach(box)

    return box
  },

  init () {
    game.state = GS_TITLE
    game.score = 0
    game.highScore = game.loadHighScore()
    game.time = 0

    const leftRightBoxAI = ({ leftLimit, rightLimit }) => {
      const ai = {
        box: undefined,

        attach (box) {
          ai.box = box

          box.render = renderingContext => {
            renderingContext.translate(box.x, box.y)
            const oldFill = renderingContext.fillStyle
            renderingContext.fillStyle = 'crimson'
            renderingContext.fillRect(-box.halfWidth, -box.halfHeight, box.width, box.height)

            const particleOriginY = (0.3 * box.height) * Math.sin(game.time * 3)
            const particleOriginX = box.vx > 0
              ? -box.width
              : box.width

            const particleSize = 8 - (4 * Math.cos(game.time * 12))
            const particleJitter = box.vx > 0
              ? Math.cos(game.time * 12) * box.halfWidth
              : Math.cos(game.time * 12) * -box.halfWidth

            renderingContext.beginPath()
            renderingContext.rect(
              particleOriginX + particleJitter,
              particleOriginY,
              particleSize,
              particleSize)
            renderingContext.fill()

            renderingContext.translate(-box.x, -box.y)
            renderingContext.fillStyle = oldFill
          }
        },

        update (deltaTime) {
          const { box } = ai

          if (!box) {
            return
          }

          const offLeftEdge = (box.x - box.halfWidth) < leftLimit
          const offRightEdge = (box.x + box.halfWidth > rightLimit)

          box.x += box.vx * deltaTime
          if (offLeftEdge || offRightEdge) {
            box.vx = -box.vx
            box.x += box.vx * deltaTime
            box.x += box.vx * deltaTime
          }
        }
      }
      return ai
    }

    const bouncingBoxAI = () => {
      const ai = {
        box: undefined,

        attach (box) {
          ai.box = box
        },

        update (deltaTime) {
          const { box } = ai
          if (!box) {
            return
          }

          const offBottomEdge = (box.y + box.halfHeight) > SCREEN_HEIGHT
          const offTopEdge = (box.y - box.halfHeight) < 0
          const offLeftEdge = (box.x - box.halfWidth) < 0
          const offRightEdge = (box.x + box.halfWidth > SCREEN_WIDTH)

          box.y += box.vy * deltaTime
          box.x += box.vx * deltaTime
          if (offBottomEdge || offTopEdge) {
            box.vy = -box.vy
            box.y += box.vy * deltaTime
            box.y += box.vy * deltaTime
          }

          if (offLeftEdge || offRightEdge) {
            box.vx = -box.vx
            box.x += box.vx * deltaTime
            box.x += box.vx * deltaTime
          }
        }
      }

      return ai
    }

    game.boxes = [
      game.spawnBox({
        x: SCREEN_WIDTH * 0.25,
        y: SCREEN_HEIGHT * 0.25,
        vy: -220,
        vx: 60,
        width: 48,
        height: 48,
        ai: bouncingBoxAI()
      }),
      game.spawnBox({
        x: SCREEN_WIDTH * 0.45,
        y: SCREEN_HEIGHT * 0.25,
        vy: 100,
        vx: -60,
        width: 48,
        height: 48,
        ai: bouncingBoxAI()
      }),
      game.spawnBox({
        x: SCREEN_WIDTH * 0.5,
        y: SCREEN_HEIGHT * 0.25,
        vy: 125,
        vx: 92,
        width: 32,
        height: 48,
        ai: leftRightBoxAI({ leftLimit: 0, rightLimit: SCREEN_WIDTH })
      })
    ]

    game.drawBoxes = renderingContext => {
      const ctx = renderingContext

      ctx.save()
      ctx.strokeStyle = 'crimson'
      ctx.fillStyle = 'crimson'
      game.boxes.forEach(box => box.render(renderingContext))
      ctx.restore()
    }

    game.updateBoxes = deltaTime => {
      game.boxes.forEach(box => box.update(deltaTime))
    }

    game.input = {
      keys: {},
      keysPressed: {}
    }

    const PASS_THROUGH = [
      91, KEY_CTRL, KEY_SHIFT
    ]

    window.addEventListener('keydown', event => {
      PASS_THROUGH.includes(event.keyCode) || event.preventDefault()
      game.input.keys[event.keyCode] = true
    }, true)

    window.addEventListener('keyup', event => {
      PASS_THROUGH.includes(event.keyCode) || event.preventDefault()
      delete game.input.keys[event.keyCode]
    }, true)


    game.boostGauge = {
      boost: 100,
      boostTime: 0,
      rate: 0.3,
      flow: 5,
      available: true,

      reset () {
        game.boostGauge.boost = 100
        game.boostGauge.boostTime = 0
        game.boostGauge.available = true
      },

      update (deltaTime) {
        if (game.boostGauge.available && game.input.keys[KEY_SHIFT]) {
          game.boostGauge.boostTime += deltaTime

          if (game.boostGauge.boostTime > game.boostGauge.rate) {
            game.boostGauge.boostTime -= game.boostGauge.rate
            if (game.boostGauge.boost > 0) {
              game.boostGauge.boost -= game.boostGauge.flow
              if (game.boostGauge.boost <= 0) {
                game.boostGauge.available = false
              }
            }
          }
        } else if (!game.input.keys[KEY_SHIFT]) {
          game.boostGauge.boostTime += deltaTime

          if (game.boostGauge.boostTime > game.boostGauge.rate) {
            game.boostGauge.boostTime -= game.boostGauge.rate
            if (game.boostGauge.boost < 100) {
              game.boostGauge.boost += 1 + ~~(0.33 * game.boostGauge.flow)
            } else {
              game.boostGauge.available = true
            }
          }
        }
      },

      render (renderingContext) {
        const percentage = game.boostGauge.boost * 0.01
        const barWidth = SCREEN_WIDTH * 0.33
        const barHeight = 16
        const rightMargin = 10
        const barY = 10
        const barX = SCREEN_WIDTH - (barWidth + rightMargin)
        const barFillWidth = ~~(barWidth * percentage)
        const bottomMargin = 10
        const labelY = barY + barHeight + bottomMargin

        renderingContext.strokeRect(barX, barY, barWidth, barHeight)

        if (barFillWidth) {
          renderingContext.fillRect((barX + barWidth) - barFillWidth, barY, barFillWidth, barHeight)
        }

        if (game.boostGauge.available) {
          renderingContext.fillText(`${game.boostGauge.boost} %`, barX + (barWidth * 0.5), labelY)
        } else {
          if (game.input.keys[KEY_SHIFT]) {
            renderingContext.fillText(`boost is unavailable`, barX + (barWidth * 0.5), labelY)
          } else {
            renderingContext.fillText(`cooling down`, barX + (barWidth * 0.5), labelY)
          }

        }
      }
    }

    game.player = {
      x: SCREEN_WIDTH * 0.5,
      y: SCREEN_HEIGHT * 0.85,
      speed: 150,
      width: 32,
      height: 32,
      halfWidth: 16,
      halfHeight: 16,
      reset (player) {
        player.x = SCREEN_WIDTH * 0.5
        player.y = SCREEN_HEIGHT * 0.85
      },

      checkCollisionAgainstBoxes () {
        const playerLeft = game.player.x - game.player.halfWidth
        const playerTop = game.player.y - game.player.halfHeight
        const playerRight = game.player.x + game.player.halfWidth
        const playerBottom = game.player.y + game.player.halfHeight

        const boxCount = game.boxes.length
        let collision = false

        for (let i = 0; i < boxCount; i += 1) {
          const box = game.boxes[i]

          const boxLeft = box.x - box.halfWidth
          const boxTop = box.y - box.halfHeight
          const boxRight = box.x + box.halfWidth
          const boxBottom = box.y + box.halfHeight

          if (!(
            (playerBottom < boxTop) ||
            (playerTop > boxBottom) ||
            (playerLeft > boxRight) ||
            (playerRight < boxLeft)
          )) {
            collision = true
            break
          }
        }

        return collision
      },

      update (deltaTime) {
        const collision = game.player.checkCollisionAgainstBoxes()

        if (collision) {
          game.scoreTimer.paused = true
          game.state = GS_GAMEOVER
          return
        }

        game.player.vx = 0
        game.player.vy = 0

        let speedMultiplier = game.boostGauge.available && game.input.keys[KEY_SHIFT]
          ? 1.9
          : 1.0

        if (game.input.keys[KEY_UP]) {
          game.player.vy = -1
        } else if (game.input.keys[KEY_DOWN]) {
          game.player.vy = 1
        }

        if (game.input.keys[KEY_LEFT]) {
          game.player.vx = -1
        } else if (game.input.keys[KEY_RIGHT]) {
          game.player.vx = 1
        }

        if (game.player.vx !== 0 || game.player.vy !== 0) {
          const x2 = game.player.vx * game.player.vx
          const y2 = game.player.vy * game.player.vy
          const magnitude = Math.sqrt(x2 + y2)

          if (magnitude) {
            const vx = game.player.vx / magnitude
            const vy = game.player.vy / magnitude

            const moveX = speedMultiplier * game.player.speed * vx
            const moveY = speedMultiplier * game.player.speed * vy

            game.player.x += moveX * deltaTime
            game.player.y += moveY * deltaTime
          }

          if (game.player.x - game.player.halfWidth < 0) {
            game.player.x = game.player.halfWidth
          } else if (game.player.x + game.player.halfWidth > SCREEN_WIDTH) {
            game.player.x = SCREEN_WIDTH - game.player.halfWidth
          }

          if (game.player.y - game.player.halfHeight < 0) {
            game.player.y = game.player.halfHeight
          } else if (game.player.y + game.player.halfHeight > SCREEN_HEIGHT) {
            game.player.y = SCREEN_HEIGHT - game.player.halfHeight
          }
        }
      },

      render (renderingContext) {
        const ctx = renderingContext

        ctx.save()
        ctx.translate(game.player.x, game.player.y)
        ctx.fillRect(-game.player.halfWidth, -game.player.halfHeight, game.player.width, game.player.height)
        ctx.restore()
      }
    }

    game.scoreTimer = {
      time: 0,
      paused: false,

      update (deltaTime) {
        if (!game.scoreTimer.paused) {
          game.scoreTimer.time += deltaTime

          if (game.scoreTimer.time >= 1.0) {
            game.scoreTimer.time -= 1.0
            game.score += 1
          }
        }
      },

      render (renderingContext) {
        const ctx = renderingContext
        ctx.fillText(`SCORE: ${game.score}`, SCREEN_WIDTH * 0.5, 16)
      }
    }
  },

  update (deltaTime) {
    if (game.state === GS_TITLE) {
      // press space to play
      if (game.input.keys[KEY_SPACE] && !game.input.keysPressed[KEY_SPACE]) {
        game.input.keysPressed[KEY_SPACE] = true
      } else if (!game.input.keys[KEY_SPACE] && game.input.keysPressed[KEY_SPACE]) {
        game.input.keysPressed[KEY_SPACE] = false
        game.score = 0
        game.scoreTimer.time = 0
        game.scoreTimer.paused = false
        game.player.reset.bind(null, game.player)()
        game.boxes.forEach(box => box.reset.bind(null, box)())
        game.boostGauge.reset()
        game.state = GS_PLAY
        game.time = 0
      }
    } else if (game.state === GS_PLAY) {
      if (game.scoreTimer.paused) {
        // resume play on space
        if (game.input.keys[KEY_SPACE] && !game.input.keysPressed[KEY_SPACE]) {
          game.input.keysPressed[KEY_SPACE] = true
        } else if (!game.input.keys[KEY_SPACE] && game.input.keysPressed[KEY_SPACE]) {
          game.input.keysPressed[KEY_SPACE] = false
          game.scoreTimer.paused = false
        }

        // quit to title on escape
        if (game.input.keys[KEY_ESCAPE] && !game.input.keysPressed[KEY_ESCAPE]) {
          game.input.keysPressed[KEY_ESCAPE] = true
        } else if (!game.input.keys[KEY_ESCAPE] && game.input.keysPressed[KEY_ESCAPE]) {
          game.input.keysPressed[KEY_ESCAPE] = false
          game.state = GS_TITLE
        }
      } else {
        game.time += deltaTime
        game.updateBoxes(deltaTime)
        game.boostGauge.update(deltaTime)
        game.player.update && game.player.update(deltaTime)
        game.scoreTimer.update(deltaTime)

        // pause play on space
        if (game.input.keys[KEY_SPACE] && !game.input.keysPressed[KEY_SPACE]) {
          game.input.keysPressed[KEY_SPACE] = true
        } else if (!game.input.keys[KEY_SPACE] && game.input.keysPressed[KEY_SPACE]) {
          game.input.keysPressed[KEY_SPACE] = false
          game.scoreTimer.paused = true
        }
      }
    } else if (game.state === GS_GAMEOVER) {
      if (game.input.keys[KEY_SPACE] && !game.input.keysPressed[KEY_SPACE]) {
        game.input.keysPressed[KEY_SPACE] = true
      } else if (!game.input.keys[KEY_SPACE] && game.input.keysPressed[KEY_SPACE]) {
        game.input.keysPressed[KEY_SPACE] = false
        if (game.score > game.highScore) {
          game.saveHighScore(game.score)
        }
        game.state = GS_TITLE
      }
    }
  },

  render (renderingContext) {
    const ctx = renderingContext

    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    if (game.state === GS_TITLE) {
      if (game.highScore) {
        ctx.fillText(`HIGH SCORE: ${game.highScore}`, SCREEN_WIDTH * 0.5, 16)
      }
      ctx.fillText('Press Space to Play', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5)
    } else if (game.state === GS_PLAY) {
      game.drawBoxes(renderingContext)
      game.player.render(renderingContext)
      game.boostGauge.render(renderingContext)

      ctx.strokeRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
      game.scoreTimer.render(renderingContext)

      if (game.scoreTimer.paused) {
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
        ctx.restore()

        const oldFont = ctx.font
        ctx.fillStyle = 'white'
        ctx.font = '48px "Kelly Slab"'
        ctx.fillText('PAUSED', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5)
        ctx.font = oldFont
        ctx.fillStyle = 'lime'
        ctx.fillText('Press Space to Resume', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.65)
        ctx.fillText('Press ESC to Quit', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.75)
      }
    } else if (game.state === GS_GAMEOVER) {
      ctx.strokeRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
      game.scoreTimer.render(renderingContext)
      game.drawBoxes(renderingContext)
      game.player.render(renderingContext)
      game.boostGauge.render(renderingContext)

      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
      ctx.restore()

      const oldFont = ctx.font
      ctx.fillStyle = 'red'
      ctx.font = '48px "Kelly Slab"'
      ctx.fillText('GAME OVER', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5)
      ctx.font = oldFont
      ctx.fillStyle = 'lime'
      ctx.fillText('Press Space to Restart', SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.65)

    }
  }
}

const boot = () => {
  console.clear()
  game.canvas = document.querySelector('.game-canvas')
  const renderingContext = game.canvas.getContext('2d')
  renderingContext.textAlign = 'center'
  renderingContext.textBaseline = 'middle'
  renderingContext.font = '16px "Kelly Slab"'
  renderingContext.fillStyle = 'lime'
  renderingContext.strokeStyle = 'lime'

  game.init && game.init()

  let lastTime = Date.now()
  const mainLoop = elapsedTime => {
    const currentTime = Date.now()
    const deltaTime = (currentTime - lastTime) * 0.001
    lastTime = currentTime
    game.update && game.update(deltaTime)
    game.render && game.render(renderingContext)
    window.requestAnimationFrame(mainLoop)
  }

  mainLoop(0)
}

document.addEventListener('DOMContentLoaded', boot, false)
