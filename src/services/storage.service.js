import ImageKit from "imagekit";
import { v4 as uuidv4 } from "uuid";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function uploadFile(file, fileName, folder = "/DigitalHat") {
  try {
    const res = await imagekit.upload({
      file,
      fileName: fileName || `${uuidv4()}.jpg`,
      folder,
    });

    return {
      url: res.url,
      thumbnail: res.thumbnailUrl || res.url,
      id: res.fileId,
    };
  } catch (error) {
    console.error("Image upload failed:", error);
    throw new Error("Image upload failed");
  }
}

export default uploadFile