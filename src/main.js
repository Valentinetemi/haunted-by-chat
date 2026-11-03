import * as THREE from 'three'
import tmi from 'tmi.js'

import {
  HUNTER_SPAWNS,
  PLAYER_START,
  addBox,
  createHauntedHouse,
} from './house.js'
import { furnishEntrance } from './props.js'
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
const house = createHauntedHouse(scene)
furnishEntrance(house.group)
const pressedKeys = new Set()
const movement = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const cameraShakeOffset = new THREE.Vector3()
const movementSpeed = 5
const lookSensitivity = 0.002
const maxPitch = Math.PI / 2 - 0.01
const startScreen = document.querySelector('#start-screen')
const whisperMessage = document.querySelector('#whisper-message')
const twitchFeed = document.querySelector('#twitch-feed')
const stunHud = document.querySelector('#stun-hud')
const shotsRemainingDisplay = document.querySelector('#shots-remaining')
const caughtScreen = document.querySelector('#caught-screen')
const restartButton = document.querySelector('#restart-button')
let yaw = 0
let pitch = 0
let playerCaught = false
let whisperTimeoutId = 0

const flickerDuration = 2000
let flickerEndsAt = 0
let nextFlickerPulseAt = 0

function flickerLights() {
  const now = performance.now()
  flickerEndsAt = now + flickerDuration
  nextFlickerPulseAt = now
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
const ghostStartPosition = HUNTER_SPAWNS[0].clone()
const ghostDriftSpeed = 0.58
const ghostCatchDistance = 1.05
const ghostRushDuration = 4000
const ghostRushMultiplier = 3
let ghostRushEndsAt = 0
const hunterVisual = new THREE.Group()
const hunterMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x11161a,
  metalness: 0.88,
  roughness: 0.32,
})
const hunterJointMaterial = new THREE.MeshStandardMaterial({
  color: 0x050709,
  metalness: 0.95,
  roughness: 0.22,
})
const hunterEyeMaterial = new THREE.MeshStandardMaterial({
  color: 0x330000,
  emissive: 0xff0000,
  emissiveIntensity: 4.5,
  metalness: 0.25,
  roughness: 0.18,
})
const hunterScanlineMaterial = new THREE.MeshBasicMaterial({
  color: 0xff1a12,
  transparent: true,
  opacity: 0.08,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
})
const hunterGlitchParts = []
let nextHunterGlitchAt = 0
let hunterGlitchEndsAt = 0
const maxStunShots = 3
const stunDuration = 3000
const stunBoltSpeed = 32
const stunBoltLifetime = 3
const stunBolts = []
const hunterHitBox = new THREE.Box3()
const hunterHitCenter = new THREE.Vector3()
const hunterHitSize = new THREE.Vector3(1.1, 3.4, 1)
const stunRay = new THREE.Ray()
const stunHitPoint = new THREE.Vector3()
const stunBoltGeometry = new THREE.SphereGeometry(0.07, 12, 8)
const stunBoltMaterial = new THREE.MeshBasicMaterial({ color: 0x39bfff, toneMapped: false })
let stunShotsRemaining = maxStunShots
let hunterFrozenUntil = 0

addBox(hunterVisual, [0.58, 0.28, 0.32], [0, 1.34, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.52, 1.15, 0.3], [0, 2.08, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.84, 0.16, 0.32], [0, 2.58, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.46, 0.38, 0.4], [0, 3.02, 0], hunterMetalMaterial)

for (const side of [-1, 1]) {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 1.2, 8),
    hunterJointMaterial,
  )
  leg.position.set(side * 0.19, 0.68, 0)
  hunterVisual.add(leg)
  hunterGlitchParts.push({ part: leg, baseRotation: 0 })
  addBox(hunterVisual, [0.22, 0.13, 0.42], [side * 0.19, 0.07, 0.09], hunterMetalMaterial)

  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 1.38, 8),
    hunterJointMaterial,
  )
  const armRotation = side * -0.06
  arm.position.set(side * 0.49, 1.88, 0)
  arm.rotation.z = armRotation
  hunterVisual.add(arm)
  hunterGlitchParts.push({ part: arm, baseRotation: armRotation })
  addBox(hunterVisual, [0.16, 0.2, 0.18], [side * 0.53, 1.15, 0], hunterMetalMaterial)
}

const hunterEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), hunterEyeMaterial)
hunterEye.position.set(0, 3.03, 0.21)
hunterVisual.add(hunterEye)
const hunterEyeLight = new THREE.PointLight(0xff0800, 7, 6, 2)
hunterEyeLight.position.set(0, 3.03, 0.45)
hunterVisual.add(hunterEyeLight)
const hunterStunLight = new THREE.PointLight(0x38bfff, 0, 6, 2)
hunterStunLight.position.set(0, 1.65, 0.35)
hunterVisual.add(hunterStunLight)

const hunterScanlines = new THREE.Group()
for (const [y, width] of [
  [0.42, 0.58], [0.78, 0.62], [1.14, 0.72], [1.5, 0.7],
  [1.86, 0.86], [2.22, 0.82], [2.58, 0.94], [2.94, 0.58],
]) {
  const scanline = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.018), hunterScanlineMaterial)
  scanline.position.set(0, y, 0.23)
  hunterScanlines.add(scanline)
}
hunterVisual.add(hunterScanlines)
ghost.add(hunterVisual)
ghost.position.copy(ghostStartPosition)
scene.add(ghost)

function updateHunterEffects(time) {
  if (time >= nextHunterGlitchAt) {
    hunterGlitchEndsAt = time + 35 + Math.random() * 65
    nextHunterGlitchAt = time + 180 + Math.random() * 520
  }
  const isGlitching = time < hunterGlitchEndsAt
  hunterVisual.position.set(
    isGlitching ? (Math.random() - 0.5) * 0.18 : 0,
    isGlitching ? (Math.random() - 0.5) * 0.07 : 0,
    isGlitching ? (Math.random() - 0.5) * 0.08 : 0,
  )
  hunterVisual.rotation.z = isGlitching ? (Math.random() - 0.5) * 0.06 : 0
  for (const { part, baseRotation } of hunterGlitchParts) {
    part.rotation.z = baseRotation + (isGlitching ? (Math.random() - 0.5) * 0.22 : 0)
  }
  hunterScanlineMaterial.opacity =
    0.06 + (Math.sin(time * 0.045) + 1) * 0.025 + (isGlitching ? Math.random() * 0.1 : 0)
  hunterScanlines.position.y = ((time * 0.00035) % 0.18) - 0.09
  hunterEyeMaterial.emissiveIntensity = 4.5 + (isGlitching ? Math.random() * 2.5 : 0)
  hunterEyeLight.intensity = 7 + (isGlitching ? Math.random() * 4 : Math.sin(time * 0.01))
}

function updateStunHud() {
  shotsRemainingDisplay.textContent = String(stunShotsRemaining)
  stunHud.classList.toggle('is-empty', stunShotsRemaining === 0)
}

function fireStunBlaster() {
  if (stunShotsRemaining === 0 || playerCaught || document.pointerLockElement !== renderer.domElement) return
  const direction = new THREE.Vector3()
  camera.getWorldDirection(direction)
  const bolt = new THREE.Mesh(stunBoltGeometry, stunBoltMaterial)
  bolt.position.copy(camera.position).addScaledVector(direction, 0.4)
  bolt.add(new THREE.PointLight(0x38bfff, 5, 3, 2))
  scene.add(bolt)
  stunBolts.push({ direction, lifetime: stunBoltLifetime, mesh: bolt })
  stunShotsRemaining -= 1
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
}

function updateStunBolts(delta, time) {
  hunterHitCenter.set(ghost.position.x, ghost.position.y + 1.6, ghost.position.z)
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
  hunterStunLight.intensity = isFrozen ? 9 + Math.sin(time * 0.035) * 2 : 0
  hunterScanlineMaterial.color.setHex(isFrozen ? 0x38bfff : 0xff1a12)
  if (isFrozen) {
    hunterScanlineMaterial.opacity = 0.18 + Math.sin(time * 0.05) * 0.05
    hunterEyeMaterial.emissiveIntensity = 0.8
    hunterEyeLight.intensity = 1
  }
}

function resetStunBlaster() {
  for (let index = stunBolts.length - 1; index >= 0; index -= 1) removeStunBolt(index)
  stunShotsRemaining = maxStunShots
  hunterFrozenUntil = 0
  hunterStunLight.intensity = 0
  hunterScanlineMaterial.color.setHex(0xff1a12)
  updateStunHud()
}

function rushGhost() {
  ghostRushEndsAt = performance.now() + ghostRushDuration
}

function updateGhost(delta, time) {
  ghostDirection.set(camera.position.x - ghost.position.x, 0, camera.position.z - ghost.position.z)
  if (ghostDirection.lengthSq() > 0.0001) {
    const speedMultiplier = time < ghostRushEndsAt ? ghostRushMultiplier : 1
    ghost.position.addScaledVector(ghostDirection.normalize(), ghostDriftSpeed * speedMultiplier * delta)
    ghost.lookAt(camera.position.x, ghost.position.y, camera.position.z)
  }
  ghost.position.y = ghostStartPosition.y + Math.sin(time * 0.0012) * 0.08
}

function ghostReachedPlayer() {
  const xDistance = camera.position.x - ghost.position.x
  const zDistance = camera.position.z - ghost.position.z
  return xDistance ** 2 + zDistance ** 2 <= ghostCatchDistance ** 2
}

function catchPlayer() {
  playerCaught = true
  pressedKeys.clear()
  startScreen.hidden = true
  caughtScreen.hidden = false
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
}

function restartGame() {
  playerCaught = false
  yaw = 0
  pitch = 0
  camera.position.copy(PLAYER_START)
  camera.rotation.set(0, 0, 0)
  ghost.position.copy(ghostStartPosition)
  ghost.rotation.set(0, 0, 0)
  hunterVisual.position.set(0, 0, 0)
  hunterVisual.rotation.set(0, 0, 0)
  nextHunterGlitchAt = 0
  hunterGlitchEndsAt = 0
  ghostRushEndsAt = 0
  resetStunBlaster()
  activeDoorSlam = null
  cameraShakeEndsAt = 0
  cameraShakeOffset.set(0, 0, 0)
  window.clearTimeout(whisperTimeoutId)
  whisperMessage.hidden = true
  whisperMessage.classList.remove('is-visible')
  for (const door of house.doors) door.hinge.rotation.y = door.openRotation
  pressedKeys.clear()
  caughtScreen.hidden = true
  startScreen.hidden = false
}

renderer.setAnimationLoop((time) => {
  const delta = Math.min(clock.getDelta(), 0.1)
  updateLightFlicker(time)
  updateDoorSlam(time)
  updateStunBolts(delta, time)
  if (time >= hunterFrozenUntil) updateHunterEffects(time)
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
  if (movement.lengthSq() > 0) camera.position.addScaledVector(movement.normalize(), movementSpeed * delta)

  if (!playerCaught && document.pointerLockElement === renderer.domElement) {
    if (time >= hunterFrozenUntil) updateGhost(delta, time)
    if (time >= hunterFrozenUntil && ghostReachedPlayer()) catchPlayer()
  }
  applyCameraShake(time)
  renderer.render(scene, camera)
  camera.position.sub(cameraShakeOffset)
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Digit1' && !event.repeat && !playerCaught) whisper('behind you')
  if (event.code === 'Digit2' && !event.repeat) flickerLights()
  if (event.code === 'Digit3' && !event.repeat && !playerCaught) slamDoor()
  if (event.code === 'Digit4' && !event.repeat && !playerCaught) rushGhost()
  if (document.pointerLockElement === renderer.domElement) pressedKeys.add(event.code)
})
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code))
window.addEventListener('blur', () => pressedKeys.clear())
startScreen.addEventListener('click', () => renderer.domElement.requestPointerLock())
restartButton.addEventListener('click', restartGame)

document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === renderer.domElement
  startScreen.hidden = isLocked || playerCaught
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
const twitchClient = new tmi.Client({
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

updateStunHud()
