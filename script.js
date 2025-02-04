import faceapi from "face-api.js";
import path from "path";
import canvas from "canvas";

// Take performance stats
console.time("CompareImages");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load models
const modelsPath = path.join(process.cwd(), "models");
await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
await faceapi.nets.faceExpressionNet.loadFromDisk(modelsPath);

const faceDetectionNet = faceapi.nets.ssdMobilenetv1;

// SsdMobilenetv1Options
const minConfidence = 0.5;

// TinyFaceDetectorOptions
const inputSize = 408;
const scoreThreshold = 0.5;

function getFaceDetectorOptions(net) {
  return net === faceapi.nets.ssdMobilenetv1
    ? new faceapi.SsdMobilenetv1Options({ minConfidence })
    : new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
}

const faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet);

// Load images
const referenceImg = await canvas.loadImage(
  path.join(process.cwd(), "images", "reference.png")
);
const queryImg = await canvas.loadImage(
  path.join(process.cwd(), "images", "query.png")
);

const idDetection = await faceapi
  .detectSingleFace(referenceImg, faceDetectionOptions)
  .withFaceLandmarks()
  .withFaceDescriptor();

const selfieDetection = await faceapi
  .detectSingleFace(queryImg, faceDetectionOptions)
  .withFaceLandmarks()
  .withFaceDescriptor();

if (idDetection && selfieDetection) {
  const distance = faceapi.euclideanDistance(
    idDetection.descriptor,
    selfieDetection.descriptor
  );
  console.log(`Similarity: ${distance}`);
  console.log(`Percentage: ${(1 - distance) * 100}%`);
}

console.timeEnd("CompareImages");

// const faceMatcher = new faceapi.FaceMatcher(resultsRef);
