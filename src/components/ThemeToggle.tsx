import React, { useState } from 'react';

export type Theme = 'light' | 'dark' | 'soft';

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const OPTIONS: { value: Theme; label: string; swatch: string; icon: string }[] = [
  { value: 'light', label: 'Clair', swatch: '#ffffff', icon: 'fa-sun' },
  { value: 'soft', label: 'Doux', swatch: '#fdf8f0', icon: 'fa-mug-hot' },
  { value: 'dark', label: 'Sombre', swatch: '#1c1c1e', icon: 'fa-moon' },
];

const ThemeToggle: React.FC<Props> = ({ theme, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find(o => o.value === theme) || OPTIONS[0];

  return (
    <div className="fixed top-3 right-3 z-[60]" style={{ maxWidth: 420, margin: '0 auto' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Changer de thème"
        className="w-10 h-10 rounded-full shadow-lg border border-gray-200 flex items-center justify-center"
        style={{ background: current.swatch, color: theme === 'dark' ? '#f2f2f3' : '#374151' }}
      >
        <i className={`fa-solid ${current.icon} text-sm`}></i>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 z-[60]" style={{ minWidth: 150 }}>
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${theme === opt.value ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0" style={{ background: opt.swatch }}></span>
                {opt.label}
                {theme === opt.value && <i className="fa-solid fa-check ml-auto text-xs"></i>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeToggle;
