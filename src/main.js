import * as THREE from 'three'

import { createAudioSystem } from './audio.js'
import {
  HUNTER_SPAWNS,
  PLAYER_START,
  createHauntedHouse,
  getRoomAt,
  movePlayerWithinHouse,
} from './house.js'
import { createBlackPuddles, createMotherDrips } from './effects.js'
import { createHidingSystem } from './hiding.js'
import { createKeySystem } from './keys.js'
import {
  createMother,
  updateMotherAnimation,
  updateMotherFaceReveal,
} from './mother.js'
import { createScareDirector } from './scares.js'
import { createRunTimer } from './timer.js'
import {
  furnishBathroom,
  furnishAttic,
  furnishBasement,
  furnishEntrance,
  furnishKitchen,
  furnishKidsBedroom,
  furnishLivingRoom,
} from './props.js'
import './style.css'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x090708)
scene.fog = new THREE.FogExp2(0x090708, 0.025)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.copy(PLAYER_START)
camera.rotation.order = 'YXZ'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
document.querySelector('#app').appendChild(renderer.domElement)

const clock = new THREE.Clock()
const audio = createAudioSystem()
const house = createHauntedHouse(scene)
const blackPuddles = createBlackPuddles(house.group)
furnishEntrance(house.group)
furnishLivingRoom(house.group)
furnishKitchen(house.group)
const bathroomProps = furnishBathroom(house.group)
furnishKidsBedroom(house.group)
furnishBasement(house.group)
furnishAttic(house.group)
const pressedKeys = new Set()
const movement = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const cameraShakeOffset = new THREE.Vector3()
const movementSpeed = 5
const sprintSpeed = 8.4
const maxStamina = 3.2
const staminaRecoveryRate = 0.72
const staminaFill = document.querySelector('#stamina-fill')
const staminaHud = document.querySelector('#stamina-hud')
const lookSensitivity = 0.002
const maxPitch = Math.PI / 2 - 0.01
const startScreen = document.querySelector('#start-screen')
const playButton = document.querySelector('#play-button')
const streamerButton = document.querySelector('#streamer-button')
const howToButton = document.querySelector('#how-to-button')
const howToPanel = document.querySelector('#how-to-panel')
const whisperMessage = document.querySelector('#whisper-message')
const twitchFeed = document.querySelector('#twitch-feed')
const stunHud = document.querySelector('#stun-hud')
const shotsRemainingDisplay = document.querySelector('#shots-remaining')
const caughtScreen = document.querySelector('#caught-screen')
const restartButton = document.querySelector('#restart-button')
const escapeScreen = document.querySelector('#escape-screen')
const playAgainButton = document.querySelector('#play-again-button')
const interactionPrompt = document.querySelector('#interaction-prompt')
const goalPrompt = document.querySelector('#goal-prompt')
const jumpscare = document.querySelector('#jumpscare')
const dangerVignette = document.querySelector('#danger-vignette')
const rewardToast = document.querySelector('#reward-toast')
const hiding = createHidingSystem(camera, interactionPrompt)
const runTimer = createRunTimer({
  bestDisplay: document.querySelector('#best-time'),
  finalDisplay: document.querySelector('#final-time'),
  hudDisplay: document.querySelector('#run-time'),
})
let jumpscareTimeoutId = 0
let rewardTimeoutId = 0
let dangerWasClose = false
let nearMissCooldownUntil = 0
let yaw = 0
let pitch = 0
let playerCaught = false
let playerEscaped = false
let stamina = maxStamina
let whisperTimeoutId = 0

const flickerDuration = 2000
let flickerEndsAt = 0
let nextFlickerPulseAt = 0

function flickerLights() {
  const now = performance.now()
  flickerEndsAt = now + flickerDuration
  nextFlickerPulseAt = now
  audio.flicker()
}

function updateLightFlicker(now) {
  if (flickerEndsAt === 0) return

  if (now >= flickerEndsAt) {
    for (const { fixture, light, baseIntensity, baseEmissive } of house.ceilingLights) {
      light.intensity = baseIntensity
      fixture.material.emissiveIntensity = baseEmissive
    }
    flickerEndsAt = 0
    return
  }

  if (now < nextFlickerPulseAt) return

  for (const { fixture, light, baseIntensity, baseEmissive } of house.ceilingLights) {
    const brightness =
      Math.random() < 0.48 ? Math.random() * 0.08 : 0.25 + Math.random() * 0.65
    light.intensity = baseIntensity * brightness
    fixture.material.emissiveIntensity = baseEmissive * brightness
  }
  nextFlickerPulseAt = now + 40 + Math.random() * 120
}

function whisper(text) {
  window.clearTimeout(whisperTimeoutId)
  whisperMessage.textContent = text
  whisperMessage.hidden = false
  whisperMessage.classList.remove('is-visible')
  void whisperMessage.offsetWidth
  whisperMessage.classList.add('is-visible')
  audio.whisper()
  whisperTimeoutId = window.setTimeout(() => {
    whisperMessage.hidden = true
    whisperMessage.classList.remove('is-visible')
  }, 3000)
}

const doorSlamDuration = 240
const doorSlamRange = 12
const cameraShakeDuration = 280
const cameraShakeStrength = 0.08
let activeDoorSlam = null
let cameraShakeEndsAt = 0

function slamDoor() {
  if (activeDoorSlam) activeDoorSlam.door.hinge.rotation.y = 0

  const nearbyDoors = house.doors.filter(
    (door) => door.position.distanceToSquared(camera.position) <= doorSlamRange ** 2,
  )
  const candidates = nearbyDoors.length > 0 ? nearbyDoors : house.doors
  const door = candidates[Math.floor(Math.random() * candidates.length)]

  if (!door) {
    cameraShakeEndsAt = performance.now() + cameraShakeDuration
    return false
  }

  if (Math.abs(door.hinge.rotation.y) <= 0.05) door.hinge.rotation.y = door.openRotation
  activeDoorSlam = {
    door,
    startedAt: performance.now(),
    startRotation: door.hinge.rotation.y,
  }
  return true
}

function updateDoorSlam(now) {
  if (!activeDoorSlam) return
  const progress = Math.min((now - activeDoorSlam.startedAt) / doorSlamDuration, 1)
  const easedProgress = 1 - (1 - progress) ** 4
  activeDoorSlam.door.hinge.rotation.y = THREE.MathUtils.lerp(
    activeDoorSlam.startRotation,
    0,
    easedProgress,
  )

  if (progress === 1) {
    activeDoorSlam = null
    cameraShakeEndsAt = now + cameraShakeDuration
    audio.slam()
  }
}

function applyCameraShake(now) {
  cameraShakeOffset.set(0, 0, 0)
  if (now >= cameraShakeEndsAt) return

  const strength = cameraShakeStrength * ((cameraShakeEndsAt - now) / cameraShakeDuration)
  cameraShakeOffset.set(
    (Math.random() - 0.5) * strength,
    (Math.random() - 0.5) * strength,
    (Math.random() - 0.5) * strength * 0.5,
  )
  camera.position.add(cameraShakeOffset)
}

const ghost = new THREE.Group()
const ghostDirection = new THREE.Vector3()
const ghostStartPosition = HUNTER_SPAWNS[Math.floor(Math.random() * HUNTER_SPAWNS.length)].clone()
const ghostDriftSpeed = 0.58
const ghostCatchDistance = 1.05
const ghostRushDuration = 4000
const ghostRushMultiplier = 3
let ghostRushEndsAt = 0
const mother = createMother()
const motherDrips = createMotherDrips(scene)
const hunterVisual = mother.group
const maxStunShots = 3
const stunDuration = 3000
const stunBoltSpeed = 32
const stunBoltLifetime = 3
const stunBolts = []
const hunterHitBox = new THREE.Box3()
const hunterHitCenter = new THREE.Vector3()
const hunterHitSize = new THREE.Vector3(0.9, 2.35, 0.85)
const stunRay = new THREE.Ray()
const stunHitPoint = new THREE.Vector3()
const stunBoltGeometry = new THREE.SphereGeometry(0.07, 12, 8)
const stunBoltMaterial = new THREE.MeshBasicMaterial({ color: 0x39bfff, toneMapped: false })
let stunShotsRemaining = maxStunShots
let hunterFrozenUntil = 0
ghost.add(hunterVisual)
ghost.position.copy(ghostStartPosition)
scene.add(ghost)

function updateHunterEffects(time) {
  const isStunned = time < hunterFrozenUntil
  const motherDistance = Math.hypot(
    camera.position.x - ghost.position.x,
    camera.position.z - ghost.position.z,
  )
  const chaseIntensity = time < ghostRushEndsAt ? 2.4 : motherDistance < 9 ? 1.65 : 1
  updateMotherAnimation(mother, time, chaseIntensity, isStunned)
  updateMotherFaceReveal(mother, motherDistance, time)
  mother.skinMaterial.emissiveIntensity = 0.2 + Math.sin(time * 0.002) * 0.05
}

function updateStunHud() {
  shotsRemainingDisplay.textContent = String(stunShotsRemaining)
  stunHud.classList.toggle('is-empty', stunShotsRemaining === 0)
}

function fireStunBlaster() {
  if (
    stunShotsRemaining === 0 ||
    playerCaught ||
    hiding.isHidden ||
    document.pointerLockElement !== renderer.domElement
  ) return
  const direction = new THREE.Vector3()
  camera.getWorldDirection(direction)
  const bolt = new THREE.Mesh(stunBoltGeometry, stunBoltMaterial)
  bolt.position.copy(camera.position).addScaledVector(direction, 0.4)
  bolt.add(new THREE.PointLight(0x38bfff, 5, 3, 2))
  scene.add(bolt)
  stunBolts.push({ direction, lifetime: stunBoltLifetime, mesh: bolt })
  stunShotsRemaining -= 1
  audio.blaster()
  updateStunHud()
}

function removeStunBolt(index) {
  scene.remove(stunBolts[index].mesh)
  stunBolts.splice(index, 1)
}

function freezeHunter(time) {
  hunterFrozenUntil = time + stunDuration
  hunterVisual.position.set(0, 0, 0)
  hunterVisual.rotation.set(0, 0, 0)
  audio.stun()
}

function updateStunBolts(delta, time) {
  hunterHitCenter.set(ghost.position.x, ghost.position.y + 1.15, ghost.position.z)
  hunterHitBox.setFromCenterAndSize(hunterHitCenter, hunterHitSize)
  for (let index = stunBolts.length - 1; index >= 0; index -= 1) {
    const bolt = stunBolts[index]
    const travelDistance = stunBoltSpeed * delta
    stunRay.set(bolt.mesh.position, bolt.direction)
    const hitPoint = stunRay.intersectBox(hunterHitBox, stunHitPoint)
    if (hitPoint && hitPoint.distanceToSquared(bolt.mesh.position) <= travelDistance ** 2) {
      freezeHunter(time)
      removeStunBolt(index)
      continue
    }
    bolt.mesh.position.addScaledVector(bolt.direction, travelDistance)
    bolt.lifetime -= delta
    if (bolt.lifetime <= 0) removeStunBolt(index)
  }
}

function updateHunterStun(time) {
  const isFrozen = time < hunterFrozenUntil
  mother.stunLight.intensity = isFrozen ? 9 + Math.sin(time * 0.035) * 2 : 0
  mother.skinMaterial.emissive.setHex(isFrozen ? 0x195875 : 0x140c0d)
  mother.skinMaterial.emissiveIntensity = isFrozen ? 1.4 : 0.22
}

function resetStunBlaster() {
  for (let index = stunBolts.length - 1; index >= 0; index -= 1) removeStunBolt(index)
  stunShotsRemaining = maxStunShots
  hunterFrozenUntil = 0
  mother.stunLight.intensity = 0
  mother.skinMaterial.emissive.setHex(0x140c0d)
  updateStunHud()
}

function rushGhost() {
  ghostRushEndsAt = performance.now() + ghostRushDuration
}

function updateGhost(delta, time) {
  ghostDirection.set(camera.position.x - ghost.position.x, 0, camera.position.z - ghost.position.z)
  if (ghostDirection.lengthSq() > 0.0001) {
    const difficultyMultiplier = 1 + keySystem.count * 0.16
    const speedMultiplier =
      difficultyMultiplier * (time < ghostRushEndsAt ? ghostRushMultiplier : 1)
    ghost.position.addScaledVector(ghostDirection.normalize(), ghostDriftSpeed * speedMultiplier * delta)
    ghost.lookAt(camera.position.x, ghost.position.y, camera.position.z)
  }
  ghost.position.y = ghostStartPosition.y + Math.sin(time * 0.0012) * 0.08
}

function randomizeHunterSpawn() {
  const distantSpawns = HUNTER_SPAWNS.filter(
    (spawn) => spawn.distanceToSquared(camera.position) > 12 ** 2,
  )
  const candidates = distantSpawns.length > 0 ? distantSpawns : HUNTER_SPAWNS
  ghostStartPosition.copy(candidates[Math.floor(Math.random() * candidates.length)])
  ghost.position.copy(ghostStartPosition)
}

function ghostReachedPlayer() {
  if (hiding.isHidden) return false
  const xDistance = camera.position.x - ghost.position.x
  const zDistance = camera.position.z - ghost.position.z
  return xDistance ** 2 + zDistance ** 2 <= ghostCatchDistance ** 2
}

function catchPlayer() {
  playerCaught = true
  pressedKeys.clear()
  startScreen.hidden = true
  caughtScreen.hidden = false
  audio.caught()
  runTimer.pause()
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
}

function updateStamina(delta, isSprinting) {
  stamina = THREE.MathUtils.clamp(
    stamina + (isSprinting ? -delta : delta * staminaRecoveryRate),
    0,
    maxStamina,
  )
  const staminaRatio = stamina / maxStamina
  staminaFill.style.transform = `scaleX(${staminaRatio})`
  staminaHud.classList.toggle('is-exhausted', staminaRatio < 0.12)
}

function escapeHouse() {
  playerEscaped = true
  pressedKeys.clear()
  startScreen.hidden = true
  escapeScreen.hidden = false
  runTimer.finish()
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
}

function showReward(text) {
  window.clearTimeout(rewardTimeoutId)
  rewardToast.textContent = text
  rewardToast.hidden = false
  rewardToast.classList.remove('is-visible')
  void rewardToast.offsetWidth
  rewardToast.classList.add('is-visible')
  rewardTimeoutId = window.setTimeout(() => {
    rewardToast.hidden = true
    rewardToast.classList.remove('is-visible')
  }, 1800)
}

function updateNearMiss(time) {
  if (playerCaught || playerEscaped || hiding.isHidden) {
    dangerVignette.style.opacity = '0'
    dangerWasClose = false
    return
  }

  const distance = Math.hypot(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z)
  const dangerStrength = THREE.MathUtils.clamp((5.5 - distance) / 4, 0, 0.72)
  dangerVignette.style.opacity = String(dangerStrength)
  if (distance < 2.25) dangerWasClose = true

  if (dangerWasClose && distance > 4.2 && time >= nearMissCooldownUntil) {
    dangerWasClose = false
    nearMissCooldownUntil = time + 9000
    showReward('Near miss · +250 nerve')
    audio.nearMiss()
  }
}

const keySystem = createKeySystem({
  audio,
  hudCount: document.querySelector('#keys-collected'),
  onEscape: escapeHouse,
  onPickup: (count, total) => showReward(`Key found · ${count} / ${total}`),
  parent: house.group,
  prompt: goalPrompt,
})

function triggerJumpscare() {
  window.clearTimeout(jumpscareTimeoutId)
  jumpscare.hidden = false
  const face = jumpscare.firstElementChild
  face.style.animation = 'none'
  void face.offsetWidth
  face.style.animation = ''
  audio.mirror()
  jumpscareTimeoutId = window.setTimeout(() => {
    jumpscare.hidden = true
  }, 650)
}

function teleportHunterNearby() {
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, camera.up).normalize()
  const sideOffset = (Math.random() - 0.5) * 5
  const distance = 5.5 + Math.random() * 2.5
  ghost.position.set(
    THREE.MathUtils.clamp(camera.position.x - forward.x * distance + right.x * sideOffset, -10.7, 10.7),
    ghostStartPosition.y,
    THREE.MathUtils.clamp(camera.position.z - forward.z * distance + right.z * sideOffset, -21.8, 8.5),
  )
  cameraShakeEndsAt = performance.now() + 180
}

const scareDirector = createScareDirector({
  actions: {
    flicker: flickerLights,
    jumpscare: triggerJumpscare,
    slam: slamDoor,
    teleport: teleportHunterNearby,
    whisper: () => whisper(['behind you', 'come upstairs', 'I found you'][Math.floor(Math.random() * 3)]),
  },
  getRoom: () => getRoomAt(camera.position),
  getTension: () => keySystem.count / keySystem.total,
  isActive: () =>
    !playerCaught &&
    !playerEscaped &&
    !hiding.isHidden &&
    document.pointerLockElement === renderer.domElement,
})

function restartGame() {
  playerCaught = false
  playerEscaped = false
  stamina = maxStamina
  updateStamina(0, false)
  yaw = 0
  pitch = 0
  camera.position.copy(PLAYER_START)
  camera.rotation.set(0, 0, 0)
  randomizeHunterSpawn()
  ghost.rotation.set(0, 0, 0)
  hunterVisual.position.set(0, 0, 0)
  hunterVisual.rotation.set(0, 0, 0)
  ghostRushEndsAt = 0
  motherDrips.reset()
  resetStunBlaster()
  activeDoorSlam = null
  cameraShakeEndsAt = 0
  cameraShakeOffset.set(0, 0, 0)
  window.clearTimeout(whisperTimeoutId)
  whisperMessage.hidden = true
  whisperMessage.classList.remove('is-visible')
  for (const door of house.doors) door.hinge.rotation.y = door.openRotation
  bathroomProps.reset()
  hiding.reset()
  keySystem.reset()
  runTimer.reset()
  scareDirector.reset()
  jumpscare.hidden = true
  dangerVignette.style.opacity = '0'
  dangerWasClose = false
  nearMissCooldownUntil = 0
  pressedKeys.clear()
  caughtScreen.hidden = true
  escapeScreen.hidden = true
  startScreen.hidden = false
}

renderer.setAnimationLoop((time) => {
  const delta = Math.min(clock.getDelta(), 0.1)
  updateLightFlicker(time)
  blackPuddles.update(time)
  updateDoorSlam(time)
  if (bathroomProps.update(camera.position, time, !playerCaught)) audio.mirror()
  hiding.update(
    !playerCaught && !playerEscaped && document.pointerLockElement === renderer.domElement,
  )
  keySystem.update(
    camera.position,
    time,
    !playerCaught && !playerEscaped && document.pointerLockElement === renderer.domElement,
  )
  scareDirector.update(time)
  runTimer.update(time)
  updateNearMiss(time)
  updateStunBolts(delta, time)
  updateHunterEffects(time)
  updateHunterStun(time)

  movement.set(0, 0, 0)
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, camera.up).normalize()
  if (pressedKeys.has('KeyW')) movement.add(forward)
  if (pressedKeys.has('KeyS')) movement.sub(forward)
  if (pressedKeys.has('KeyD')) movement.add(right)
  if (pressedKeys.has('KeyA')) movement.sub(right)
  const isSprinting =
    pressedKeys.has('ShiftLeft') &&
    movement.lengthSq() > 0 &&
    stamina > 0.02 &&
    !hiding.isHidden
  updateStamina(delta, isSprinting)
  if (movement.lengthSq() > 0 && !hiding.isHidden) {
    movement.normalize().multiplyScalar((isSprinting ? sprintSpeed : movementSpeed) * delta)
    movePlayerWithinHouse(camera.position, movement)
  }

  if (!playerCaught && !playerEscaped && document.pointerLockElement === renderer.domElement) {
    if (time >= hunterFrozenUntil) updateGhost(delta, time)
    if (time >= hunterFrozenUntil && ghostReachedPlayer()) catchPlayer()
  }
  motherDrips.update(time, delta, mother, !playerCaught && !playerEscaped)
  applyCameraShake(time)
  renderer.render(scene, camera)
  camera.position.sub(cameraShakeOffset)
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && !event.repeat && !playerCaught && !playerEscaped) {
    if (!keySystem.interact()) hiding.toggle()
  }
  if (event.code === 'Digit1' && !event.repeat && !playerCaught) whisper('behind you')
  if (event.code === 'Digit2' && !event.repeat) flickerLights()
  if (event.code === 'Digit3' && !event.repeat && !playerCaught) slamDoor()
  if (event.code === 'Digit4' && !event.repeat && !playerCaught) rushGhost()
  if (document.pointerLockElement === renderer.domElement) pressedKeys.add(event.code)
})
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code))
window.addEventListener('blur', () => pressedKeys.clear())
function startGame(streamerMode = false) {
  if (streamerMode) {
    connectStreamerMode()
  } else {
    disconnectStreamerMode()
  }
  audio.start()
  renderer.domElement.requestPointerLock()
}

playButton.addEventListener('click', () => startGame(false))
streamerButton.addEventListener('click', () => startGame(true))
howToButton.addEventListener('click', () => {
  const isOpening = howToPanel.hidden
  howToPanel.hidden = !isOpening
  howToButton.setAttribute('aria-expanded', String(isOpening))
})
restartButton.addEventListener('click', restartGame)
playAgainButton.addEventListener('click', restartGame)

document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === renderer.domElement
  startScreen.hidden = isLocked || playerCaught || playerEscaped
  if (isLocked) {
    scareDirector.reset()
    runTimer.start()
  } else {
    runTimer.pause()
  }
  if (!isLocked) pressedKeys.clear()
})

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return
  yaw -= event.movementX * lookSensitivity
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * lookSensitivity, -maxPitch, maxPitch)
  camera.rotation.set(pitch, yaw, 0)
})

document.addEventListener('mousedown', (event) => {
  if (event.button === 0) fireStunBlaster()
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const requestedTwitchChannel = new URLSearchParams(window.location.search).get('channel')?.trim()
const twitchChannel = (requestedTwitchChannel || 'YOURTWITCHNAME').replace(/^#/, '')
document.querySelector('#streamer-note').textContent =
  `Streamer mode connects anonymously to #${twitchChannel}. No OAuth.`

function addTwitchFeedItem(username, scareName) {
  const item = document.createElement('p')
  item.textContent = `@${username} triggered ${scareName}`
  twitchFeed.prepend(item)
  while (twitchFeed.childElementCount > 4) twitchFeed.lastElementChild.remove()
  window.setTimeout(() => item.classList.add('is-fading'), 4200)
  window.setTimeout(() => item.remove(), 5000)
}

const twitchScares = new Map([
  ['!whisper', { name: 'WHISPER', action: () => whisper('behind you') }],
  ['w', { name: 'WHISPER', action: () => whisper('behind you') }],
  ['!flicker', { name: 'FLICKER', action: flickerLights }],
  ['f', { name: 'FLICKER', action: flickerLights }],
  ['!slam', { name: 'SLAM', action: slamDoor }],
  ['s', { name: 'SLAM', action: slamDoor }],
  ['!hunt', { name: 'HUNT', action: rushGhost }],
  ['c', { name: 'HUNT', action: rushGhost }],
])
let twitchClient = null
let streamerConnectionRequested = false

async function connectStreamerMode() {
  streamerConnectionRequested = true
  twitchFeed.hidden = false
  if (twitchClient) return

  let tmi
  try {
    const tmiModule = await import('tmi.js')
    tmi = tmiModule.default
  } catch (error) {
    console.warn('Could not load Twitch chat support', error)
    return
  }
  if (!streamerConnectionRequested) return

  twitchClient = new tmi.Client({
    connection: { reconnect: true, secure: true },
    channels: [twitchChannel],
  })
  twitchClient.on('message', (_channel, tags, message, self) => {
    if (self) return
    const scare = twitchScares.get(message.trim().toLowerCase())
    if (!scare) return
    scare.action()
    addTwitchFeedItem(tags['display-name'] || tags.username || 'viewer', scare.name)
  })
  twitchClient.connect().catch((error) => {
    console.warn(`Could not connect to Twitch channel ${twitchChannel}`, error)
  })
}

function disconnectStreamerMode() {
  streamerConnectionRequested = false
  twitchFeed.hidden = true
  twitchFeed.replaceChildren()
  if (!twitchClient) return

  twitchClient.disconnect().catch(() => {})
  twitchClient = null
}

updateStunHud()
