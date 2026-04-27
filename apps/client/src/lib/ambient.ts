// Musique ambiante — fichier audio réel avec contrôle de volume

let audio: HTMLAudioElement | null = null

export function startAmbient(volume = 0.3) {
  if (audio && !audio.paused) return

  if (!audio) {
    audio = new Audio('/sounds/ambient.mp3')
    audio.loop = true
  }

  audio.volume = volume
  audio.play().catch(() => {
    // Navigateur bloque l'autoplay — l'utilisateur doit interagir d'abord
  })
}

export function stopAmbient() {
  if (!audio) return
  audio.pause()
  // Ne pas remettre à 0 — reprend au même endroit au prochain play
}

export function setAmbientVolume(volume: number) {
  if (!audio) return
  audio.volume = volume
  if (volume === 0) {
    audio.pause()
  } else if (audio.paused) {
    audio.play().catch(() => {})
  }
}

export function isAmbientPlaying() {
  return !!audio && !audio.paused
}
