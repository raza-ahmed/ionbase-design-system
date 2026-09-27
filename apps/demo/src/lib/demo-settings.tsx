import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nProvider } from 'ionbase-ui';

/**
 * Presenter controls — not part of the fictional product. They let a live demo
 * step through every state a pattern requires without editing code.
 */
export type Theme = 'light' | 'dark';
export type ForcedState = 'live' | 'loading' | 'empty' | 'error' | 'partial';
export type Latency = 0 | 800 | 3000;
export type Direction = 'ltr' | 'rtl';

export interface DemoSettings {
  theme: Theme;
  state: ForcedState;
  latency: Latency;
  direction: Direction;
}

interface DemoSettingsContextValue extends DemoSettings {
  update: (patch: Partial<DemoSettings>) => void;
}

const STORAGE_KEY = 'ionbase-ops:demo-settings';

function initial(): DemoSettings {
  const fallback: DemoSettings = {
    theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
    state: 'live',
    latency: 800,
    direction: 'ltr',
  };
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // A forced state is never restored: reloading into "error" looks like a
    // real outage to whoever opens the demo next.
    return saved
      ? { ...fallback, ...JSON.parse(saved), state: 'live' }
      : fallback;
  } catch {
    return fallback;
  }
}

const DemoSettingsContext = createContext<DemoSettingsContextValue | null>(
  null,
);

export function DemoSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    // The selector the token CSS already themes on — see theme-dark.css.
    document.documentElement.setAttribute('data-theme', settings.theme);
    // Right to left is `dir` for the layout. The content stays English, so
    // `lang` does not change.
    document.documentElement.dir = settings.direction;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage blocked (private mode). The demo still works, it just forgets.
    }
  }, [settings]);

  const value = useMemo(
    () => ({
      ...settings,
      update: (patch: Partial<DemoSettings>) =>
        setSettings((s) => ({ ...s, ...patch })),
    }),
    [settings],
  );

  return (
    <DemoSettingsContext.Provider value={value}>
      {/*
       * And an RTL locale for react-aria, whose arrow keys follow the locale,
       * not `dir`. Hebrew, for its Latin digits. Left to right, no locale:
       * react-aria falls back to the browser's, as it did before.
       */}
      <I18nProvider locale={settings.direction === 'rtl' ? 'he-IL' : undefined}>
        {children}
      </I18nProvider>
    </DemoSettingsContext.Provider>
  );
}

export function useDemoSettings(): DemoSettingsContextValue {
  const ctx = useContext(DemoSettingsContext);
  if (!ctx)
    throw new Error('useDemoSettings must be used inside DemoSettingsProvider');
  return ctx;
}
