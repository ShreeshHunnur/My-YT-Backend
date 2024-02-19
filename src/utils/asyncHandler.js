const asyncHandler = (requestHandler) => {
    return (req ,res,next) => {
        Promise.resolve(requestHandler(req , res , next)).catch((error) => next(error))
    }
}


export { asyncHandler }

























//One another method to write asyncHandler using Try Catch- Both can be used

// const asyncHandler  = (fn) => async (req,res,next) => {
//     try {
//         await fn(req , res, next)
//     } catch (error) {
//         res.error(error.code || 500).json({
//             success:true,
//             message: error.message
//         })
//     }
// }