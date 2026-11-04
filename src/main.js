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
import { createMobileControls } from './mobile-controls.js'
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
scene.add(camera)

const flashlight = new THREE.SpotLight(0xe5f1ff, 92, 22, 0.38, 0.58, 1.7)
flashlight.position.set(0, -0.08, 0.05)
flashlight.castShadow = true
flashlight.shadow.mapSize.set(512, 512)
flashlight.shadow.camera.near = 0.25
flashlight.shadow.camera.far = 22
flashlight.shadow.bias = -0.00035
flashlight.target.position.set(0, -0.08, -1)
camera.add(flashlight, flashlight.target)

const flashlightSpill = new THREE.PointLight(0xc9ddf2, 4.5, 4, 2)
flashlightSpill.position.set(0, -0.25, -0.35)
camera.add(flashlightSpill)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
document.querySelector('#app').appendChild(renderer.domElement)

const usesTouchControls =
  navigator.maxTouchPoints > 0 &&
  (window.matchMedia('(pointer: coarse), (hover: none)').matches ||
    Math.min(window.screen.width, window.screen.height) <= 1024)
document.body.classList.toggle('uses-touch-controls', usesTouchControls)

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
const brightnessSlider = document.querySelector('#brightness-slider')
const brightnessValue = document.querySelector('#brightness-value')
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
let catchTimeoutId = 0
let rewardTimeoutId = 0
let dangerWasClose = false
let nearMissCooldownUntil = 0
let yaw = 0
let pitch = 0
let playerCaught = false
let playerEscaped = false
let gameRunning = false
let mobileOrientationPaused = false
let stamina = maxStamina
let whisperTimeoutId = 0

function isGameplayActive() {
  return gameRunning && !playerCaught && !playerEscaped
}

const brightnessStorageKey = 'haunted-by-chat-brightness'

function loadBrightness() {
  try {
    const savedBrightness = Number.parseFloat(localStorage.getItem(brightnessStorageKey))
    if (Number.isFinite(savedBrightness)) {
      return THREE.MathUtils.clamp(savedBrightness, 0.75, 1.65)
    }
  } catch {
    // Storage can be unavailable in private browsing; the default still works.
  }
  return 1.15
}

function setBrightness(value, save = true) {
  const brightness = THREE.MathUtils.clamp(Number.parseFloat(value), 0.75, 1.65)
  renderer.toneMappingExposure = brightness
  brightnessSlider.value = String(brightness)
  brightnessValue.textContent = `${brightness.toFixed(2)}×`
  if (!save) return
  try {
    localStorage.setItem(brightnessStorageKey, String(brightness))
  } catch {
    // Keep the current-session setting even when persistence is unavailable.
  }
}

setBrightness(loadBrightness(), false)
brightnessSlider.addEventListener('input', () => setBrightness(brightnessSlider.value))

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
    !isGameplayActive()
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
  gameRunning = false
  mobileOrientationPaused = false
  document.body.classList.remove('is-playing')
  mobileControls.setActive(false)
  pressedKeys.clear()
  startScreen.hidden = true
  audio.caught()
  runTimer.pause()
  window.clearTimeout(jumpscareTimeoutId)
  window.clearTimeout(catchTimeoutId)
  jumpscare.classList.add('is-catch')
  jumpscare.hidden = false
  const face = jumpscare.firstElementChild
  face.style.animation = 'none'
  void face.offsetWidth
  face.style.animation = ''
  cameraShakeEndsAt = performance.now() + 620
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
  catchTimeoutId = window.setTimeout(() => {
    jumpscare.hidden = true
    jumpscare.classList.remove('is-catch')
    caughtScreen.hidden = false
  }, 640)
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
  gameRunning = false
  mobileOrientationPaused = false
  document.body.classList.remove('is-playing')
  mobileControls.setActive(false)
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
  if (!isGameplayActive() || hiding.isHidden) {
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

function applyLookDelta(deltaX, deltaY, sensitivity = lookSensitivity) {
  yaw -= deltaX * sensitivity
  pitch = THREE.MathUtils.clamp(pitch - deltaY * sensitivity, -maxPitch, maxPitch)
  camera.rotation.set(pitch, yaw, 0)
}

function performInteraction() {
  if (!isGameplayActive()) return
  if (!keySystem.interact()) hiding.toggle()
}

const mobileControls = createMobileControls({
  interactButton: document.querySelector('#mobile-use'),
  joystick: document.querySelector('#move-stick'),
  joystickKnob: document.querySelector('#move-stick-knob'),
  joystickZone: document.querySelector('#move-zone'),
  lookZone: document.querySelector('#touch-look-zone'),
  onInteract: performInteraction,
  onLook: (deltaX, deltaY) => applyLookDelta(deltaX, deltaY, 0.0042),
  onStun: fireStunBlaster,
  root: document.querySelector('#mobile-controls'),
  runButton: document.querySelector('#mobile-run'),
  stunButton: document.querySelector('#mobile-stun'),
})

function triggerJumpscare() {
  window.clearTimeout(jumpscareTimeoutId)
  jumpscare.classList.remove('is-catch')
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
  isActive: () => isGameplayActive() && !hiding.isHidden,
})

function restartGame() {
  playerCaught = false
  playerEscaped = false
  gameRunning = false
  mobileOrientationPaused = false
  document.body.classList.remove('is-playing')
  mobileControls.setActive(false)
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
  window.clearTimeout(catchTimeoutId)
  whisperMessage.hidden = true
  whisperMessage.classList.remove('is-visible')
  for (const door of house.doors) door.hinge.rotation.y = door.openRotation
  bathroomProps.reset()
  hiding.reset()
  keySystem.reset()
  runTimer.reset()
  scareDirector.reset()
  jumpscare.hidden = true
  jumpscare.classList.remove('is-catch')
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
  mobileControls.update(delta)
  updateLightFlicker(time)
  blackPuddles.update(time)
  updateDoorSlam(time)
  if (bathroomProps.update(camera.position, time, isGameplayActive())) audio.mirror()
  hiding.update(
    isGameplayActive(),
  )
  keySystem.update(
    camera.position,
    time,
    isGameplayActive(),
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
  if (Math.abs(mobileControls.movementY) > 0.04) {
    movement.addScaledVector(forward, mobileControls.movementY)
  }
  if (Math.abs(mobileControls.movementX) > 0.04) {
    movement.addScaledVector(right, mobileControls.movementX)
  }
  const isSprinting =
    (pressedKeys.has('ShiftLeft') || mobileControls.sprinting) &&
    movement.lengthSq() > 0 &&
    stamina > 0.02 &&
    !hiding.isHidden
  updateStamina(delta, isSprinting)
  if (movement.lengthSq() > 0 && !hiding.isHidden) {
    movement.normalize().multiplyScalar((isSprinting ? sprintSpeed : movementSpeed) * delta)
    movePlayerWithinHouse(camera.position, movement)
  }

  if (isGameplayActive()) {
    if (time >= hunterFrozenUntil) updateGhost(delta, time)
    if (time >= hunterFrozenUntil && ghostReachedPlayer()) catchPlayer()
  }
  motherDrips.update(time, delta, mother, isGameplayActive())
  audio.updateMother(
    time,
    Math.hypot(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z),
    time >= hunterFrozenUntil,
    isGameplayActive(),
  )
  applyCameraShake(time)
  renderer.render(scene, camera)
  camera.position.sub(cameraShakeOffset)
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && !event.repeat && !playerCaught && !playerEscaped) {
    performInteraction()
  }
  if (event.code === 'Digit1' && !event.repeat && !playerCaught) whisper('behind you')
  if (event.code === 'Digit2' && !event.repeat) flickerLights()
  if (event.code === 'Digit3' && !event.repeat && !playerCaught) slamDoor()
  if (event.code === 'Digit4' && !event.repeat && !playerCaught) rushGhost()
  if (isGameplayActive()) pressedKeys.add(event.code)
})
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code))
window.addEventListener('blur', () => {
  pressedKeys.clear()
  mobileControls.reset()
})
function startGame(streamerMode = false) {
  if (streamerMode) {
    connectStreamerMode()
  } else {
    disconnectStreamerMode()
  }
  audio.start()
  document.body.classList.add('is-playing')
  gameRunning = true
  startScreen.hidden = true
  mobileControls.setActive(usesTouchControls)
  scareDirector.reset()
  runTimer.start()
  if (usesTouchControls) {
    syncMobileOrientation()
    void requestMobileLandscape()
  } else {
    renderer.domElement.requestPointerLock()
  }
}

async function requestMobileLandscape() {
  if (!usesTouchControls) return
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    // iOS and embedded browsers may not permit programmatic fullscreen.
  }
  try {
    if (screen.orientation?.lock) await screen.orientation.lock('landscape')
  } catch {
    // The portrait blocker still guides rotation when orientation locking is unavailable.
  }
}

function syncMobileOrientation() {
  if (!usesTouchControls) return
  const viewport = window.visualViewport
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const isPortrait = viewportHeight > viewportWidth
  const isPlaying = document.body.classList.contains('is-playing')
  document.body.classList.toggle('is-mobile-portrait', isPlaying && isPortrait)
  if (!isPlaying) return

  if (isPortrait && gameRunning) {
    gameRunning = false
    mobileOrientationPaused = true
    mobileControls.setActive(false)
    runTimer.pause()
    return
  }

  if (!isPortrait && mobileOrientationPaused && !playerCaught && !playerEscaped) {
    mobileOrientationPaused = false
    gameRunning = true
    mobileControls.setActive(true)
    scareDirector.reset()
    runTimer.start()
  }
}

let orientationSyncTimeoutIds = []

function queueMobileOrientationSync() {
  if (!usesTouchControls) return
  syncMobileOrientation()
  for (const timeoutId of orientationSyncTimeoutIds) window.clearTimeout(timeoutId)
  orientationSyncTimeoutIds = [120, 360, 800].map((delay) =>
    window.setTimeout(syncMobileOrientation, delay),
  )
  window.requestAnimationFrame(syncMobileOrientation)
}

window.addEventListener('orientationchange', queueMobileOrientationSync)
screen.orientation?.addEventListener?.('change', queueMobileOrientationSync)
window.visualViewport?.addEventListener('resize', queueMobileOrientationSync)
window.matchMedia('(orientation: portrait)').addEventListener?.('change', queueMobileOrientationSync)

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
  if (usesTouchControls) return
  const isLocked = document.pointerLockElement === renderer.domElement
  if (isLocked) {
    gameRunning = true
    startScreen.hidden = true
    scareDirector.reset()
    runTimer.start()
  } else if (!playerCaught && !playerEscaped) {
    gameRunning = false
    startScreen.hidden = false
    runTimer.pause()
  }
  if (!isLocked) pressedKeys.clear()
})

document.addEventListener('pointerlockerror', () => {
  if (usesTouchControls || playerCaught || playerEscaped) return
  gameRunning = false
  startScreen.hidden = false
  runTimer.pause()
})

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return
  applyLookDelta(event.movementX, event.movementY)
})

document.addEventListener('mousedown', (event) => {
  if (event.button === 0 && !usesTouchControls) fireStunBlaster()
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  queueMobileOrientationSync()
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
