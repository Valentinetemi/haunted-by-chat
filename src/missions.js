const TEMPLATES = [
  { cash: 50, id: 'drop-four', kind: 'kill', label: 'Drop 4 zombies', score: 180, seconds: 40, target: 4 },
  { cash: 70, id: 'drop-brute', kind: 'brute', label: 'Drop a brute', score: 240, seconds: 45, target: 1 },
  { cash: 60, id: 'nursery', kind: 'room', label: 'Reach the nursery', room: 'nursery', score: 160, seconds: 30 },
  { cash: 55, id: 'study', kind: 'room', label: 'Reach the study', room: 'study', score: 140, seconds: 28 },
  { cash: 65, id: 'cellar', kind: 'survive', label: 'Survive the cellar', room: 'cellar-bath', score: 200, seconds: 25 },
  { cash: 45, id: 'pantry', kind: 'room', label: 'Reach the pantry', room: 'pantry', score: 120, seconds: 22 },
  { cash: 80, id: 'drop-eight', kind: 'kill', label: 'Drop 8 zombies', score: 260, seconds: 50, target: 8 },
]

function pickTemplate(previous) {
  const options = TEMPLATES.filter((mission) => mission.id !== previous)
  return options[Math.floor(Math.random() * options.length)]
}

export function createMissionSystem({
  banner,
  clock,
  label,
  onComplete,
  onFail,
}) {
  let active = null
  let nextAt = Infinity
  let lastId = ''
  let killBaseline = 0
  let bruteBaseline = 0
  let survive = 0

  const hide = () => {
    banner.hidden = true
  }

  const show = () => {
    banner.hidden = false
    label.textContent = active.template.label
  }

  return {
    noteBrute() {
      if (active?.template.kind === 'brute') active.progress += 1
    },
    reset(time) {
      active = null
      nextAt = time + 8000
      survive = 0
      hide()
    },
    update({ brutes, delta, kills, now, playing, room }) {
      if (!playing) return
      if (!active) {
        if (now < nextAt) return
        const template = pickTemplate(lastId)
        lastId = template.id
        active = { endsAt: now + template.seconds * 1000, progress: 0, template }
        killBaseline = kills
        bruteBaseline = brutes
        survive = 0
        show()
      }
      const mission = active.template
      let done = false
      if (mission.kind === 'kill') done = kills - killBaseline >= mission.target
      if (mission.kind === 'brute') done = brutes - bruteBaseline >= mission.target
      if (mission.kind === 'room') done = room === mission.room
      if (mission.kind === 'survive' && room === mission.room) {
        survive += delta
        done = survive >= mission.seconds * 0.7
      }
      const left = Math.max(0, (active.endsAt - now) / 1000)
      clock.textContent = `${Math.ceil(left)}s`
      if (done) {
        onComplete(mission)
        active = null
        nextAt = now + 6000
        hide()
        return
      }
      if (now >= active.endsAt) {
        onFail(mission)
        active = null
        nextAt = now + 5000
        hide()
      }
    },
  }
}
