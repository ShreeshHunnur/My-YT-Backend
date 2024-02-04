import dotenv from "dotenv"
import connectDB from "./db/index.js"

dotenv.config({
    path: "./env"
})

connectDB()
.then( () => {
    app.on("error", (error) => {
        console.log("ERRR: ",error);
        throw error
    })

    app.listen(process.env.PORT || 8000 , () => {
        console.log(`The Server is running on port ${process.env.PORT} `);
    })
})
.catch( (err) => {
    console.log("MongoDB connection error: ",err)
})
