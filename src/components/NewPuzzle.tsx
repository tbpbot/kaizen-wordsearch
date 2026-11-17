import { useState, type CSSProperties } from 'react';
import { SYSTEMS } from '../data/terms';
import { DIFFICULTIES, SIZES, randomSeed, type Config, type Difficulty, type SizeKey } from '../lib/generator';

interface Props {
  initial: Config;
  onStart: (c: Config) => void;
  onCancel: () => void;
}

export function NewPuzzle({ initial, onStart, onCancel }: Props) {
  const [size, setSize] = useState<SizeKey>(initial.size);
  const [diff, setDiff] = useState<Difficulty>(initial.diff);
  const [systems, setSystems] = useState<string[]>(initial.systems);
  const [clue, setClue] = useState(initial.clue);

  const toggle = (id: string) =>
    setSystems((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));

  return (
    <form
      className="newform"
      onSubmit={(e) => {
        e.preventDefault();
        onStart({ seed: randomSeed(), size, diff, systems, clue });
      }}
    >
      <fieldset>
        <legend>Grid size</legend>
        <div className="seg">
          {(Object.keys(SIZES) as SizeKey[]).map((k) => (
            <label key={k} className={size === k ? 'on' : ''}>
              <input type="radio" name="size" checked={size === k} onChange={() => setSize(k)} />
              <b>{SIZES[k].label}</b>
              <small>{SIZES[k].blurb}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Difficulty</legend>
        <div className="seg three">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => (
            <label key={k} className={diff === k ? 'on' : ''}>
              <input type="radio" name="diff" checked={diff === k} onChange={() => setDiff(k)} />
              <b>{DIFFICULTIES[k].label}</b>
              <small>{DIFFICULTIES[k].blurb}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          Body systems{' '}
          <button type="button" className="link" onClick={() => setSystems([])}>
            Use all
          </button>
        </legend>
        <div className="chips">
          {SYSTEMS.map((s) => {
            const on = systems.length === 0 || systems.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                className={`chip${on ? ' on' : ''}`}
                aria-pressed={systems.includes(s.id)}
                onClick={() => toggle(s.id)}
                style={{ '--c': s.color } as CSSProperties}
              >
                <span className="dot" style={{ background: s.color }} />
                {s.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="check big">
        <input type="checkbox" checked={clue} onChange={(e) => setClue(e.target.checked)} />
        <span>
          <b>Clue mode</b>
          <small>Hide the word list and find terms from their definitions instead.</small>
        </span>
      </label>

      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary">Generate puzzle</button>
      </div>
    </form>
  );
}
