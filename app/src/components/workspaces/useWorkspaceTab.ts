import { useState } from 'react';

export type Tab = 'problem' | 'lesson';

// Remembered across exercises for the whole visit, like the original page.
let lastTab: Tab = 'problem';

export function useWorkspaceTab(): [Tab, (t: Tab) => void] {
  const [tab, setTab] = useState<Tab>(lastTab);
  return [
    tab,
    t => {
      lastTab = t;
      setTab(t);
    },
  ];
}
