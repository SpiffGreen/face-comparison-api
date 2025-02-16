import "dotenv/config";
import {
  RekognitionClient,
  CompareFacesCommand,
} from "@aws-sdk/client-rekognition";
import fsProm from "fs/promises";
import path from "path";

const client = new RekognitionClient({
  region: "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

async function main() {
  try {
    const image1 = await fsProm.readFile(
      path.join(process.cwd(), "images", "query.png")
    );
    const image2 = await fsProm.readFile(
      path.join(process.cwd(), "images", "reference.png")
    );
    console.time('CompareFaces')
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: image1 },
      TargetImage: { Bytes: image2 },
    });
    const data = await client.send(command);
    console.timeEnd('CompareFaces')
    console.log("Face comparison results:", data.FaceMatches);
  } catch (error) {
    // error handling.
    console.log(error);
  }
}

main();
