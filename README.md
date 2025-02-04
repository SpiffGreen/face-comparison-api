# Face Comparison API

A Node.js Express server that provides face comparison capabilities using face-api.js. This API allows you to compare two face images and determine their similarity using facial recognition technology.

## Features

- Face detection and comparison using face-api.js
- Support for multiple face detection models
- Performance measurement for each comparison
- Detailed response including face detection boxes and landmarks
- Built-in error handling and validation
- File size limits and security measures

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- The following models from face-api.js (to be placed in a `models` directory):
  - ssdMobilenetv1
  - tinyFaceDetector
  - faceLandmark68Net
  - faceRecognitionNet
  - faceExpressionNet

## Installation

1. Clone the repository:
```bash
git clone https://github.com/spiffgreen/face-comparison-api.git
cd face-comparison-api
```

2. Install dependencies:
```bash
npm install
```


5. Run application server:
```bash
node index.js
```

## Project Structure

```
├── README.md
├── images
│   ├── query.png
│   └── reference.png
├── index.js
├── models
│   ├── age_gender_model-shard1
│   ├── age_gender_model-weights_manifest.json
│   ├── face_expression_model-shard1
│   ├── face_expression_model-weights_manifest.json
│   ├── face_landmark_68_model-shard1
│   ├── face_landmark_68_model-weights_manifest.json
│   ├── face_landmark_68_tiny_model-shard1
│   ├── face_landmark_68_tiny_model-weights_manifest.json
│   ├── face_recognition_model-shard1
│   ├── face_recognition_model-shard2
│   ├── face_recognition_model-weights_manifest.json
│   ├── mtcnn_model-shard1
│   ├── mtcnn_model-weights_manifest.json
│   ├── ssd_mobilenetv1_model-shard1
│   ├── ssd_mobilenetv1_model-shard2
│   ├── ssd_mobilenetv1_model-weights_manifest.json
│   ├── tiny_face_detector_model-shard1
│   └── tiny_face_detector_model-weights_manifest.json
├── package-lock.json
├── package.json
└── script.js
```

## Configuration

The server can be configured using environment variables:

- `PORT`: Server port (default: 3000)
- Other configuration options can be modified in the server code:
  - `minConfidence`: Minimum confidence threshold for face detection
  - `inputSize`: Input size for the TinyFaceDetector
  - `scoreThreshold`: Score threshold for the TinyFaceDetector
  - File upload limits (currently set to 5MB)

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Face Comparison
```
POST /compare
```
Compares two face images and returns similarity metrics.

#### Request
- Content-Type: `multipart/form-data`
- Body:
  - `reference`: First image file
  - `query`: Second image file

#### Response
```json
{
  "similarity": 0.5,
  "percentage": 50,
  "executionTimeMs": 1234,
  "referenceDetection": {
    "box": {
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100
    },
    "landmarks": [/* array of facial landmark positions */]
  },
  "queryDetection": {
    "box": {/* ... */},
    "landmarks": [/* ... */]
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400`: Bad Request (missing files, no faces detected)
- `500`: Server Error (processing error)

## Example Usage

Using fetch in TypeScript:

```typescript
async function compareFaces(referenceFile: File, queryFile: File) {
  const formData = new FormData();
  formData.append('reference', referenceFile);
  formData.append('query', queryFile);

  const response = await fetch('http://localhost:3000/compare', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  return result;
}
```

## Performance

The API includes performance measurement for each comparison operation. The execution time is returned in the response as `executionTimeMs`.

## Security Considerations

- File upload size is limited to 5MB
- Files are stored in memory and not written to disk
- Basic input validation is implemented
- No external image URLs are accepted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Contact

Spiff Jekey-Green, <spiffjekeygreen[at]gmail[dot]com>