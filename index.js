import express from "express";
import multer from "multer";
import faceapi from "face-api.js";
import path from "path";
import canvas from "canvas";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());

// Store jobs in memory (consider using Redis in production)
const jobs = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Initialize face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Face detection configuration
const faceDetectionNet = faceapi.nets.ssdMobilenetv1;
const minConfidence = 0.5;
const inputSize = 408;
const scoreThreshold = 0.5;

function getFaceDetectorOptions(net) {
  return net === faceapi.nets.ssdMobilenetv1
    ? new faceapi.SsdMobilenetv1Options({ minConfidence })
    : new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
}

// Initialize models
async function initializeModels() {
  const modelsPath = path.join(process.cwd(), "models");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
    faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath),
    faceapi.nets.faceExpressionNet.loadFromDisk(modelsPath),
  ]);
  console.log("Models loaded successfully");
}

// Process face comparison
async function processFaceComparison(jobId, referenceBuffer, queryBuffer) {
  try {
    // Update job status
    updateJobStatus(jobId, "loading_images", "Loading images...");

    const referenceImg = await canvas.loadImage(referenceBuffer);
    const queryImg = await canvas.loadImage(queryBuffer);

    updateJobStatus(jobId, "detecting_faces", "Detecting faces...");

    const faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet);

    const idDetection = await faceapi
      .detectSingleFace(referenceImg, faceDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    const selfieDetection = await faceapi
      .detectSingleFace(queryImg, faceDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!idDetection || !selfieDetection) {
      updateJobStatus(
        jobId,
        "error",
        "Could not detect faces in one or both images"
      );
      return;
    }

    updateJobStatus(jobId, "comparing", "Comparing faces...");

    const distance = faceapi.euclideanDistance(
      idDetection.descriptor,
      selfieDetection.descriptor
    );

    // Complete job with results
    updateJobStatus(jobId, "completed", "Comparison completed", {
      percentage: (1 - distance) * 100,
      similarity: distance,
    });
  } catch (error) {
    console.error("Error processing images:", error);
    updateJobStatus(jobId, "error", error.message);
  }
}

function updateJobStatus(jobId, status, message, results = null) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    job.message = message;
    job.results = results;
    job.updatedAt = new Date();

    // Clean up completed or errored jobs after 5 minutes
    if (status === "completed" || status === "error") {
      setTimeout(() => {
        jobs.delete(jobId);
      }, 5 * 60 * 1000);
    }
  }
}

// API endpoints
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/compare",
  upload.fields([
    { name: "reference", maxCount: 1 },
    { name: "query", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (
        !req.files ||
        !("reference" in req.files) ||
        !("query" in req.files)
      ) {
        return res
          .status(400)
          .json({ error: "Both reference and query images are required" });
      }

      const files = req.files;
      const jobId = randomUUID();

      // Create job
      jobs.set(jobId, {
        id: jobId,
        status: "pending",
        message: "Job created",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Process images asynchronously
      processFaceComparison(
        jobId,
        files.reference[0].buffer,
        files.query[0].buffer
      );

      console.log("JobID:", jobId);

      // Return job ID immediately
      res.json({ jobId });
    } catch (error) {
      console.error("Error initiating job:", error);
      res.status(500).json({
        error: "Error initiating job",
        details: error.message,
      });
    }
  }
);

// Get job status endpoint (optional, since we're using WebSocket)
app.get("/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (job) {
    res.json(job);
  } else {
    res.status(404).json({ error: "Job not found" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeModels();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
