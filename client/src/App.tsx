import { useState } from "react";
import { Loader2 } from "lucide-react";

const ImageUploader = ({
  label,
  onImageSelect,
  selectedImage,
}: {
  label: string;
  onImageSelect: (x: File | null) => void;
  selectedImage: File | null;
}) => {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <label className="w-full">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
          {selectedImage ? (
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Selected"
              className="max-h-64 mx-auto object-contain"
            />
          ) : (
            <div className="text-gray-500">
              <p className="text-lg font-medium mb-2">{label}</p>
              <p className="text-sm">Click to upload or drag and drop</p>
              <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
            </div>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          onChange={(e) => onImageSelect(e.target.files![0])}
          accept="image/*"
        />
      </label>
      {selectedImage && (
        <button
          onClick={() => onImageSelect(null)}
          className="text-red-500 text-sm hover:text-red-700 transition-colors"
        >
          Remove image
        </button>
      )}
    </div>
  );
};

interface Result {
  percentage: number;
  similarity: number;
  executionTimeMs: number;
}

const ResultModal = ({
  result,
  onClose,
}: {
  result: Result | null;
  onClose: () => void;
}) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Comparison Results</h2>
        <div className="space-y-3">
          <p className="text-lg">
            Match Percentage: {result?.percentage?.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-600">
            Similarity Score: {result?.similarity?.toFixed(4)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const ProcessingStatus = ({ status, message }: Record<string, string>) => {
  return (
    <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">{status}</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default function App() {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [queryImage, setQueryImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [jobStatus, setJobStatus] = useState<Record<string, string> | null>(
    null
  );

  const handleCompare = async () => {
    if (!referenceImage || !queryImage) {
      alert("Please select both images");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("reference", referenceImage);
      formData.append("query", queryImage);

      const response = await fetch("http://localhost:3000/compare", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Comparison failed");
      }

      const { jobId } = await response.json();

      // Start polling
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `http://localhost:3000/jobs/${jobId}`
          );
          if (!statusResponse.ok) {
            throw new Error("Failed to fetch job status");
          }

          const jobStatus = await statusResponse.json();

          if (
            jobStatus.status === "completed" ||
            jobStatus.status === "error"
          ) {
            clearInterval(intervalId); // Stop polling

            if (jobStatus.status === "completed") {
              setResult(jobStatus.results);
              setJobStatus(null);
            } else {
              alert("Error: " + jobStatus.message);
              setJobStatus(null);
            }

            setLoading(false);
          } else {
            setJobStatus({
              status: jobStatus.status,
              message: jobStatus.message,
            });
          }
        } catch (error) {
          clearInterval(intervalId); // Stop polling on error
          alert("Error fetching job status: " + (error as Error).message);
          setLoading(false);
        }
      }, 4000); // Poll every 2 seconds
    } catch (error) {
      alert("Error comparing images: " + (error as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Face Comparison Tool
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <ImageUploader
              label="Reference Image"
              onImageSelect={setReferenceImage}
              selectedImage={referenceImage}
            />
          </div>

          <div className="flex-1">
            <ImageUploader
              label="Query Image"
              onImageSelect={setQueryImage}
              selectedImage={queryImage}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleCompare}
            disabled={loading || !referenceImage || !queryImage}
            className="bg-blue-500 text-white px-8 py-3 rounded-lg font-medium 
                     disabled:bg-gray-300 disabled:cursor-not-allowed
                     hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Comparing...
              </>
            ) : (
              "Compare Images"
            )}
          </button>
        </div>

        {jobStatus && (
          <ProcessingStatus
            status={jobStatus.status}
            message={jobStatus.message}
          />
        )}

        <ResultModal result={result} onClose={() => setResult(null)} />
      </div>
    </div>
  );
}
