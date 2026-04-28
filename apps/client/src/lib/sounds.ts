// Sounds générés avec Web Audio API — aucun fichier externe

let ctx: AudioContext | null = null

export function unlockAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
}

// Débloquer au premier clic/toucher sur la page
if (typeof window !== 'undefined') {
  const unlock = () => { unlockAudio(); window.removeEventListener('click', unlock); window.removeEventListener('touchend', unlock) }
  window.addEventListener('click', unlock)
  window.addEventListener('touchend', unlock)
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function beep(freq: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.frequency.value = freq
  osc.type = type
  gain.gain.setValueAtTime(volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)

  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

export const sounds = {
  // Bip du countdown 3...2...1
  countdownBeep: () => beep(880, 0.15, 0.25, 'sine'),

  // Bip final (Go !)
  countdownGo: () => {
    beep(1046, 0.08, 0.3, 'sine')
    setTimeout(() => beep(1318, 0.08, 0.3, 'sine'), 80)
    setTimeout(() => beep(1568, 0.25, 0.3, 'sine'), 160)
  },

  // Bonne réponse
  correct: () => {
    beep(523, 0.08, 0.2, 'sine')
    setTimeout(() => beep(659, 0.08, 0.2, 'sine'), 80)
    setTimeout(() => beep(784, 0.2, 0.2, 'sine'), 160)
  },

  // Proche !
  close: () => beep(440, 0.12, 0.15, 'sine'),

  // Timer urgence (< 10s) — pitch monte selon le temps restant
  timerTick: (timeLeft = 5) => {
    const freq = 440 + (10 - timeLeft) * 40 // monte de 440Hz à 840Hz
    const vol = 0.08 + (10 - timeLeft) * 0.015 // monte en volume
    beep(freq, 0.07, Math.min(vol, 0.22), 'square')
  },

  // Tour qui commence (dessinateur a choisi son mot)
  turnStart: () => {
    const ac = getCtx()
    // Petit roulement ascendant
    const times = [0, 0.06, 0.12, 0.2]
    const freqs = [330, 392, 494, 659]
    times.forEach((t, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.frequency.value = freqs[i]!
      osc.type = 'triangle'
      gain.gain.setValueAtTime(0.2, ac.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.12)
      osc.start(ac.currentTime + t)
      osc.stop(ac.currentTime + t + 0.15)
    })
  },

  // Un joueur a deviné (son léger)
  playerGuessed: () => {
    beep(523, 0.06, 0.15, 'sine')
    setTimeout(() => beep(784, 0.15, 0.15, 'sine'), 60)
  },

  // Tout le monde a deviné (son plus fort)
  allGuessed: () => {
    const ac = getCtx()
    const chord = [523, 659, 784, 1046]
    chord.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ac.currentTime + i * 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.04 + 0.4)
      osc.start(ac.currentTime + i * 0.04)
      osc.stop(ac.currentTime + i * 0.04 + 0.5)
    })
  },

  // Notification message privé — "plop" doux et agréable
  dmNotif: () => {
    const ac = getCtx()
    // Deux sinusoïdes superposées pour un son riche et doux
    const freqs = [520, 780]
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const filter = ac.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq * 0.85, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(freq, ac.currentTime + 0.04)

      filter.type = 'lowpass'
      filter.frequency.value = 2400
      filter.Q.value = 0.5

      gain.gain.setValueAtTime(0, ac.currentTime)
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.14 : 0.07, ac.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ac.destination)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.25)
    })
  },

  // Indice révélé
  hint: () => {
    const ac = getCtx()
    // Deux notes douces ascendantes — style "ding ding"
    const notes = [
      { freq: 784, t: 0.0, dur: 0.12 },
      { freq: 1046, t: 0.14, dur: 0.18 },
    ]
    notes.forEach(({ freq, t, dur }) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ac.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + dur)
      osc.start(ac.currentTime + t)
      osc.stop(ac.currentTime + t + dur + 0.05)
    })
  },

  // Pop léger pour les réactions emoji
  reactionPop: () => {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const filter = ac.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(680, ac.currentTime + 0.06)

    filter.type = 'lowpass'
    filter.frequency.value = 2000

    gain.gain.setValueAtTime(0, ac.currentTime)
    gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.15)
  },

  // Fin de tour sans points (personne n'a deviné)
  noPoints: () => {
    const ac = getCtx()
    // Descente grave façon "wah wah wah"
    const notes = [
      { freq: 311, t: 0.0, dur: 0.18 },
      { freq: 277, t: 0.18, dur: 0.18 },
      { freq: 233, t: 0.36, dur: 0.32 },
    ]
    notes.forEach(({ freq, t, dur }) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.frequency.value = freq
      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.18, ac.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + dur)
      osc.start(ac.currentTime + t)
      osc.stop(ac.currentTime + t + dur + 0.05)
    })
  },

  // Podium / victoire
  victory: () => {
    const ac = getCtx()
    // Fanfare joyeuse
    const melody = [
      { freq: 523, t: 0.0, dur: 0.12 },
      { freq: 523, t: 0.12, dur: 0.12 },
      { freq: 523, t: 0.24, dur: 0.12 },
      { freq: 659, t: 0.36, dur: 0.36 },
      { freq: 622, t: 0.72, dur: 0.12 },
      { freq: 587, t: 0.84, dur: 0.12 },
      { freq: 523, t: 0.96, dur: 0.12 },
      { freq: 784, t: 1.08, dur: 0.36 },
      { freq: 659, t: 1.44, dur: 0.36 },
      { freq: 523, t: 1.80, dur: 0.6  },
    ]
    melody.forEach(({ freq, t, dur }) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.frequency.value = freq
      osc.type = 'triangle'
      gain.gain.setValueAtTime(0.25, ac.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + dur)
      osc.start(ac.currentTime + t)
      osc.stop(ac.currentTime + t + dur + 0.05)
    })
  },
}
