import * as THREE from 'three'
import tmi from 'tmi.js'

import './style.css'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const clock = new THREE.Clock()
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
const caughtScreen = document.querySelector('#caught-screen')
const restartButton = document.querySelector('#restart-button')
const corridorWidth = 9
const corridorHeight = 4.4
const corridorLength = 80
const corridorStartZ = 8
const corridorEndZ = corridorStartZ - corridorLength
const corridorCenterZ = (corridorStartZ + corridorEndZ) / 2
const floorY = -1.7
const ceilingY = floorY + corridorHeight
let yaw = 0
let pitch = 0
let playerCaught = false
let whisperTimeoutId = 0

camera.position.z = 5
camera.rotation.order = 'YXZ'

scene.background = new THREE.Color(0xcbd3d4)
scene.fog = new THREE.FogExp2(0xcbd3d4, 0.0045)

const corridor = new THREE.Group()

function createTileTexture(baseColor, groutColor, repeatX, repeatY) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const context = canvas.getContext('2d')
  context.fillStyle = baseColor
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = groutColor
  context.fillRect(0, 0, canvas.width, 5)
  context.fillRect(0, 0, 5, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)

  return texture
}

const floorTileTexture = createTileTexture('#e3e5e1', '#aeb5b2', 7, 56)
const wallTileTexture = createTileTexture('#f0f1ed', '#bbc1bf', 48, 4)
const endWallTileTexture = createTileTexture('#f0f1ed', '#bbc1bf', 7, 4)
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f5f0,
  map: floorTileTexture,
  roughness: 0.76,
})
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: wallTileTexture,
  roughness: 0.82,
})
const endWallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: endWallTileTexture,
  roughness: 0.82,
})
const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8edec,
  roughness: 0.88,
})
const fixtureEmissiveIntensity = 2.5
const fixtureMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9edf2,
  emissive: 0xebfbff,
  emissiveIntensity: fixtureEmissiveIntensity,
  roughness: 0.35,
})

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)

  mesh.position.set(...position)
  parent.add(mesh)

  return mesh
}

addBox(
  corridor,
  [corridorWidth, 0.2, corridorLength],
  [0, floorY - 0.1, corridorCenterZ],
  floorMaterial,
)
addBox(
  corridor,
  [corridorWidth, 0.2, corridorLength],
  [0, ceilingY + 0.1, corridorCenterZ],
  ceilingMaterial,
)
addBox(
  corridor,
  [0.2, corridorHeight, corridorLength],
  [-(corridorWidth / 2 + 0.1), (floorY + ceilingY) / 2, corridorCenterZ],
  wallMaterial,
)
addBox(
  corridor,
  [0.2, corridorHeight, corridorLength],
  [corridorWidth / 2 + 0.1, (floorY + ceilingY) / 2, corridorCenterZ],
  wallMaterial,
)
addBox(
  corridor,
  [corridorWidth, corridorHeight, 0.2],
  [0, (floorY + ceilingY) / 2, corridorEndZ - 0.1],
  endWallMaterial,
)
addBox(
  corridor,
  [corridorWidth, corridorHeight, 0.2],
  [0, (floorY + ceilingY) / 2, corridorStartZ + 0.1],
  endWallMaterial,
)

const ambientLight = new THREE.AmbientLight(0xddeaf0, 0.55)
scene.add(ambientLight)

const ceilingLightIntensity = 34
const ceilingLights = []

for (const z of [2, -10, -22, -34, -46, -58, -68]) {
  const fixture = addBox(
    corridor,
    [1.8, 0.06, 0.5],
    [0, ceilingY - 0.04, z],
    fixtureMaterial.clone(),
  )

  const light = new THREE.PointLight(0xe5f8ff, ceilingLightIntensity, 20, 2)
  light.position.set(0, ceilingY - 0.3, z)
  corridor.add(light)
  ceilingLights.push({ fixture, light })
}

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
    for (const { fixture, light } of ceilingLights) {
      light.intensity = ceilingLightIntensity
      fixture.material.emissiveIntensity = fixtureEmissiveIntensity
    }

    flickerEndsAt = 0
    return
  }

  if (now < nextFlickerPulseAt) return

  for (const { fixture, light } of ceilingLights) {
    const brightness =
      Math.random() < 0.45 ? Math.random() * 0.12 : 0.35 + Math.random() * 0.65

    light.intensity = ceilingLightIntensity * brightness
    fixture.material.emissiveIntensity = fixtureEmissiveIntensity * brightness
  }

  nextFlickerPulseAt = now + 45 + Math.random() * 110
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

const classroomDoors = new THREE.Group()
const classroomDoorPanels = []
const doorSlamDuration = 240
const doorSlamRange = 18
const cameraShakeDuration = 260
const cameraShakeStrength = 0.06
let activeDoorSlam = null
let cameraShakeEndsAt = 0
const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x29312d,
  roughness: 0.86,
})
const doorFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0x101413,
  roughness: 0.75,
})
const doorWindowMaterial = new THREE.MeshStandardMaterial({
  color: 0x05090a,
  roughness: 0.3,
  metalness: 0.15,
})
const handleMaterial = new THREE.MeshStandardMaterial({
  color: 0x756b48,
  roughness: 0.35,
  metalness: 0.75,
})

function addClassroomDoor(side, z) {
  const door = new THREE.Group()
  const doorWidth = 1.45
  const doorHeight = 3
  const doorX = side * (corridorWidth / 2 - 0.05)
  const doorCenterY = floorY + doorHeight / 2

  addBox(
    door,
    [0.2, doorHeight + 0.18, 0.12],
    [doorX, doorCenterY + 0.09, z - doorWidth / 2 - 0.06],
    doorFrameMaterial,
  )
  addBox(
    door,
    [0.2, doorHeight + 0.18, 0.12],
    [doorX, doorCenterY + 0.09, z + doorWidth / 2 + 0.06],
    doorFrameMaterial,
  )
  addBox(
    door,
    [0.2, 0.12, doorWidth + 0.24],
    [doorX, floorY + doorHeight + 0.06, z],
    doorFrameMaterial,
  )

  const hinge = new THREE.Group()
  const openRotation = side * -0.58
  hinge.position.set(doorX, 0, z - doorWidth / 2)
  hinge.rotation.y = openRotation

  addBox(
    hinge,
    [0.14, doorHeight, doorWidth],
    [0, doorCenterY, doorWidth / 2],
    doorMaterial,
  )
  addBox(
    hinge,
    [0.05, 0.62, 0.5],
    [-side * 0.1, floorY + 2.15, doorWidth / 2],
    doorWindowMaterial,
  )

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), handleMaterial)
  handle.position.set(-side * 0.13, floorY + 1.05, doorWidth / 2 + 0.46)
  hinge.add(handle)

  door.add(hinge)
  classroomDoors.add(door)
  classroomDoorPanels.push({ hinge, openRotation, z })
}

for (const z of [-5, -21, -37, -53]) {
  addClassroomDoor(-1, z)
}

for (const z of [-11, -27, -43, -59]) {
  addClassroomDoor(1, z)
}

function slamDoor() {
  if (classroomDoorPanels.length === 0) {
    cameraShakeEndsAt = performance.now() + cameraShakeDuration
    return false
  }

  if (activeDoorSlam) {
    activeDoorSlam.door.hinge.rotation.y = 0
  }

  const nearbyDoors = classroomDoorPanels.filter(
    (door) => Math.abs(door.z - camera.position.z) <= doorSlamRange,
  )
  const fallbackDoors = [...classroomDoorPanels]
    .sort(
      (doorA, doorB) =>
        Math.abs(doorA.z - camera.position.z) - Math.abs(doorB.z - camera.position.z),
    )
    .slice(0, 2)
  const candidates = nearbyDoors.length > 0 ? nearbyDoors : fallbackDoors
  const openCandidates = candidates.filter((door) => Math.abs(door.hinge.rotation.y) > 0.05)
  const doorPool = openCandidates.length > 0 ? openCandidates : candidates
  const door = doorPool[Math.floor(Math.random() * doorPool.length)]

  if (Math.abs(door.hinge.rotation.y) <= 0.05) {
    door.hinge.rotation.y = door.openRotation
  }

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

corridor.add(classroomDoors)

const exitDoor = new THREE.Group()
const exitDoorZ = corridorEndZ + 0.09
const exitDoorHeight = 3.2
const exitDoorWidth = 2.3
const exitDoorCenterY = floorY + exitDoorHeight / 2
const exitDoorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b2723,
  roughness: 0.8,
})
const panicBarMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b8f86,
  roughness: 0.35,
  metalness: 0.8,
})

addBox(
  exitDoor,
  [exitDoorWidth, exitDoorHeight, 0.14],
  [0, exitDoorCenterY, exitDoorZ],
  exitDoorMaterial,
)
addBox(
  exitDoor,
  [0.14, exitDoorHeight + 0.18, 0.22],
  [-(exitDoorWidth / 2 + 0.07), exitDoorCenterY + 0.09, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [0.14, exitDoorHeight + 0.18, 0.22],
  [exitDoorWidth / 2 + 0.07, exitDoorCenterY + 0.09, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [exitDoorWidth + 0.28, 0.14, 0.22],
  [0, floorY + exitDoorHeight + 0.07, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [1.35, 0.09, 0.1],
  [0, floorY + 1.15, exitDoorZ + 0.13],
  panicBarMaterial,
)

const exitSignCanvas = document.createElement('canvas')
exitSignCanvas.width = 512
exitSignCanvas.height = 192

const exitSignContext = exitSignCanvas.getContext('2d')
exitSignContext.fillStyle = '#082d20'
exitSignContext.fillRect(0, 0, exitSignCanvas.width, exitSignCanvas.height)
exitSignContext.strokeStyle = '#8dffc0'
exitSignContext.lineWidth = 14
exitSignContext.strokeRect(8, 8, exitSignCanvas.width - 16, exitSignCanvas.height - 16)
exitSignContext.fillStyle = '#d8ffe8'
exitSignContext.font = 'bold 118px sans-serif'
exitSignContext.textAlign = 'center'
exitSignContext.textBaseline = 'middle'
exitSignContext.fillText('EXIT', exitSignCanvas.width / 2, exitSignCanvas.height / 2 + 6)

const exitSignTexture = new THREE.CanvasTexture(exitSignCanvas)
exitSignTexture.colorSpace = THREE.SRGBColorSpace

const exitSign = new THREE.Mesh(
  new THREE.PlaneGeometry(1.9, 0.7),
  new THREE.MeshBasicMaterial({ map: exitSignTexture, toneMapped: false }),
)
exitSign.position.set(0, floorY + exitDoorHeight + 0.62, exitDoorZ + 0.13)
exitDoor.add(exitSign)

const exitLight = new THREE.PointLight(0x67ff9b, 6, 7, 2)
exitLight.position.set(0, floorY + exitDoorHeight + 0.45, exitDoorZ + 0.7)
exitDoor.add(exitLight)

corridor.add(exitDoor)

function createDecalTexture(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')
  draw(context, canvas)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  return texture
}

const handprintTexture = createDecalTexture((context) => {
  context.fillStyle = 'rgb(104 6 11 / 82%)'
  context.strokeStyle = 'rgb(104 6 11 / 78%)'
  context.lineCap = 'round'
  context.lineWidth = 17

  context.beginPath()
  context.ellipse(127, 137, 38, 48, -0.18, 0, Math.PI * 2)
  context.fill()

  for (const [startX, startY, endX, endY] of [
    [102, 110, 79, 49],
    [118, 99, 111, 30],
    [134, 98, 141, 27],
    [149, 105, 168, 42],
    [158, 124, 194, 82],
  ]) {
    context.beginPath()
    context.moveTo(startX, startY)
    context.lineTo(endX, endY)
    context.stroke()
  }

  context.strokeStyle = 'rgb(104 6 11 / 28%)'
  context.lineWidth = 11
  for (const x of [104, 128, 151]) {
    context.beginPath()
    context.moveTo(x, 160)
    context.bezierCurveTo(x - 10, 188, x + 8, 213, x - 5, 248)
    context.stroke()
  }
})

const doorDripTexture = createDecalTexture((context, canvas) => {
  context.fillStyle = 'rgb(91 4 9 / 82%)'
  context.fillRect(22, 30, canvas.width - 44, 30)
  context.strokeStyle = 'rgb(91 4 9 / 78%)'
  context.lineCap = 'round'

  for (const [x, width, length] of [
    [48, 12, 124],
    [83, 7, 78],
    [121, 15, 172],
    [164, 9, 106],
    [203, 13, 148],
  ]) {
    context.lineWidth = width
    context.beginPath()
    context.moveTo(x, 46)
    context.bezierCurveTo(x - 8, length * 0.55, x + 9, length * 0.78, x, length)
    context.stroke()
  }
})

const floorSmearTexture = createDecalTexture((context) => {
  context.fillStyle = 'rgb(94 3 8 / 68%)'
  context.beginPath()
  context.moveTo(40, 122)
  context.bezierCurveTo(53, 64, 108, 50, 149, 78)
  context.bezierCurveTo(197, 111, 217, 151, 187, 184)
  context.bezierCurveTo(152, 219, 92, 199, 58, 170)
  context.closePath()
  context.fill()

  context.fillStyle = 'rgb(94 3 8 / 32%)'
  for (const [x, y, radius] of [
    [29, 184, 13],
    [73, 218, 9],
    [205, 66, 11],
    [229, 135, 7],
  ]) {
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
})

const handprintMaterial = new THREE.MeshBasicMaterial({
  map: handprintTexture,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const doorDripMaterial = new THREE.MeshBasicMaterial({
  map: doorDripTexture,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const floorSmearMaterial = new THREE.MeshBasicMaterial({
  map: floorSmearTexture,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const bloodDecals = new THREE.Group()

function addWallDecal(side, z, y, width, height, material, rotation = 0) {
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  decal.position.set(side * (corridorWidth / 2 - 0.012), y, z)
  decal.rotation.y = side * -Math.PI / 2
  decal.rotateZ(rotation)
  decal.renderOrder = 2
  bloodDecals.add(decal)
}

function addFloorDecal(x, z, width, length, rotation = 0) {
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, length), floorSmearMaterial)
  decal.position.set(x, floorY + 0.012, z)
  decal.rotation.set(-Math.PI / 2, 0, rotation)
  decal.renderOrder = 2
  bloodDecals.add(decal)
}

for (const handprint of [
  { side: -1, z: -10, y: 0.35, rotation: -0.14 },
  { side: 1, z: -29, y: 0.15, rotation: 0.09 },
  { side: -1, z: -50, y: 0.55, rotation: 0.18 },
]) {
  addWallDecal(
    handprint.side,
    handprint.z,
    handprint.y,
    0.82,
    1.05,
    handprintMaterial,
    handprint.rotation,
  )
}

for (const drip of [
  { side: -1, z: -21 },
  { side: 1, z: -43 },
  { side: 1, z: -59 },
]) {
  addWallDecal(drip.side, drip.z, floorY + 0.26, 1.05, 0.54, doorDripMaterial)
}

for (const smear of [
  { x: -0.2, z: -24, width: 0.72, length: 1.1, rotation: -0.12 },
  { x: 0.15, z: -27, width: 0.84, length: 1.25, rotation: 0.18 },
  { x: 0.65, z: -30, width: 0.68, length: 1.05, rotation: -0.2 },
  { x: 1.25, z: -33, width: 0.9, length: 1.35, rotation: 0.14 },
  { x: 1.95, z: -36, width: 0.7, length: 1.12, rotation: -0.16 },
  { x: 2.65, z: -38.8, width: 0.86, length: 1.3, rotation: 0.2 },
  { x: 3.25, z: -41, width: 0.75, length: 1.15, rotation: -0.08 },
  { x: 3.75, z: -42.5, width: 1.05, length: 1.35, rotation: 0.12 },
]) {
  addFloorDecal(smear.x, smear.z, smear.width, smear.length, smear.rotation)
}

const bathroomSignCanvas = document.createElement('canvas')
bathroomSignCanvas.width = 512
bathroomSignCanvas.height = 192
const bathroomSignContext = bathroomSignCanvas.getContext('2d')
bathroomSignContext.fillStyle = '#dce4e5'
bathroomSignContext.fillRect(0, 0, bathroomSignCanvas.width, bathroomSignCanvas.height)
bathroomSignContext.strokeStyle = '#435158'
bathroomSignContext.lineWidth = 12
bathroomSignContext.strokeRect(8, 8, bathroomSignCanvas.width - 16, bathroomSignCanvas.height - 16)
bathroomSignContext.fillStyle = '#202a2e'
bathroomSignContext.font = 'bold 70px sans-serif'
bathroomSignContext.textAlign = 'center'
bathroomSignContext.textBaseline = 'middle'
bathroomSignContext.fillText('BATHROOM', bathroomSignCanvas.width / 2, bathroomSignCanvas.height / 2 + 3)

const bathroomSignTexture = new THREE.CanvasTexture(bathroomSignCanvas)
bathroomSignTexture.colorSpace = THREE.SRGBColorSpace
const bathroomSignMaterial = new THREE.MeshBasicMaterial({ map: bathroomSignTexture })
addWallDecal(1, -43, 1.7, 0.92, 0.34, bathroomSignMaterial)

corridor.add(bloodDecals)
scene.add(corridor)

const ghostStartPosition = new THREE.Vector3(0, floorY + 0.08, corridorEndZ + 4)
const ghost = new THREE.Group()
const ghostDirection = new THREE.Vector3()
const ghostDriftSpeed = 0.55
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

addBox(hunterVisual, [0.58, 0.28, 0.32], [0, 1.34, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.52, 1.15, 0.3], [0, 2.08, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.84, 0.16, 0.32], [0, 2.58, 0], hunterMetalMaterial)
addBox(hunterVisual, [0.46, 0.38, 0.4], [0, 3.02, 0], hunterMetalMaterial)

const hunterSpine = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 0.35, 10),
  hunterJointMaterial,
)
hunterSpine.position.y = 1.58
hunterVisual.add(hunterSpine)

const hunterNeck = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 0.26, 10),
  hunterJointMaterial,
)
hunterNeck.position.y = 2.79
hunterVisual.add(hunterNeck)

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

const hunterScanlines = new THREE.Group()
for (const [y, width] of [
  [0.42, 0.58],
  [0.78, 0.62],
  [1.14, 0.72],
  [1.5, 0.7],
  [1.86, 0.86],
  [2.22, 0.82],
  [2.58, 0.94],
  [2.94, 0.58],
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

  if (isGlitching) {
    hunterVisual.position.set(
      (Math.random() - 0.5) * 0.18,
      (Math.random() - 0.5) * 0.07,
      (Math.random() - 0.5) * 0.08,
    )
    hunterVisual.rotation.z = (Math.random() - 0.5) * 0.06

    for (const { part, baseRotation } of hunterGlitchParts) {
      part.rotation.z = baseRotation + (Math.random() - 0.5) * 0.22
    }
  } else {
    hunterVisual.position.set(0, 0, 0)
    hunterVisual.rotation.z = 0

    for (const { part, baseRotation } of hunterGlitchParts) {
      part.rotation.z = baseRotation
    }
  }

  const scanlinePulse = 0.06 + (Math.sin(time * 0.045) + 1) * 0.025
  hunterScanlineMaterial.opacity = scanlinePulse + (isGlitching ? Math.random() * 0.1 : 0)
  hunterScanlines.position.y = ((time * 0.00035) % 0.18) - 0.09
  hunterEyeMaterial.emissiveIntensity = 4.5 + (isGlitching ? Math.random() * 2.5 : 0)
  hunterEyeLight.intensity = 7 + (isGlitching ? Math.random() * 4 : Math.sin(time * 0.01))
}

function rushGhost() {
  ghostRushEndsAt = performance.now() + ghostRushDuration
}

function updateGhost(delta, time) {
  ghostDirection.set(
    camera.position.x - ghost.position.x,
    0,
    camera.position.z - ghost.position.z,
  )

  if (ghostDirection.lengthSq() > 0.0001) {
    const speedMultiplier = time < ghostRushEndsAt ? ghostRushMultiplier : 1

    ghost.position.addScaledVector(
      ghostDirection.normalize(),
      ghostDriftSpeed * speedMultiplier * delta,
    )
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

  if (document.pointerLockElement === renderer.domElement) {
    document.exitPointerLock()
  }
}

function restartGame() {
  playerCaught = false
  yaw = 0
  pitch = 0
  camera.position.set(0, 0, 5)
  camera.rotation.set(0, 0, 0)
  ghost.position.copy(ghostStartPosition)
  ghost.rotation.set(0, 0, 0)
  hunterVisual.position.set(0, 0, 0)
  hunterVisual.rotation.set(0, 0, 0)
  nextHunterGlitchAt = 0
  hunterGlitchEndsAt = 0
  ghostRushEndsAt = 0
  activeDoorSlam = null
  cameraShakeEndsAt = 0
  cameraShakeOffset.set(0, 0, 0)
  window.clearTimeout(whisperTimeoutId)
  whisperMessage.hidden = true
  whisperMessage.classList.remove('is-visible')
  for (const door of classroomDoorPanels) {
    door.hinge.rotation.y = door.openRotation
  }
  pressedKeys.clear()
  caughtScreen.hidden = true
  startScreen.hidden = false
}

renderer.setClearColor(0x000000)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)

document.querySelector('#app').appendChild(renderer.domElement)

renderer.setAnimationLoop((time) => {
  const delta = Math.min(clock.getDelta(), 0.1)

  updateLightFlicker(time)
  updateDoorSlam(time)
  updateHunterEffects(time)

  movement.set(0, 0, 0)
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, camera.up).normalize()

  if (pressedKeys.has('KeyW')) movement.add(forward)
  if (pressedKeys.has('KeyS')) movement.sub(forward)
  if (pressedKeys.has('KeyD')) movement.add(right)
  if (pressedKeys.has('KeyA')) movement.sub(right)

  if (movement.lengthSq() > 0) {
    camera.position.addScaledVector(movement.normalize(), movementSpeed * delta)
  }

  if (!playerCaught && document.pointerLockElement === renderer.domElement) {
    updateGhost(delta, time)

    if (ghostReachedPlayer()) {
      catchPlayer()
    }
  }

  applyCameraShake(time)
  renderer.render(scene, camera)
  camera.position.sub(cameraShakeOffset)
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Digit1' && !event.repeat && !playerCaught) {
    whisper('behind you')
  }

  if (event.code === 'Digit2' && !event.repeat) {
    flickerLights()
  }

  if (
    event.code === 'Digit3' &&
    !event.repeat &&
    !playerCaught &&
    document.pointerLockElement === renderer.domElement
  ) {
    slamDoor()
  }

  if (
    event.code === 'Digit4' &&
    !event.repeat &&
    !playerCaught &&
    document.pointerLockElement === renderer.domElement
  ) {
    rushGhost()
  }

  if (document.pointerLockElement === renderer.domElement) {
    pressedKeys.add(event.code)
  }
})

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code)
})

window.addEventListener('blur', () => {
  pressedKeys.clear()
})

startScreen.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})

restartButton.addEventListener('click', restartGame)

document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === renderer.domElement

  startScreen.hidden = isLocked || playerCaught

  if (!isLocked) {
    pressedKeys.clear()
  }
})

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return

  yaw -= event.movementX * lookSensitivity
  pitch -= event.movementY * lookSensitivity
  pitch = THREE.MathUtils.clamp(pitch, -maxPitch, maxPitch)
  camera.rotation.set(pitch, yaw, 0)
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

  while (twitchFeed.childElementCount > 4) {
    twitchFeed.lastElementChild.remove()
  }

  window.setTimeout(() => item.classList.add('is-fading'), 4200)
  window.setTimeout(() => item.remove(), 5000)
}

const twitchScares = new Map()

function registerTwitchScare(commands, scareName, action) {
  for (const command of commands) {
    twitchScares.set(command, { action, scareName })
  }
}

registerTwitchScare(['!whisper', 'w'], 'WHISPER', () => whisper('behind you'))
registerTwitchScare(['!flicker', 'f'], 'FLICKER', flickerLights)
registerTwitchScare(['!slam', 's'], 'SLAM', slamDoor)
registerTwitchScare(['!hunt', 'c'], 'HUNT', rushGhost)

const twitchClient = new tmi.Client({
  connection: {
    reconnect: true,
    secure: true,
  },
  channels: [twitchChannel],
})

twitchClient.on('message', (_channel, tags, message, self) => {
  if (self) return

  const scare = twitchScares.get(message.trim().toLowerCase())
  if (!scare) return

  scare.action()
  addTwitchFeedItem(tags['display-name'] || tags.username || 'viewer', scare.scareName)
})

twitchClient.connect().catch((error) => {
  console.warn(`Could not connect to Twitch channel ${twitchChannel}`, error)
})
