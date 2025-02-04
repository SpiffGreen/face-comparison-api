import express from "express";
import multer from "multer";
import faceapi from "face-api.js";
import path from "path";
import canvas from "canvas";
import { performance } from "perf_hooks";

const app = express();
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Face comparison endpoint
app.post(
  "/compare",
  upload.fields([
    { name: "reference", maxCount: 1 },
    { name: "query", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const startTime = performance.now();

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

      // Load images from buffers
      const referenceImg = await canvas.loadImage(files.reference[0].buffer);
      const queryImg = await canvas.loadImage(files.query[0].buffer);

      const faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet);

      // Detect faces and get descriptors
      const idDetection = await faceapi
        .detectSingleFace(referenceImg, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(queryImg, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!idDetection || !selfieDetection) {
        return res.status(400).json({
          error: "Could not detect faces in one or both images",
        });
      }

      const distance = faceapi.euclideanDistance(
        idDetection.descriptor,
        selfieDetection.descriptor
      );

      const endTime = performance.now();

      console.log({
        similarity: distance,
        percentage: (1 - distance) * 100,
        executionTimeMs: endTime - startTime,
      });

      res.json({
        similarity: distance,
        percentage: (1 - distance) * 100,
        executionTimeMs: endTime - startTime,
        referenceDetection: {
          box: idDetection.detection.box,
          landmarks: idDetection.landmarks.positions,
        },
        queryDetection: {
          box: selfieDetection.detection.box,
          landmarks: selfieDetection.landmarks.positions,
        },
      });
    } catch (error) {
      console.error("Error processing images:", error);
      res.status(500).json({
        error: "Error processing images",
        details: error.message,
      });
    }
  }
);

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
