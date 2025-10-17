interface ClassificationButtonsProps {
  selectedValue?: string;
  labels?: string[];
  onClassify: (classification: string) => void;
  onClear: () => void;
}

const BASE_COLOR = {
  "positive-active": "bg-red-600 text-white shadow-red-200",
  "positive-base": "bg-red-300 text-white shadow-red-200 hover:bg-red-500",
  "negative-active": "bg-green-600 text-white shadow-green-200",
  "negative-base":
    "bg-green-300 text-white shadow-green-200 hover:bg-green-500",
  "neutral-active": "bg-yellow-600 text-white shadow-yellow-200",
  "neutral-base":
    "bg-yellow-300 text-white shadow-yellow-200 hover:bg-yellow-500",
};

const COLOR_CLASSES: Record<string, { active: string; base: string }> = {
  Yes: {
    active: BASE_COLOR["positive-active"],
    base: BASE_COLOR["positive-base"],
  },
  No: {
    active: BASE_COLOR["negative-active"],
    base: BASE_COLOR["negative-base"],
  },
  MLS: {
    active: BASE_COLOR["positive-active"],
    base: BASE_COLOR["positive-base"],
  },
  "No MLS": {
    active: BASE_COLOR["negative-active"],
    base: BASE_COLOR["negative-base"],
  },
  "Burst Fracture": {
    active: BASE_COLOR["positive-active"],
    base: BASE_COLOR["positive-base"],
  },
  "No Burst Fracture": {
    active: BASE_COLOR["negative-active"],
    base: BASE_COLOR["negative-base"],
  },
  "High Risk": {
    active: BASE_COLOR["positive-active"],
    base: BASE_COLOR["positive-base"],
  },
  Unclear: {
    active: BASE_COLOR["neutral-active"],
    base: BASE_COLOR["neutral-base"],
  },
  "Low Risk": {
    active: BASE_COLOR["negative-active"],
    base: BASE_COLOR["negative-base"],
  },
};

const ClassificationButtons = ({
  selectedValue,
  labels = ["Yes", "No"],
  onClassify,
  onClear,
}: ClassificationButtonsProps) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="text-gray-600 mb-2 text-center">Classification:</div>

      <div className="flex justify-center space-x-4">
        {labels.map((label) => {
          const colors = COLOR_CLASSES[label] || COLOR_CLASSES["MLS"];
          const isActive = selectedValue === label;
          return (
            <button
              key={label}
              onClick={() => onClassify(label)}
              className={`px-6 py-3 rounded-lg transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 shadow-md ${
                isActive ? colors.active : colors.base
              }`}
            >
              {label}
            </button>
          );
        })}
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
