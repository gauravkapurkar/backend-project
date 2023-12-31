import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res)=>{
    //get user details
    //validation of data
    //check if user exists using usrename or email
    //check for images, check for avatar
    //if images available upload them to cloudinary
    //create user object - create entry in db
    //remove password & refreshToken from response
    //check for user creation
    //return res

    const {username, email, fullName, password} = req.body;
    // console.log("Request body ",req.body);

    if([username, email, fullName, password].some((field)=> field?.trim() === "")){
       throw new ApiError(400, "All fields are required");
    }

    const existerUser = await User.findOne({
        $or : [{username}, {email}]
    })

    if(existerUser){
        throw new ApiError(409, "User already exists");
    }

    // console.log("Request files ", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        username: username.toLowercase(),
        email,
        password,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "User registration failed");
    }

    return res.status(201).json( 
        new ApiResponse(201, createdUser, "User register successfully")
    );


});

export {registerUser}