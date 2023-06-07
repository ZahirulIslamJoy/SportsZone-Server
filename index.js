const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

console.log(process.env.DB_USER)

const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tzxjncj.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {

    const userCollection=client.db("playzone").collection("users");


    //get all of the users
    app.get("/users",async(req,res)=>{
        const result =await userCollection.find().toArray();
        res.send(result);
    })
    
    //store user info in the database
    app.put("/users",async (req,res)=>{
        const userInfo=req.body;
        const query={email : userInfo.email}
        const options = { upsert: true };
        const updateDoc = {
        $set: userInfo
        };
        const result=await userCollection.updateOne(query,updateDoc,options);
        res.send(result);
    })
      
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
