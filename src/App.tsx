import { useCallback, useEffect, useState } from 'react';
import { Game } from './components/Game';
import { decodeConfig, encodeConfig, randomSeed, type Config } from './lib/generator';
import { load, save } from './lib/storage';

type Theme = 'light' | 'dark';

const DEFAULT: Omit<Config, 'seed'> = { size: 'standard', diff: 'medium', systems: [], clue: false };

function initialConfig(): Config {
  return (
    decodeConfig(location.hash) ??
    load<Config | null>('corpus:last', null) ?? { ...DEFAULT, seed: randomSeed() }
  );
}

function initialTheme(): Theme {
  const stored = load<Theme | null>('corpus:theme', null);
  if (stored) return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [config, setConfig] = useState<Config>(initialConfig);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('corpus:theme', theme);
  }, [theme]);

  useEffect(() => {
    history.replaceState(null, '', `#${encodeConfig(config)}`);
    save('corpus:last', config);
  }, [config]);

  // Pasting a different puzzle link into the same tab loads it.
  useEffect(() => {
    const onHash = () => {
      const next = decodeConfig(location.hash);
      if (next && encodeConfig(next) !== encodeConfig(config)) setConfig(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [config]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return <Game key={encodeConfig(config)} config={config} theme={theme} onToggleTheme={toggleTheme} onNew={setConfig} />;
}
