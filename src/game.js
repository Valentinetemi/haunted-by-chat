import * as THREE from 'three'

import { createAudioSystem } from './audio.js'
import { mergeStaticMeshes } from './batch.js'
import {
  HUNTER_SPAWNS,
  PLAYER_START,
  createHauntedHouse,
  getRoomAt,
} from './house.js'
import { createBlackPuddles, createMotherDrips } from './effects.js'
import { createHidingSystem } from './hiding.js'
import {
  createHauntedPlaces,
  getHauntedPlaceAt,
  movePlayerWithinWorld,
} from './haunted-places.js'
import { createKeySystem } from './keys.js'
import { createMobileControls } from './mobile-controls.js'
import { createPortalSystem } from './portals.js'
import { createMissionSystem } from './missions.js'
import { createMother,
  updateMotherAnimation,
  updateMotherFaceReveal,
} from './mother.js'
import { createScoreSystem } from './score.js'
import { createScareDirector } from './scares.js'
import {
  SURVIVORS,
  loadSurvivorId,
  loadUnlocks,
  saveSurvivorId,
  saveUnlocks,
  survivorById,
  weaponPrice,
} from './survivors.js'
import { createRunTimer } from './timer.js'
import { createArsenal, createGrenades, createWeaponPickups } from './arsenal.js'
import { createAmmoPickups } from './weapon.js'
import { createBreakables } from './breakables.js'
import { createZombieHorde } from './zombies.js'
import {
  furnishBathroom,
  furnishAttic,
  furnishBasement,
  furnishCellarWashroom,
  furnishEntrance,
  furnishGuestBathroom,
  furnishKitchen,
  furnishKidsBedroom,
  furnishLivingRoom,
  furnishNursery,
  furnishPantry,
  furnishStudy,
} from './props.js'
function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export async function bootGame(reportProgress = () => {}) {
  const report = (progress, text) => reportProgress(progress, text)
  report(0.44, 'Raising the walls…')
  await nextFrame()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x090708)
  scene.fog = new THREE.FogExp2(0x090708, 0.025)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.copy(PLAYER_START)
  camera.rotation.order = 'YXZ'
  scene.add(camera)

  const usesTouchControls =
    navigator.maxTouchPoints > 0 &&
    (window.matchMedia('(pointer: coarse), (hover: none)').matches ||
      Math.min(window.screen.width, window.screen.height) <= 1024)
  document.body.classList.toggle('uses-touch-controls', usesTouchControls)

  const flashlight = new THREE.SpotLight(0xe5f1ff, 92, 22, 0.38, 0.58, 1.7)
  flashlight.position.set(0, -0.08, 0.05)
  flashlight.castShadow = !usesTouchControls
  flashlight.shadow.mapSize.set(usesTouchControls ? 256 : 512, usesTouchControls ? 256 : 512)
  flashlight.shadow.camera.near = 0.25
  flashlight.shadow.camera.far = 18
  flashlight.shadow.bias = -0.0008
  flashlight.target.position.set(0, -0.08, -1)
  camera.add(flashlight, flashlight.target)

  const flashlightSpill = new THREE.PointLight(0xc9ddf2, 4.5, 4, 2)
  flashlightSpill.position.set(0, -0.25, -0.35)
  camera.add(flashlightSpill)

  const renderer = new THREE.WebGLRenderer({
    antialias: !usesTouchControls && window.devicePixelRatio <= 1.5,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = usesTouchControls ? THREE.BasicShadowMap : THREE.PCFShadowMap
  let renderScale = usesTouchControls ? 1.15 : 1.5
  let slowFrames = 0
  const applyRenderScale = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderScale))
  }
  applyRenderScale()
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.querySelector('#app').appendChild(renderer.domElement)

  const clock = new THREE.Clock()
  const audio = createAudioSystem()
  const house = createHauntedHouse(scene)
  const hauntedPlaces = await createHauntedPlaces(scene, report)
  const blackPuddles = createBlackPuddles(house.group)
  furnishEntrance(house.group)
  furnishLivingRoom(house.group)
  furnishKitchen(house.group)
  const bathroomProps = furnishBathroom(house.group)
  const guestBath = furnishGuestBathroom(house.group)
  const cellarBath = furnishCellarWashroom(house.group)
  furnishKidsBedroom(house.group)
  furnishBasement(house.group)
  furnishAttic(house.group)
  furnishStudy(house.group)
  furnishPantry(house.group)
  const nurseryProps = furnishNursery(house.group)
  mergeStaticMeshes(house.group)
  const horde = createZombieHorde(scene)
  const breakables = createBreakables(house.group)
  const shotRaycaster = new THREE.Raycaster()
  report(0.92, 'She is moving through the house…')
  await nextFrame()
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
  const ammoReserveDisplay = document.querySelector('#ammo-reserve')
  const caughtScreen = document.querySelector('#caught-screen')
  const restartButton = document.querySelector('#restart-button')
  const escapeScreen = document.querySelector('#escape-screen')
  const playAgainButton = document.querySelector('#play-again-button')
  const interactionPrompt = document.querySelector('#interaction-prompt')
  const goalPrompt = document.querySelector('#goal-prompt')
  const objectiveHud = document.querySelector('#objective-hud')
  const currentObjective = document.querySelector('#current-objective')
  const keyCompass = document.querySelector('#key-compass')
  const keyCompassArrow = document.querySelector('#key-compass-arrow')
  const keyCompassDistance = document.querySelector('#key-compass-distance')
  const keyHud = document.querySelector('#key-hud')
  const jumpscare = document.querySelector('#jumpscare')
  const dangerVignette = document.querySelector('#danger-vignette')
  const exhaustionVignette = document.querySelector('#exhaustion-vignette')
  const rewardToast = document.querySelector('#reward-toast')
  const locationCard = document.querySelector('#location-card')
  const locationName = document.querySelector('#location-name')
  const locationTagline = document.querySelector('#location-tagline')
  const portalTransition = document.querySelector('#portal-transition')
  const motherWarning = document.querySelector('#mother-warning')
  const motherProximity = document.querySelector('#mother-proximity')
  const hiding = createHidingSystem(camera, interactionPrompt)
  const healthFill = document.querySelector('#health-fill')
  let health = 100
  let maxHealth = 100

  function paintHealth() {
    healthFill.style.transform = `scaleX(${Math.max(0, health / maxHealth)})`
  }

  let brutesDropped = 0
  let waveNumber = 0
  const missions = createMissionSystem({
    banner: document.querySelector('#mission-banner'),
    clock: document.querySelector('#mission-clock'),
    label: document.querySelector('#mission-label'),
    onComplete: (mission) => {
      scoreSystem.addCash(mission.cash)
      scoreSystem.addScore(mission.score)
      arsenal.addBullets('revolver', 8)
      health = Math.min(maxHealth, health + 25)
      paintHealth()
      showReward(`Paid $${mission.cash}`)
      shoutLevel('Paid')
      updateStunHud()
    },
    onFail: () => showReward('Mission failed'),
  })
  let nextWaveAt = Infinity

  function updateWaves(time) {
    if (!isGameplayActive() || time < nextWaveAt) return
    if (horde.alive > 8) {
      nextWaveAt = time + 4000
      return
    }
    waveNumber += 1
    const spawned = horde.spawnWave(waveNumber, camera.position)
    if (spawned > 0) {
      showReward(`Wave ${waveNumber}`)
      audio.groan()
      const waveValue = document.querySelector('#wave-value')
      if (waveValue) waveValue.textContent = String(waveNumber)
    }
    nextWaveAt = time + 16000
  }

  function hurtPlayer(amount, title = 'The horde got you') {
    if (!isGameplayActive()) return
    health = Math.max(0, health - amount)
    paintHealth()
    cameraShakeEndsAt = performance.now() + 220
    if (health > 0) return
    document.querySelector('#caught-title').textContent = title
    catchPlayer()
  }

  paintHealth()
  let selectedSurvivorId = loadSurvivorId()
  let unlocks = loadUnlocks()
  let pendingStreamer = false
  let moveScale = 1
  const loadoutPanel = document.querySelector('#loadout-panel')
  const menuActions = document.querySelector('.menu-actions')

  function renderLoadout() {
    const list = document.querySelector('#survivor-list')
    list.replaceChildren()
    for (const survivor of SURVIVORS) {
      const locked = survivor.price > 0 && !unlocks[survivor.id]
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'survivor-card'
      if (survivor.id === selectedSurvivorId && !locked) button.classList.add('is-selected')
      button.innerHTML = `<i class="survivor-swatch" style="background:${survivor.hand}"></i><span><b>${survivor.name}</b><br>${locked ? `Unlock $${survivor.price}` : survivor.perk}</span>`
      button.addEventListener('click', () => {
        if (locked) {
          if (!scoreSystem.spend(survivor.price)) {
            showReward('Need more cash')
            return
          }
          unlocks[survivor.id] = true
          saveUnlocks(unlocks)
        }
        selectedSurvivorId = survivor.id
        saveSurvivorId(selectedSurvivorId)
        renderLoadout()
      })
      list.append(button)
    }
    const shop = document.querySelector('#shop-list')
    shop.replaceChildren()
    for (const [id, label] of [['shotgun', 'Shotgun'], ['smg', 'SMG']]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'shop-card'
      const price = weaponPrice(id)
      button.disabled = Boolean(unlocks[id])
      button.textContent = unlocks[id] ? `${label} owned` : `Unlock ${label} · $${price}`
      button.addEventListener('click', () => {
        if (unlocks[id]) return
        if (!scoreSystem.spend(price)) {
          showReward('Need more cash')
          return
        }
        unlocks[id] = true
        saveUnlocks(unlocks)
        shoutLevel(`${label} unlocked`)
        renderLoadout()
      })
      shop.append(button)
    }
    document.querySelector('#bank-readout').textContent = `Cash ${scoreSystem.bank}`
    const bestLine = document.querySelector('#menu-best')
    if (bestLine) bestLine.textContent = `Best score ${scoreSystem.best}`
  }

  function openLoadout(streamer) {
    pendingStreamer = streamer
    loadoutPanel.hidden = false
    menuActions.hidden = true
    renderLoadout()
  }

  function applySurvivor() {
    const picked = survivorById(selectedSurvivorId)
    const active = picked.price > 0 && !unlocks[picked.id] ? survivorById('vale') : picked
    selectedSurvivorId = active.id
    maxHealth = active.health
    health = maxHealth
    paintHealth()
    moveScale = active.speed
    arsenal.setHand(active.hand)
    arsenal.setReloadScale(active.reload)
    arsenal.setGrenadeStock(active.grenades)
    arsenal.reset()
    if (unlocks.shotgun) arsenal.grant('shotgun')
    if (unlocks.smg) arsenal.grant('smg')
    updateStunHud()
  }

  const scoreSystem = createScoreSystem({
    cashDisplay: document.querySelector('#cash-value'),
    scoreDisplay: document.querySelector('#score-value'),
    streakDisplay: document.querySelector('#streak-value'),
  })
  const runTimer = createRunTimer({
    bestDisplay: document.querySelector('#best-time'),
    finalDisplay: document.querySelector('#final-time'),
    hudDisplay: document.querySelector('#run-time'),
  })
  let jumpscareTimeoutId = 0
  let catchTimeoutId = 0
  let rewardTimeoutId = 0
  let locationCardTimeoutId = 0
  let portalTransitionTimeoutId = 0
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
  let nurseryMobileUntil = 0
  let blackoutRoomId = ''
  let blackoutEndsAt = 0

  function blackoutLights() {
    blackoutRoomId = (getHauntedPlaceAt(camera.position) ?? getRoomAt(camera.position)).id
    blackoutEndsAt = performance.now() + 2600
    audio.flicker()
  }

  function updateBlackout(now) {
    if (blackoutEndsAt === 0) return
    const active = now < blackoutEndsAt
    for (const entry of house.ceilingLights) {
      if (entry.roomId !== blackoutRoomId) continue
      entry.light.intensity = active ? 0.02 : entry.baseIntensity
      entry.fixture.material.emissiveIntensity = active ? 0.04 : entry.baseEmissive
    }
    if (!active) blackoutEndsAt = 0
  }

  function scareInBath(method) {
    const roomId = getRoomAt(camera.position).id
    const time = performance.now()
    if (roomId === 'bathroom') bathroomProps[method](time)
    else if (roomId === 'guest-bath') guestBath[method](time)
    else if (roomId === 'cellar-bath') cellarBath[method](time)
    else return false
    return true
  }

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
  const hunterLastSeenPosition = new THREE.Vector3()
  const hunterPatrolTarget = new THREE.Vector3()
  const ghostDriftSpeed = 0.58
  const ghostCatchDistance = 1.05
  const ghostRushDuration = 4000
  const ghostRushMultiplier = 3
  let ghostRushEndsAt = 0
  let hunterSearchEndsAt = 0
  let nextHunterPatrolAt = 0
  let hunterState = 'chase'
  let playerWasHidden = false
  let hasIntroducedWidowsRoom = false
  const mother = createMother()
  report(0.96, 'She is already inside…')
  await nextFrame()
  const motherDrips = createMotherDrips(scene)
  const hunterVisual = mother.group
  const arsenal = createArsenal(camera)
  const thrownGrenades = createGrenades(scene)
  const weaponPickups = createWeaponPickups(house.group)
  const ammoPickups = createAmmoPickups(house.group)
  const shotDirection = new THREE.Vector3()
  const hunterHitBox = new THREE.Box3()
  const hunterHitCenter = new THREE.Vector3()
  const hunterHitSize = new THREE.Vector3(0.95, 2.6, 0.9)
  const shotRay = new THREE.Ray()
  const shotHitPoint = new THREE.Vector3()
  let gunKick = 0
  let hunterFrozenUntil = 0
  let motherHealth = 18
  let motherRage = 0
  let motherBanishedUntil = 0
  let hurtFlashUntil = 0
  let rushAfterStagger = false
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

  const hitMarker = document.querySelector('#hit-marker')
  const killFeed = document.querySelector('#kill-feed')
  const levelBanner = document.querySelector('#level-banner')
  let hitMarkerUntil = 0
  let levelBannerUntil = 0

  function flashHit(headshot) {
    hitMarker.hidden = false
    hitMarker.classList.toggle('is-head', headshot)
    hitMarkerUntil = performance.now() + 120
  }

  function pushKillFeed(text) {
    const line = document.createElement('p')
    line.textContent = text
    killFeed.prepend(line)
    while (killFeed.childElementCount > 4) killFeed.lastElementChild.remove()
    window.setTimeout(() => line.remove(), 2200)
  }

  function shoutLevel(text) {
    levelBanner.textContent = text
    levelBanner.hidden = false
    levelBannerUntil = performance.now() + 900
  }

  function updateJuice(time) {
    if (time >= hitMarkerUntil) hitMarker.hidden = true
    if (time >= levelBannerUntil) levelBanner.hidden = true
  }

  function updateStunHud() {
    const reloading = arsenal.reloading()
    shotsRemainingDisplay.textContent = reloading ? '…' : String(arsenal.loaded)
    ammoReserveDisplay.textContent = arsenal.currentId === 'grenade'
      ? 'throw'
      : reloading
        ? 'loading'
        : String(arsenal.reserve)
    weaponNameDisplay.textContent = arsenal.name
    stunHud.classList.toggle('is-empty', arsenal.loaded === 0 && arsenal.reserve === 0 && !reloading)
  }

  function startReload() {
    if (!isGameplayActive() || hiding.isHidden) return
    if (arsenal.reload(performance.now())) {
      audio.reload()
      updateStunHud()
    }
  }

  function finishReload(time) {
    if (arsenal.finishReload(time)) updateStunHud()
  }

  function resolveShot(direction, pellet) {
    shotRay.set(camera.position, direction)
    hunterHitCenter.set(ghost.position.x, ghost.position.y + 1.2, ghost.position.z)
    hunterHitBox.setFromCenterAndSize(hunterHitCenter, hunterHitSize)
    const motherHit = shotRay.intersectBox(hunterHitBox, shotHitPoint)
    const motherDistance = motherHit && ghost.visible ? motherHit.distanceTo(camera.position) : Infinity
    const zombieHit = horde.rayHit(shotRay)
    if (zombieHit && zombieHit.distance < 30 && zombieHit.distance <= motherDistance) {
      const amount = zombieHit.headshot ? pellet.headDamage : pellet.damage
      const killed = horde.damage(zombieHit.zombie, {
        amount,
        direction,
        force: pellet.headDamage > 3 ? 4.4 : 2.4,
      })
      audio.hit()
      flashHit(zombieHit.headshot)
      cameraShakeEndsAt = performance.now() + (zombieHit.headshot ? 140 : 70)
      if (killed) {
        const payout = scoreSystem.addKill({
          headshot: zombieHit.headshot,
          payout: zombieHit.zombie.stats.cash,
          points: zombieHit.zombie.stats.points,
        })
        arsenal.addBullets(arsenal.currentId === 'grenade' ? 'revolver' : arsenal.currentId, zombieHit.zombie.type === 'brute' ? 8 : 4)
        if (zombieHit.zombie.type === 'brute') brutesDropped += 1
        pushKillFeed(`${zombieHit.headshot ? 'Headshot' : 'Dropped'} ${zombieHit.zombie.type}`)
        if (payout.streak === 5 || payout.streak === 10) {
          scoreSystem.addCash(payout.streak * 4)
          shoutLevel(`Streak x${payout.streak}`)
        }
        showReward(`${zombieHit.headshot ? 'HEADSHOT' : 'Kill'} +${payout.gained}`)
      }
      return
    }
    if (motherHit && motherDistance < 30) {
      damageMother(performance.now())
      cameraShakeEndsAt = performance.now() + 160
    }
  }

  function fireStunBlaster() {
    if (playerCaught || hiding.isHidden || !isGameplayActive()) return
    const shot = arsenal.tap(performance.now())
    if (!shot) return
    if (shot.empty) {
      audio.dryFire()
      if (arsenal.reserve > 0) startReload()
      return
    }
    if (shot.grenade) {
      camera.getWorldDirection(shotDirection)
      thrownGrenades.throw(camera.position, shotDirection)
      audio.slam()
      updateStunHud()
      return
    }
    gunKick = 1
    audio.gunshot()
    camera.getWorldDirection(shotDirection)
    shotRaycaster.set(camera.position, shotDirection)
    if (breakables.shatter(shotRaycaster)) {
      audio.slam()
      scoreSystem.addScore(15)
      showReward('Smashed')
    }
    const lightHits = shotRaycaster.intersectObjects(house.ceilingLights.map((entry) => entry.fixture), false)
    const lightHit = lightHits.find((entry) => entry.distance < 16)
    if (lightHit) {
      const fixture = house.ceilingLights.find((entry) => entry.fixture === lightHit.object)
      if (fixture && fixture.light.intensity > 0.2) {
        fixture.light.intensity = 0
        fixture.shotOut = true
        fixture.fixture.visible = false
        audio.flicker()
        scoreSystem.addScore(20)
        showReward('Lights out')
      }
    }
    const base = shotDirection.clone()
    for (const pellet of shot.pellets) {
      const direction = base.clone()
      direction.x += pellet.spread
      direction.y += pellet.spreadY
      direction.normalize()
      resolveShot(direction, pellet)
    }
    motherHeardShot(performance.now())
    updateStunHud()
  }

  function motherHeardShot(time) {
    if (!ghost.visible) return
    const distance = Math.hypot(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z)
    const range = hiding.isHidden ? 8 : 23
    if (distance > range || motherCanSeePlayer()) return
    hunterLastSeenPosition.copy(camera.position)
    hunterState = 'search'
    hunterSearchEndsAt = time + 4800
  }

  function banishMother(time) {
    motherBanishedUntil = time + 8000
    ghost.visible = false
    motherRage = Math.min(3, motherRage + 1)
    motherHealth = 18 + motherRage * 8
    rushAfterStagger = false
    hunterFrozenUntil = 0
    audio.motherDeath()
    scoreSystem.addScore(500)
    scoreSystem.addCash(80)
    showReward('Mother retreats')
  }

  function returnMother(time) {
    const distantSpawns = HUNTER_SPAWNS.filter(
      (spawn) => spawn.distanceToSquared(camera.position) > 14 ** 2,
    )
    const candidates = distantSpawns.length > 0 ? distantSpawns : HUNTER_SPAWNS
    const spawn = candidates[Math.floor(Math.random() * candidates.length)]
    ghost.position.set(spawn.x, ghostStartPosition.y, spawn.z)
    ghost.visible = true
    motherBanishedUntil = 0
    hunterFrozenUntil = 0
    ghostRushEndsAt = time + 2800
    hunterLastSeenPosition.copy(camera.position)
    hunterState = 'search'
    hunterSearchEndsAt = time + 2800
    audio.motherReturn()
    showReward(motherRage > 1 ? 'She came back furious' : 'She came back angry')
  }

  function damageMother(time) {
    if (!ghost.visible) return
    motherHealth -= 1
    hurtFlashUntil = time + 220
    audio.hit()
    if (motherHealth <= 0) {
      banishMother(time)
      return
    }
    hunterFrozenUntil = time + (motherRage > 0 ? 340 : 620)
    hunterVisual.position.set(0, 0, 0)
    rushAfterStagger = true
    audio.stun()
  }

  function updateHunterStun(time) {
    const isFrozen = time < hunterFrozenUntil && ghost.visible
    const isHurt = time < hurtFlashUntil
    mother.stunLight.intensity = isFrozen ? 6 + Math.sin(time * 0.04) * 2 : motherRage * 0.8
    mother.skinMaterial.emissive.setHex(isHurt ? 0x8a1820 : isFrozen ? 0x3a2418 : 0x1a0c10)
    mother.skinMaterial.emissiveIntensity = isHurt ? 1.8 : isFrozen ? 1.1 : 0.28 + motherRage * 0.15
    const eyeColor = motherRage > 0 ? 0xff5a32 : 0xffe7a2
    for (const eye of mother.eyes) eye.material.emissive.setHex(eyeColor)
  }

  function resetStunBlaster() {
    gunKick = 0
    hunterFrozenUntil = 0
    mother.stunLight.intensity = 0
    mother.skinMaterial.emissive.setHex(0x1a0c10)
    motherHealth = 18
    motherRage = 0
    motherBanishedUntil = 0
    hurtFlashUntil = 0
    rushAfterStagger = false
    ghost.visible = true
    ammoPickups.reset()
    weaponPickups.reset()
    thrownGrenades.reset()
    arsenal.reset()
    updateStunHud()
  }

  function rushGhost() {
    ghostRushEndsAt = performance.now() + ghostRushDuration
    hunterLastSeenPosition.copy(camera.position)
    hunterSearchEndsAt = ghostRushEndsAt
    hunterState = 'search'
  }

  const HUNTER_PATROL_POINTS = {
    courtyard: [[31.5, -6], [45, -5.5], [31, 6], [44.5, 5.5]],
    crypt: [[-7, -62], [7, -60], [6, -49], [-6, -49]],
    house: HUNTER_SPAWNS.map(({ x, z }) => [x, z]),
    mirror: [[-46, -6], [-30, -5.5], [-45, 5], [-31, 5.5]],
  }

  function getWorldZone(position) {
    return getHauntedPlaceAt(position)?.id ?? 'house'
  }

  function getSightZone(position) {
    return getHauntedPlaceAt(position)?.id ?? getRoomAt(position).id
  }

  function motherCanSeePlayer() {
    if (hiding.isHidden) return false
    const distanceSquared = ghost.position.distanceToSquared(camera.position)
    if (distanceSquared <= 4.5 ** 2) return true
    return distanceSquared <= 15 ** 2 && getSightZone(ghost.position) === getSightZone(camera.position)
  }

  function chooseHunterPatrolTarget(time, moveAwayFromPlayer = false) {
    const patrolPoints = HUNTER_PATROL_POINTS[getWorldZone(ghost.position)]
    const distantPoints = patrolPoints.filter(([x, z]) => {
      if (!moveAwayFromPlayer) return true
      return (x - camera.position.x) ** 2 + (z - camera.position.z) ** 2 > 9 ** 2
    })
    const candidates = distantPoints.length > 0 ? distantPoints : patrolPoints
    const [x, z] = candidates[Math.floor(Math.random() * candidates.length)]
    hunterPatrolTarget.set(x, ghostStartPosition.y, z)
    nextHunterPatrolAt = time + 5500 + Math.random() * 3500
  }

  function resetHunterAwareness() {
    hunterLastSeenPosition.copy(camera.position)
    hunterPatrolTarget.copy(ghost.position)
    hunterSearchEndsAt = 0
    nextHunterPatrolAt = 0
    hunterState = 'chase'
    playerWasHidden = false
  }

  function updateGhost(delta, time) {
    const canSeePlayer = motherCanSeePlayer()
    if (canSeePlayer) {
      hunterState = 'chase'
      hunterLastSeenPosition.copy(camera.position)
      hunterSearchEndsAt = time + 2300
    } else if (hiding.isHidden) {
      if (!playerWasHidden || hunterState !== 'patrol') chooseHunterPatrolTarget(time, true)
      hunterState = 'patrol'
      hunterSearchEndsAt = 0
    } else if (time < hunterSearchEndsAt) {
      hunterState = 'search'
    } else {
      hunterState = 'patrol'
      const reachedPatrolTarget = ghost.position.distanceToSquared(hunterPatrolTarget) < 1.2 ** 2
      if (time >= nextHunterPatrolAt || reachedPatrolTarget) chooseHunterPatrolTarget(time)
    }
    playerWasHidden = hiding.isHidden

    const target = hunterState === 'chase'
      ? camera.position
      : hunterState === 'search'
        ? hunterLastSeenPosition
        : hunterPatrolTarget
    ghostDirection.set(target.x - ghost.position.x, 0, target.z - ghost.position.z)
    if (ghostDirection.lengthSq() > 0.0001) {
      const difficultyMultiplier = (1 + keySystem.count * 0.16) * (1 + motherRage * 0.34)
      const awarenessMultiplier = hunterState === 'chase' ? 1 : hunterState === 'search' ? 0.82 : 1.05
      const speedMultiplier =
        difficultyMultiplier *
        awarenessMultiplier *
        (time < ghostRushEndsAt && hunterState !== 'patrol' ? ghostRushMultiplier : 1)
      ghost.position.addScaledVector(ghostDirection.normalize(), ghostDriftSpeed * speedMultiplier * delta)
      ghost.lookAt(target.x, ghost.position.y, target.z)
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
    resetHunterAwareness()
  }

  function relocateHunterForDestination(destination) {
    if (destination === 'house') {
      randomizeHunterSpawn()
      return
    }

    const destinationSpawns = {
      courtyard: [[31.5, -6], [45, -5.5], [31, 6]],
      crypt: [[-7, -62], [7, -60], [6, -49]],
      mirror: [[-46, -6], [-30, -5.5], [-45, 5]],
    }
    const candidates = destinationSpawns[destination]
    const [x, z] = candidates[Math.floor(Math.random() * candidates.length)]
    ghost.position.set(x, ghostStartPosition.y, z)
    ghostStartPosition.copy(ghost.position)
    resetHunterAwareness()
  }

  function ghostReachedPlayer() {
    if (hiding.isHidden) return false
    if (Math.abs(camera.position.y - ghost.position.y) > 2.5) return false
    const xDistance = camera.position.x - ghost.position.x
    const zDistance = camera.position.z - ghost.position.z
    return xDistance ** 2 + zDistance ** 2 <= ghostCatchDistance ** 2
  }

  function showRunSummary() {
    scoreSystem.bankRun()
    const score = String(scoreSystem.score)
    const cash = String(scoreSystem.bank)
    const kills = String(scoreSystem.kills)
    const best = String(scoreSystem.best)
    document.querySelector('#caught-score').textContent = score
    document.querySelector('#caught-cash').textContent = cash
    document.querySelector('#caught-kills').textContent = kills
    document.querySelector('#caught-best').textContent = best
    document.querySelector('#escape-score').textContent = score
    document.querySelector('#escape-cash').textContent = cash
    document.querySelector('#escape-kills').textContent = kills
    document.querySelector('#escape-best').textContent = best
  }

  function catchPlayer() {
    playerCaught = true
    gameRunning = false
    mobileOrientationPaused = false
    document.body.classList.remove('is-playing')
    mobileControls.setActive(false)
    objectiveHud.hidden = true
    locationCard.hidden = true
    pressedKeys.clear()
    startScreen.hidden = true
    audio.caught()
    document.querySelector('#caught-title').textContent = 'Mother found you'
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
      showRunSummary()
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
    exhaustionVignette.classList.toggle('is-visible', isSprinting && staminaRatio < 0.2)
  }

  function escapeHouse() {
    playerEscaped = true
    gameRunning = false
    mobileOrientationPaused = false
    document.body.classList.remove('is-playing')
    mobileControls.setActive(false)
    objectiveHud.hidden = true
    locationCard.hidden = true
    pressedKeys.clear()
    startScreen.hidden = true
    escapeScreen.hidden = false
    showRunSummary()
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

  function showLocationCard(destination, name) {
    const taglines = {
      courtyard: 'The graves are listening',
      crypt: 'Something woke below',
      house: 'It remembers you',
      mirror: 'Do not trust your reflection',
      widows: 'She kept the room exactly as it was',
    }
    window.clearTimeout(locationCardTimeoutId)
    locationName.textContent = name
    locationTagline.textContent = taglines[destination] ?? 'There is no way back'
    locationCard.dataset.location = destination
    locationCard.hidden = false
    locationCard.classList.remove('is-visible')
    void locationCard.offsetWidth
    locationCard.classList.add('is-visible')
    locationCardTimeoutId = window.setTimeout(() => {
      locationCard.hidden = true
      locationCard.classList.remove('is-visible')
    }, 2800)
  }

  function playPortalTransition(destination) {
    window.clearTimeout(portalTransitionTimeoutId)
    portalTransition.dataset.location = destination
    portalTransition.hidden = false
    portalTransition.classList.remove('is-active')
    void portalTransition.offsetWidth
    portalTransition.classList.add('is-active')
    portalTransitionTimeoutId = window.setTimeout(() => {
      portalTransition.hidden = true
      portalTransition.classList.remove('is-active')
    }, 760)
  }

  function updateObjective(keyCount, hint = '') {
    const place = hint ? `Search the ${hint}` : ''
    currentObjective.textContent = [
      place || 'Search the house',
      place || 'Enter the moonlit courtyard',
      place || 'Descend into the crypt',
      place || 'Search every unlocked room',
      place || 'Enter the fractured mirror realm',
      'Return to the front door',
    ][keyCount]
    objectiveHud.classList.remove('is-updating')
    void objectiveHud.offsetWidth
    objectiveHud.classList.add('is-updating')
  }

  function updateKeyCompass() {
    const target = keySystem.activePosition
    if (!target || !isGameplayActive()) {
      keyCompass.hidden = true
      return
    }
    keyCompass.hidden = false
    camera.getWorldDirection(forward)
    const dx = target.x - camera.position.x
    const dy = target.y - camera.position.y
    const dz = target.z - camera.position.z
    const turn = Math.atan2(forward.x, forward.z) - Math.atan2(dx, dz)
    keyCompassArrow.style.transform = `rotate(${turn}rad)`
    keyCompassDistance.textContent = `${Math.max(1, Math.round(Math.hypot(dx, dy, dz)))}m`
  }

  function updateNearMiss(time) {
    if (!isGameplayActive() || hiding.isHidden) {
      dangerVignette.style.opacity = '0'
      motherWarning.classList.remove('is-visible')
      dangerWasClose = false
      return
    }

    const distance = Math.hypot(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z)
    const proximity = THREE.MathUtils.clamp((11 - distance) / 9, 0, 1)
    motherProximity.style.transform = `scaleX(${proximity})`
    motherWarning.classList.toggle('is-visible', distance < 10)
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

  function pulseKeyHud() {
    keyHud.classList.remove('is-picking-up')
    void keyHud.offsetWidth
    keyHud.classList.add('is-picking-up')
  }

  const keySystem = createKeySystem({
    audio,
    hudCount: document.querySelector('#keys-collected'),
    hudPips: document.querySelector('#key-pips'),
    onEscape: escapeHouse,
    getAreaId: () => (getHauntedPlaceAt(camera.position) ?? getRoomAt(camera.position)).id,
    onPickup: (count, total) => {
      pulseKeyHud()
      updateObjective(count, keySystem.nextLabel)
      const unlockMessage = {
        1: 'Courtyard unsealed',
        2: 'Crypt unsealed',
        4: 'Mirror realm unsealed',
      }[count]
      showReward(unlockMessage ?? `Key found · ${count} / ${total}`)
    },
    parent: house.group,
    prompt: goalPrompt,
  })

  const portalSystem = createPortalSystem({
    camera,
    getKeyCount: () => keySystem.count,
    onTravel: ({ destination, name }) => {
      relocateHunterForDestination(destination)
      cameraShakeEndsAt = performance.now() + 180
      playPortalTransition(destination)
      showLocationCard(destination, name)
    },
    parent: hauntedPlaces.group,
    prompt: goalPrompt,
  })

  function applyLookDelta(deltaX, deltaY, sensitivity = lookSensitivity) {
    yaw -= deltaX * sensitivity
    pitch = THREE.MathUtils.clamp(pitch - deltaY * sensitivity, -maxPitch, maxPitch)
    camera.rotation.set(pitch, yaw, 0)
  }

  function performInteraction() {
    if (!isGameplayActive()) return
    if (keySystem.interact()) return
    if (portalSystem.interact()) return
    hiding.toggle()
  }

  const mobileControls = createMobileControls({
    interactButton: document.querySelector('#mobile-use'),
    joystick: document.querySelector('#move-stick'),
    joystickKnob: document.querySelector('#move-stick-knob'),
    joystickZone: document.querySelector('#move-zone'),
    lookZone: document.querySelector('#touch-look-zone'),
    onInteract: performInteraction,
    onLook: (deltaX, deltaY) => applyLookDelta(deltaX, deltaY, 0.0042),
    onGrenade: () => {
      arsenal.switchTo('grenade')
      fireStunBlaster()
    },
    onReload: startReload,
    onStun: fireStunBlaster,
    onSwap: () => {
      arsenal.cycle()
      updateStunHud()
    },
    grenadeButton: document.querySelector('#mobile-nade'),
    reloadButton: document.querySelector('#mobile-reload'),
    root: document.querySelector('#mobile-controls'),
    runButton: document.querySelector('#mobile-run'),
    stunButton: document.querySelector('#mobile-stun'),
    swapButton: document.querySelector('#mobile-swap'),
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
    const place = getHauntedPlaceAt(camera.position)
    const bounds = place?.bounds ?? { minX: -10.7, maxX: 10.7, minZ: -21.8, maxZ: 8.5 }
    ghost.position.set(
      THREE.MathUtils.clamp(
        camera.position.x - forward.x * distance + right.x * sideOffset,
        bounds.minX + 0.8,
        bounds.maxX - 0.8,
      ),
      ghostStartPosition.y,
      THREE.MathUtils.clamp(
        camera.position.z - forward.z * distance + right.z * sideOffset,
        bounds.minZ + 0.8,
        bounds.maxZ - 0.8,
      ),
    )
    cameraShakeEndsAt = performance.now() + 180
  }

  const scareDirector = createScareDirector({
    actions: {
      flicker: flickerLights,
      jumpscare: triggerJumpscare,
      slam: slamDoor,
      teleport: teleportHunterNearby,
    blackout: blackoutLights,
    crawl: () => {
      audio.crawl()
      cameraShakeEndsAt = performance.now() + 420
      if (Math.random() < 0.45) whisper(['under the floor', 'do not look down', 'it is in the walls'][Math.floor(Math.random() * 3)])
    },
    curtain: () => {
      if (scareInBath('triggerCurtain')) audio.crawl()
      else audio.whisper()
    },
    mobile: () => {
      nurseryMobileUntil = performance.now() + 4600
      audio.hint()
    },
    water: () => {
      if (scareInBath('triggerWater')) audio.water()
      else audio.crawl()
    },
    whisper: () => whisper(['behind you', 'come upstairs', 'I found you', 'the bath is running'][Math.floor(Math.random() * 4)]),
  },
    getRoom: () => getHauntedPlaceAt(camera.position) ?? getRoomAt(camera.position),
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
    nurseryMobileUntil = 0
    blackoutEndsAt = 0
    resetStunBlaster()
    activeDoorSlam = null
    cameraShakeEndsAt = 0
    cameraShakeOffset.set(0, 0, 0)
    window.clearTimeout(whisperTimeoutId)
    window.clearTimeout(catchTimeoutId)
    window.clearTimeout(locationCardTimeoutId)
    window.clearTimeout(portalTransitionTimeoutId)
    whisperMessage.hidden = true
    whisperMessage.classList.remove('is-visible')
    for (const door of house.doors) door.hinge.rotation.y = door.openRotation
    bathroomProps.reset()
    guestBath.reset()
    cellarBath.reset()
    hiding.reset()
    keySystem.reset()
    updateObjective(0, keySystem.nextLabel)
    objectiveHud.hidden = true
    locationCard.hidden = true
    locationCard.classList.remove('is-visible')
    portalTransition.hidden = true
    portalTransition.classList.remove('is-active')
    portalSystem.reset()
    runTimer.reset()
    scareDirector.reset()
    jumpscare.hidden = true
    jumpscare.classList.remove('is-catch')
    dangerVignette.style.opacity = '0'
    dangerWasClose = false
    nearMissCooldownUntil = 0
    hasIntroducedWidowsRoom = false
    pressedKeys.clear()
    scoreSystem.bankRun()
    scoreSystem.resetRun()
    health = maxHealth
    paintHealth()
    for (const entry of house.ceilingLights) {
      entry.shotOut = false
      entry.light.intensity = entry.baseIntensity
      entry.fixture.visible = true
    }
    breakables.reset()
    horde.reset()
    waveNumber = 0
    nextWaveAt = Infinity
    brutesDropped = 0
    missions.reset(performance.now())
    killFeed.replaceChildren()
    levelBanner.hidden = true
    hitMarker.hidden = true
    caughtScreen.hidden = true
    escapeScreen.hidden = true
    startScreen.hidden = false
  }

  renderer.setAnimationLoop((time) => {
    const delta = Math.min(clock.getDelta(), 0.1)
    if (delta > 0.034) {
      slowFrames += 1
      if (slowFrames > 45 && renderScale > 0.8) {
        renderScale = Math.max(0.8, renderScale - 0.2)
        applyRenderScale()
        slowFrames = 0
      }
    } else {
      slowFrames = 0
    }
    mobileControls.update(delta)
    hauntedPlaces.update(time)
    updateLightFlicker(time)
    updateBlackout(time)
    if (nurseryProps.userData.mobile) {
      nurseryProps.userData.mobile.rotation.y += time < nurseryMobileUntil ? delta * 2.6 : delta * 0.2
    }
    blackPuddles.update(time)
    updateDoorSlam(time)
    if (bathroomProps.update(camera.position, time, isGameplayActive())) audio.mirror()
    if (guestBath.update(camera.position, time, isGameplayActive())) audio.mirror()
    if (cellarBath.update(camera.position, time, isGameplayActive())) audio.mirror()
    hiding.update(
      isGameplayActive(),
    )
    keySystem.update(
      camera.position,
      time,
      isGameplayActive(),
    )
    updateKeyCompass()
    portalSystem.update(camera.position, time, isGameplayActive())
    scareDirector.update(time)
    runTimer.update(time)
    scoreSystem.tick(time)
    updateJuice(time)
    updateWaves(time)
    missions.update({
      brutes: brutesDropped,
      delta,
      kills: scoreSystem.kills,
      now: time,
      playing: isGameplayActive(),
      room: (getHauntedPlaceAt(camera.position) ?? getRoomAt(camera.position)).id,
    })
    const bites = horde.update(delta, time, camera.position, isGameplayActive() && !hiding.isHidden)
    for (const bite of bites) {
      audio.bite()
      hurtPlayer(bite.damage)
    }
    updateNearMiss(time)
    finishReload(time)
    const gainedAmmo = ammoPickups.update(camera.position, time, isGameplayActive())
    if (gainedAmmo > 0) {
      arsenal.addBullets(arsenal.currentId === 'grenade' ? 'revolver' : arsenal.currentId, gainedAmmo)
      audio.pickup()
      showReward(`+${gainedAmmo} bullets`)
      updateStunHud()
    }
    for (const found of weaponPickups.update(camera.position, time, isGameplayActive())) {
      arsenal.grant(found)
      audio.pickup()
      showReward(found === 'grenade' ? 'Grenades' : found === 'smg' ? 'SMG' : 'Shotgun')
      updateStunHud()
    }
    const autoShot = arsenal.holdFire(time)
    if (autoShot?.pellets) {
      audio.gunshot()
      camera.getWorldDirection(shotDirection)
      const base = shotDirection.clone()
      for (const pellet of autoShot.pellets) {
        const direction = base.clone()
        direction.x += pellet.spread
        direction.y += pellet.spreadY
        direction.normalize()
        resolveShot(direction, pellet)
      }
      motherHeardShot(time)
      updateStunHud()
    }
    const blast = thrownGrenades.update(delta, time)
    if (blast) {
      audio.boom()
      cameraShakeEndsAt = time + 320
      for (const zombie of horde.blast(blast, 4.4)) {
        if (zombie.type === 'brute') brutesDropped += 1
        scoreSystem.addKill({
          payout: zombie.stats.cash,
          points: zombie.stats.points,
        })
      }
      const motherDistance = Math.hypot(blast.x - ghost.position.x, blast.z - ghost.position.z)
      if (motherDistance < 4.4 && ghost.visible) damageMother(time)
      showReward('Boom')
    }
    gunKick = arsenal.update(time, delta)
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
      movement.normalize().multiplyScalar((isSprinting ? sprintSpeed : movementSpeed) * moveScale * delta)
      movePlayerWithinWorld(camera.position, movement)
    }
    if (!hasIntroducedWidowsRoom && camera.position.y > 3.8) {
      hasIntroducedWidowsRoom = true
      showLocationCard('widows', "Widow's Room")
    }

    if (isGameplayActive()) {
      if (!ghost.visible) {
        if (time >= motherBanishedUntil) returnMother(time)
      } else if (time >= hunterFrozenUntil) {
        if (rushAfterStagger) {
          rushAfterStagger = false
          ghostRushEndsAt = time + 2200
          hunterLastSeenPosition.copy(camera.position)
          hunterSearchEndsAt = time + 2200
          hunterState = 'search'
        }
        updateGhost(delta, time)
        if (ghostReachedPlayer()) catchPlayer()
      }
    }
    motherDrips.update(time, delta, mother, isGameplayActive())
    audio.updateMother(
      time,
      Math.hypot(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z),
      time >= hunterFrozenUntil,
      isGameplayActive(),
    )
  applyCameraShake(time)
  camera.rotation.x -= gunKick * 0.045
  renderer.render(scene, camera)
  camera.rotation.x += gunKick * 0.045
    camera.position.sub(cameraShakeOffset)
  })

  window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && !event.repeat && !playerCaught && !playerEscaped) {
    performInteraction()
  }
  if (event.code === 'KeyR' && !event.repeat) startReload()
    if (event.code === 'Digit1' && !event.repeat) {
      if (isGameplayActive()) arsenal.switchTo('revolver')
      else whisper('behind you')
      updateStunHud()
    }
    if (event.code === 'Digit2' && !event.repeat) {
      if (isGameplayActive()) arsenal.switchTo('shotgun')
      else flickerLights()
      updateStunHud()
    }
    if (event.code === 'Digit3' && !event.repeat) {
      if (isGameplayActive()) arsenal.switchTo('smg')
      else if (!playerCaught) slamDoor()
      updateStunHud()
    }
    if (event.code === 'Digit4' && !event.repeat) {
      if (isGameplayActive()) arsenal.switchTo('grenade')
      else if (!playerCaught) rushGhost()
      updateStunHud()
    }
    if (event.code === 'KeyG' && !event.repeat && isGameplayActive()) {
      arsenal.switchTo('grenade')
      fireStunBlaster()
    }
    if (isGameplayActive()) pressedKeys.add(event.code)
  })
  window.addEventListener('keyup', (event) => pressedKeys.delete(event.code))
  window.addEventListener('blur', () => {
    pressedKeys.clear()
    mobileControls.reset()
  })
  let lastStreamerMode = false

  function replayRun() {
    restartGame()
    startGame(lastStreamerMode)
  }

  function startGame(streamerMode = false) {
    lastStreamerMode = streamerMode
    if (streamerMode) {
      connectStreamerMode()
    } else {
      disconnectStreamerMode()
    }
    audio.start()
    applySurvivor()
    document.body.classList.add('is-playing')
    gameRunning = true
    startScreen.hidden = true
  objectiveHud.hidden = false
  updateObjective(keySystem.count, keySystem.nextLabel)
  showLocationCard('house', 'The House')
    mobileControls.setActive(usesTouchControls)
    scareDirector.reset()
    runTimer.start()
    waveNumber = 0
    nextWaveAt = performance.now() + 2200
    brutesDropped = 0
    missions.reset(performance.now())
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

  playButton.addEventListener('click', () => openLoadout(false))
  streamerButton.addEventListener('click', () => openLoadout(true))
  document.querySelector('#deploy-button').addEventListener('click', () => startGame(pendingStreamer))
  howToButton.addEventListener('click', () => {
    const isOpening = howToPanel.hidden
    howToPanel.hidden = !isOpening
    howToButton.setAttribute('aria-expanded', String(isOpening))
  })
  function backToSurvivors() {
    restartGame()
    openLoadout(lastStreamerMode)
  }

  restartButton.addEventListener('click', replayRun)
  playAgainButton.addEventListener('click', replayRun)
  document.querySelector('#change-survivor').addEventListener('click', backToSurvivors)
  document.querySelector('#escape-change-survivor').addEventListener('click', backToSurvivors)

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
    if (event.button !== 0 || usesTouchControls) return
    arsenal.setTrigger(true)
    fireStunBlaster()
  })
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) arsenal.setTrigger(false)
  })

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    applyRenderScale()
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
    ['!horde', {
      name: 'HORDE',
      action: () => {
        waveNumber += 1
        horde.spawnWave(waveNumber + 1, camera.position)
        showReward('Chat called a horde')
      },
    }],
    ['!zombie', {
      name: 'ZOMBIE',
      action: () => {
        horde.spawn('runner', camera.position.x + 6, camera.position.z - 4)
        horde.spawn('walker', camera.position.x - 6, camera.position.z - 3)
      },
    }],
    ['z', {
      name: 'ZOMBIE',
      action: () => {
        horde.spawn('walker', camera.position.x + 5, camera.position.z + 4)
      },
    }],
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
  const menuBest = document.querySelector('#menu-best')
  if (menuBest) menuBest.textContent = `Best score ${scoreSystem.best}`

  report(1, 'The front door is unlatched')
}
