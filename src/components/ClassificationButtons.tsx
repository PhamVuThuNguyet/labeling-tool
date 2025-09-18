interface ClassificationButtonsProps {
  selectedValue?: string;
  onClassify: (classification: string) => void;
  onClear: () => void;
}

const ClassificationButtons = ({
  selectedValue,
  onClassify,
  onClear,
}: ClassificationButtonsProps) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="text-gray-600 mb-2 text-center">Classification:</div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => onClassify("burst fracture")}
          className={`px-6 py-3 rounded-lg transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 shadow-md ${
            selectedValue === "burst fracture"
              ? "bg-red-500 text-white shadow-red-200"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Burst Fracture
        </button>

        <button
          onClick={() => onClassify("no burst fracture")}
          className={`px-6 py-3 rounded-lg transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 shadow-md ${
            selectedValue === "no burst fracture"
              ? "bg-green-500 text-white shadow-green-200"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          No Burst Fracture
        </button>
      </div>

      {selectedValue && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onClear}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default ClassificationButtons;
