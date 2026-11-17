import { useMemo, useState } from 'react';
import { SYSTEMS, SYSTEM_BY_ID } from '../data/terms';
import type { Placement } from '../lib/generator';

interface Props {
  placements: Placement[];
  found: Set<string>;
  clueMode: boolean;
  onLocate: (p: Placement) => void;
}

export function WordPanel({ placements, found, clueMode, onLocate }: Props) {
  const [query, setQuery] = useState('');
  const [hideFound, setHideFound] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (p: Placement) => {
      if (!q) return true;
      const wordVisible = !clueMode || found.has(p.word);
      return (wordVisible && p.word.toLowerCase().includes(q)) || p.clue.toLowerCase().includes(q);
    };
    return SYSTEMS.map((system) => ({ system, all: placements.filter((p) => p.systemId === system.id) }))
      .filter((g) => g.all.length)
      .map((g) => ({
        ...g,
        shown: g.all
          .filter((p) => !(hideFound && found.has(p.word)) && matches(p))
          .sort((a, b) => a.word.localeCompare(b.word)),
      }));
  }, [placements, found, query, hideFound, clueMode]);

  return (
    <aside className="panel" aria-label="Word list">
      <div className="panel-head">
        <input
          type="search"
          placeholder={clueMode ? 'Search clues…' : 'Search terms…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the word list"
        />
        <label className="check">
          <input type="checkbox" checked={hideFound} onChange={(e) => setHideFound(e.target.checked)} />
          Hide found
        </label>
      </div>
      <div className="groups">
        {groups.map(({ system, all, shown }) => {
          const done = all.filter((p) => found.has(p.word)).length;
          return (
            <details key={system.id} open={done < all.length || all.length <= 6}>
              <summary>
                <span className="dot" style={{ background: system.color }} />
                <span className="gname">{system.name}</span>
                <span className="gcount">{done}/{all.length}</span>
              </summary>
              <ul>
                {shown.map((p) => {
                  const isFound = found.has(p.word);
                  const hidden = clueMode && !isFound;
                  return (
                    <li key={p.word}>
                      <button
                        className={`word${isFound ? ' is-found' : ''}`}
                        onClick={() => !isFound && onLocate(p)}
                        title={isFound ? p.clue : 'Click to locate the first letter (counts as a hint)'}
                        style={isFound ? { borderLeftColor: SYSTEM_BY_ID[p.systemId].color } : undefined}
                      >
                        <span className="w">{hidden ? `${p.word.length} letters` : p.word}</span>
                        <span className="c">{isFound || hidden ? p.clue : ''}</span>
                      </button>
                    </li>
                  );
                })}
                {!shown.length && <li className="none">Nothing to show</li>}
              </ul>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
