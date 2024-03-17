import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, updateCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refresh-access-token").post(verifyJWT,refreshAccessToken)

router.route("/update-password").post(verifyJWT,updateCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/account-details").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"),updateUserAvatar)

router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/watchHistory").get(verifyJWT,getWatchHistory)


export default router