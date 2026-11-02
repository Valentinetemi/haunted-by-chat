import * as THREE from 'three'

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

camera.position.z = 5
camera.rotation.order = 'YXZ'

scene.background = new THREE.Color(0x020506)
scene.fog = new THREE.FogExp2(0x020506, 0.027)

const corridor = new THREE.Group()
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x171a1c,
  roughness: 0.92,
})
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x323638,
  roughness: 1,
})
const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1e20,
  roughness: 1,
})
const fixtureEmissiveIntensity = 0.65
const fixtureMaterial = new THREE.MeshStandardMaterial({
  color: 0x73543b,
  emissive: 0xffa85c,
  emissiveIntensity: fixtureEmissiveIntensity,
  roughness: 0.55,
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
  wallMaterial,
)
addBox(
  corridor,
  [corridorWidth, corridorHeight, 0.2],
  [0, (floorY + ceilingY) / 2, corridorStartZ + 0.1],
  wallMaterial,
)

const ambientLight = new THREE.AmbientLight(0x59636b, 0.16)
scene.add(ambientLight)

const ceilingLightIntensity = 12
const ceilingLights = []

for (const z of [2, -10, -22, -34, -46, -58, -68]) {
  const fixture = addBox(
    corridor,
    [1.8, 0.06, 0.5],
    [0, ceilingY - 0.04, z],
    fixtureMaterial.clone(),
  )

  const light = new THREE.PointLight(0xffb66f, ceilingLightIntensity, 16, 2)
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

scene.add(corridor)

const ghostStartPosition = new THREE.Vector3(0, floorY + 0.08, corridorEndZ + 4)
const ghost = new THREE.Group()
const ghostDirection = new THREE.Vector3()
const ghostDriftSpeed = 0.55
const ghostCatchDistance = 1.05
const ghostRushDuration = 4000
const ghostRushMultiplier = 3
let ghostRushEndsAt = 0
const ghostMaterial = new THREE.MeshStandardMaterial({
  color: 0xe5edef,
  emissive: 0x839296,
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.46,
  roughness: 0.7,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const ghostFaceMaterial = new THREE.MeshBasicMaterial({
  color: 0x050708,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
})

const ghostBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.4, 0.78, 2.5, 20, 1, true),
  ghostMaterial,
)
ghostBody.position.y = 1.25
ghost.add(ghostBody)

const ghostHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), ghostMaterial)
ghostHead.position.y = 2.72
ghost.add(ghostHead)

for (const side of [-1, 1]) {
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.25, 6, 12), ghostMaterial)
  arm.position.set(side * 0.5, 1.52, 0)
  arm.rotation.z = side * -0.18
  ghost.add(arm)

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), ghostFaceMaterial)
  eye.position.set(side * 0.13, 2.79, 0.39)
  ghost.add(eye)
}

ghost.position.copy(ghostStartPosition)
scene.add(ghost)

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
  ghostRushEndsAt = 0
  activeDoorSlam = null
  cameraShakeEndsAt = 0
  cameraShakeOffset.set(0, 0, 0)
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
