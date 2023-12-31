import fs from "fs";
import { v2 as cloudinary} from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;
        const uploadResponse = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        })
        // console.log(`Cloudinary ${uploadResponse.url} upload completed`);
        // console.log("Cloudinary response ", uploadResponse);
        fs.unlinkSync(localFilePath);
        return uploadResponse;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove locally saved files in error case
        return null;
    }
}

export {uploadOnCloudinary}

