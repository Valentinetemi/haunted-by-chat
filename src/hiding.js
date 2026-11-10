import * as THREE from 'three'

const HIDING_SPOTS = [
  {
    name: 'behind the sofa',
    position: new THREE.Vector3(-9.4, 0, 7.3),
    hiddenPosition: new THREE.Vector3(-9.4, -0.55, 8.55),
    exitPosition: new THREE.Vector3(-9.4, 0, 6.5),
  },
  {
    name: 'inside the pantry',
    position: new THREE.Vector3(14.4, 0, 8.1),
    hiddenPosition: new THREE.Vector3(16.7, -0.2, 8.2),
    exitPosition: new THREE.Vector3(13.4, 0, 8.1),
  },
  {
    name: 'under the desk',
    position: new THREE.Vector3(-16.2, 0, 7.2),
    hiddenPosition: new THREE.Vector3(-16.4, -0.72, 8.15),
    exitPosition: new THREE.Vector3(-16.2, 0, 6.5),
  },
  {
    name: 'in the crib',
    position: new THREE.Vector3(18.2, 0, -9.2),
    hiddenPosition: new THREE.Vector3(19.6, -0.4, -9.8),
    exitPosition: new THREE.Vector3(17.4, 0, -8.6),
  },
  {
    name: 'behind the shower curtain',
    position: new THREE.Vector3(-18.2, 0, -5.4),
    hiddenPosition: new THREE.Vector3(-20.5, -0.2, -6.3),
    exitPosition: new THREE.Vector3(-17.4, 0, -4.8),
  },
  {
    name: 'in the rusted tub',
    position: new THREE.Vector3(-18, 0, -19.6),
    hiddenPosition: new THREE.Vector3(-19.8, -0.55, -20.6),
    exitPosition: new THREE.Vector3(-17, 0, -19.1),
  },
  {
    name: 'under the bed',
    position: new THREE.Vector3(9.6, 0, -10.1),
    hiddenPosition: new THREE.Vector3(9.6, -1.15, -10.65),
    exitPosition: new THREE.Vector3(8.7, 0, -9.3),
  },
  {
    name: 'inside the trunk',
    position: new THREE.Vector3(9.5, 0, -20.4),
    hiddenPosition: new THREE.Vector3(9.5, -0.65, -20.4),
    exitPosition: new THREE.Vector3(8.2, 0, -19.7),
  },
]

export function createHidingSystem(camera, prompt) {
  let hiddenSpot = null
  let nearbySpot = null

  const update = (active) => {
    if (!active) {
      prompt.hidden = true
      return
    }

    if (hiddenSpot) {
      camera.position.copy(hiddenSpot.hiddenPosition)
      prompt.textContent = 'E · leave hiding spot'
      prompt.hidden = false
      return
    }

    nearbySpot = HIDING_SPOTS.reduce((nearest, spot) => {
      const distance = camera.position.distanceToSquared(spot.position)
      if (distance > 2.2 ** 2) return nearest
      if (!nearest || distance < nearest.distance) return { distance, spot }
      return nearest
    }, null)?.spot ?? null

    prompt.textContent = nearbySpot ? `E · hide ${nearbySpot.name}` : ''
    prompt.hidden = !nearbySpot
  }

  const toggle = () => {
    if (hiddenSpot) {
      camera.position.copy(hiddenSpot.exitPosition)
      hiddenSpot = null
      return true
    }
    if (!nearbySpot) return false
    hiddenSpot = nearbySpot
    nearbySpot = null
    camera.position.copy(hiddenSpot.hiddenPosition)
    return true
  }

  const reset = () => {
    hiddenSpot = null
    nearbySpot = null
    prompt.hidden = true
  }

  return {
    get isHidden() {
      return hiddenSpot !== null
    },
    reset,
    toggle,
    update,
  }
}
