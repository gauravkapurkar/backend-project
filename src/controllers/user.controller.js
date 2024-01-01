import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options ={
    httpOnly:true,
    secure:true,
}

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
}

const registerUser = asyncHandler( async(req, res)=>{
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

    const existedUser = await User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser){
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
        username: username.toLowerCase(),
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

const loginUser = asyncHandler(async(req, res)=> {
    //req body
    //username or email
    //find user
    //password check
    //create accessToken & refreshToken
    //send cookies

    const {email, username, password} = req.body;
    console.log(req.body);

    if(!(username || email)){
        throw new ApiError(400, "username or email is required");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!existedUser){
        throw new ApiError(404, "User not exists");
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(existedUser._id);

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken");

    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(new ApiResponse(200,
        {
            user : loggedInUser, accessToken, refreshToken
        },
        "User login success"
    ))

});

const logoutUser = asyncHandler(async(req, res) => {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, 
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new:true
        }
    )

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "User logout"))
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refresh token or expired");
        }
    
        const { accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, refreshToken},
                "Access token refresh success"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}