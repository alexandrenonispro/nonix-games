import styles from './GameSettings.module.css'

interface DrawnixSettings {
  gameId: 'skribble'
  rounds: number
  timePerRound: number
  wordCount: number
  language: string
}

interface GameSettingsProps {
  settings: DrawnixSettings
  isHost: boolean
  onChange: (settings: DrawnixSettings) => void
}

function OptionGroup<T extends number>({
  label, value, options, labels, isHost, onChange,
}: {
  label: string
  value: T
  options: T[]
  labels?: string[]
  isHost: boolean
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.options}>
        {options.map((opt, i) => (
          <button
            key={opt}
            className={`${styles.optBtn} ${value === opt ? styles.optBtnActive : ''}`}
            onClick={() => isHost && onChange(opt)}
            disabled={!isHost}
            style={{ cursor: isHost ? 'pointer' : 'default' }}
          >
            {labels?.[i] ?? opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function GameSettings({ settings: rawSettings, isHost, onChange }: GameSettingsProps) {
  // Valeurs par défaut garanties
  const settings: DrawnixSettings = {
    gameId: 'skribble',
    rounds: rawSettings?.rounds ?? 3,
    timePerRound: rawSettings?.timePerRound ?? 60,
    wordCount: rawSettings?.wordCount ?? 4,
    language: rawSettings?.language ?? 'fr',
  }
  const update = (patch: Partial<DrawnixSettings>) =>
    onChange({ ...settings, ...patch })

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Paramètres</span>
        {!isHost && <span className={styles.readOnly}>lecture seule</span>}
      </div>

      <OptionGroup
        label="Durée d'un tour"
        value={settings.timePerRound}
        options={[30, 60, 90, 120]}
        labels={['30s', '60s', '90s', '120s']}
        isHost={isHost}
        onChange={(v) => update({ timePerRound: v })}
      />

      <OptionGroup
        label="Mots proposés"
        value={settings.wordCount}
        options={[2, 3, 4]}
        labels={['2 mots', '3 mots', '4 mots']}
        isHost={isHost}
        onChange={(v) => update({ wordCount: v })}
      />

      <OptionGroup
        label="Nombre de rounds"
        value={settings.rounds}
        options={[3, 4, 5, 6, 7, 8]}
        isHost={isHost}
        onChange={(v) => update({ rounds: v })}
      />
    </div>
  )
}
