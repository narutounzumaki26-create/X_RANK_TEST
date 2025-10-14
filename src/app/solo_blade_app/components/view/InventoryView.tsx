import Inventory from "../Inventory";

type Props = {
  onBack: () => void;
};

export default function InventoryView({ onBack }: Props) {
  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
      >
        ⬅ Retour
      </button>

      <div className="w-full max-w-2xl">
        <Inventory />
      </div>
    </main>
  );
}