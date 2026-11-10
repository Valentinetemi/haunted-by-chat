import './style.css'

const loadingScreen = document.querySelector('#loading-screen')
const loadFill = document.querySelector('#load-bar-fill')
const loadStatus = document.querySelector('#load-status')

function report(progress, text) {
  const amount = Math.max(0, Math.min(1, progress))
  loadFill.style.transform = `scaleX(${amount})`
  if (text) loadStatus.textContent = text
}

async function start() {
  report(0.06, 'The lock is turning…')

  let crept = 0.06
  const creepTimer = window.setInterval(() => {
    crept = Math.min(0.36, crept + 0.025)
    report(crept)
  }, 80)

  try {
    const { bootGame } = await import('./game.js')
    window.clearInterval(creepTimer)
    await bootGame(report)
    loadingScreen.classList.add('is-done')
    window.setTimeout(() => {
      loadingScreen.hidden = true
    }, 320)
  } catch (error) {
    window.clearInterval(creepTimer)
    console.error(error)
    loadStatus.textContent = 'The house would not open'
  }
}

start()
