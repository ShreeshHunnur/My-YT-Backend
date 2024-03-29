import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while creating access and refresh tokens")
    }
}

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

const loginUser = asyncHandler(async (req,res) => {
    // req.body -> data
    // validate gor username or email
    // find the user
    // check password
    // accss token and refresh token
    // send cookies
    //return response

    const {username , email , password} = req.body

    if( !(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(!existedUser){
        throw new ApiError(404,"User doesnot exist")
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials ")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(existedUser._id)

    //currently we have the reference of the user in which the refresh token field has not been updated. so we can either the update the current object or make a new DB query

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken") 

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged-in successfully"
        )
    )

})

const logoutUser = asyncHandler( async (req,res) => {
    // clear all the cookies
    // refresh the access and refresh tokens
    //make a middleware to get user access in req

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async(req,res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
   }
   
   try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
 
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401,"Invalid refresh token")
    }
 
    if(incomingRefreshToken !== user.refreshToken){
     throw new ApiError(401,"Invalid refresh token")
    }
 
    const options = {
     httpOnly:true,
     secure:true
    }
    const {accessToken,newRefreshToken}  = generateAccessAndRefreshTokens(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(new ApiResponse(
     200,
     {
         accessToken,
         refreshToken: newRefreshToken
     },
     "Access Token refreshed"
    ))
   } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Refresh Token")
   }


})

const updateCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword,confirmPassword} = req.body
    if(newPassword !==confirmPassword){
        throw new ApiError(400,"Invalid new password")
    }

    const user = await User.findById(req.user?._id);

    const isPassCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPassCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changes successfully"))

})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "Current user fetched Successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const{fullName,email} = req.body

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
        ).select("-password -refreshToken")

        return res
        .status(200)
        .json(new ApiResponse(200,user,"Account detials updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath){
        new ApiError(400,"Avatar files missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,"Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }
            },
            {new: true}
        ).select("-password -refreshToken")
    
        return res
        .status(200)
        .json(new ApiResponse(200,user,"Avatar Image updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image to be updated not found")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(500,"Failed to upload Cover Image on cloudinary")
    }

    const user = await User.findByIdAndDelete(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }
            },
            {new:true}
        ).select("-password -refreshToken")
    
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: _id,
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: _id,
                foreignField: "subscriber",
                as: "subscribedTo"               
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in:[req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                isSubscribed: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    if(!channel.length){
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) => {    
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    
    res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully"));
})


export {registerUser , loginUser , logoutUser,refreshAccessToken,getCurrentUser,updateCurrentPassword,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory }