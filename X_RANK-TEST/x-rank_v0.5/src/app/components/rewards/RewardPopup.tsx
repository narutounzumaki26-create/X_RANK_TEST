"use client";

type RewardPopupProps = {
  itemName: string;
  onClose: () => void;
};

export function RewardPopup({ itemName, onClose }: RewardPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-purple-900 to-black p-6 rounded-2xl border border-fuchsia-500 shadow-[0_0_20px_rgba(255,0,255,0.8)] text-center">
        <h2 className="text-2xl text-fuchsia-400 font-bold mb-4">
          🎉 Récompense obtenue !
        </h2>
        <p className="text-white mb-6">Tu as gagné : {itemName}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg text-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
