import React from 'react';
import { useGameStore } from '../stores/gameStore';

interface UpgradeModalProps {
  onResume: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onResume }) => {
  const { showUpgradeModal, upgradeChoices, applyUpgrade } = useGameStore();

  const handleSelect = (optionId: string) => {
    applyUpgrade(optionId);
    onResume();
  };

  if (!showUpgradeModal || !upgradeChoices?.length) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(250,248,240,0.92)' }}
    >
      <div className="hand-drawn-box p-6 max-w-lg w-full mx-4 hand-drawn-box-inner">
        <h3 className="hand-drawn-font text-xl text-center mb-4" style={{ color: 'var(--marker-black)' }}>
          升級！選一個強化
        </h3>
        <div className="flex flex-col gap-3">
          {upgradeChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleSelect(choice.id)}
              className="hand-drawn-btn w-full py-4 px-4 text-left hand-drawn-box-inner"
            >
              <div className="hand-drawn-font font-medium" style={{ color: 'var(--marker-black)' }}>
                {choice.label}
              </div>
              <div className="hand-drawn-font text-sm mt-1 opacity-80">
                {choice.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
