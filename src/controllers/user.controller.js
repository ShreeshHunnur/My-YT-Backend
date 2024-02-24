import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async(req,res) => {
    // get user details from frontend
    // validation - not empty, valid or not etc
    // check if user already exist: check via username or email
    // check for images,check for avatar
    // upload them to cloudinary, again avtar check
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response



    const { username, fullName , password , email } = req.body;

    //now for validation
    //we have two ways one is simple if-else-if

    // if(username === ""){
    //     throw new ApiError(400,"Full name is required")
    // }

    //otherwise we can use some method which will return true if any one of the field has any error

    if(
        [username, fullName , password , email].some( (field) => 
        field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }


    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    console.log(existedUser);

    if(existedUser){
        throw new ApiError(409 ,"User with same username or email already exists")
    }
    

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken") //select is used to select specific fields inside user. If - sign is placed in from of the name it will remove the those fields from response

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
       new ApiResponse(200, createdUser , "User registered successfully")
    )

} )




export {registerUser}