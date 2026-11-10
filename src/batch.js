import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const unitBox = new THREE.BoxGeometry(1, 1, 1)

export function createStaticBatch() {
  const entries = []
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const euler = new THREE.Euler()

  return {
    box(size, positionArray, material, rotation = 0) {
      entries.push({ material, position: positionArray, rotation, size })
    },
    flush(parent) {
      const groups = new Map()
      for (const entry of entries) {
        const geometry = unitBox.clone()
        position.set(entry.position[0], entry.position[1], entry.position[2])
        const [rx, ry, rz] = Array.isArray(entry.rotation) ? entry.rotation : [0, entry.rotation, 0]
        euler.set(rx, ry, rz)
        quaternion.setFromEuler(euler)
        scale.set(entry.size[0], entry.size[1], entry.size[2])
        matrix.compose(position, quaternion, scale)
        geometry.applyMatrix4(matrix)
        const list = groups.get(entry.material) ?? []
        list.push(geometry)
        groups.set(entry.material, list)
      }

      const meshes = []
      for (const [material, geometries] of groups) {
        const merged = mergeGeometries(geometries, false)
        for (const geometry of geometries) geometry.dispose()
        if (!merged) continue
        const mesh = new THREE.Mesh(merged, material)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.name = 'static-batch'
        parent.add(mesh)
        meshes.push(mesh)
      }
      entries.length = 0
      return meshes
    },
  }
}

function hasSeparateAncestor(object) {
  let current = object
  while (current) {
    if (current.userData?.keepSeparate) return true
    current = current.parent
  }
  return false
}

export function mergeStaticMeshes(root) {
  root.updateWorldMatrix(true, true)
  const groups = new Map()
  const remove = []

  root.traverse((object) => {
    if (!object.isMesh || hasSeparateAncestor(object)) return
    const geometry = object.geometry.clone()
    geometry.applyMatrix4(object.matrixWorld)
    const list = groups.get(object.material) ?? []
    list.push(geometry)
    groups.set(object.material, list)
    remove.push(object)
  })

  for (const mesh of remove) {
    mesh.parent?.remove(mesh)
    mesh.geometry.dispose()
  }

  const meshes = []
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(geometries, false)
    for (const geometry of geometries) geometry.dispose()
    if (!merged) continue
    const mesh = new THREE.Mesh(merged, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = 'merged-static'
    root.add(mesh)
    meshes.push(mesh)
  }
  return meshes
}
