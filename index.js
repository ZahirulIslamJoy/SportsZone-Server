const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
var jwt = require('jsonwebtoken');

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

    //update role of the user admin or instructors
    app.patch("/users/:id",async(req,res)=>{
        const data=req.body;
        const updatedRole=data.role;
        const id=req.params.id;
        const query={_id : new ObjectId(id)}
        const updateDoc = {
            $set: {
                role:updatedRole
            }
        };
        const result=await userCollection.updateOne(query,updateDoc);
        res.send(result);
    })

    //checking a user admin or not
    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await userCollection.findOne(query);
        const result = { admin: user?.role == 'admin' }
        res.send(result);
      })

      //checking a user instructor or not
      app.get('/users/instructor/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await userCollection.findOne(query);
        const result = { instructor: user?.role == 'instructor' }
        res.send(result);
      })

      //post method of the jwt token
      app.post("/jwt",(req,res)=>{
          const email=req.body;
          const token = jwt.sign(email, process.env.ACCESS_TOKEN,{
            expiresIn:"1h",
          })
          res.send({token})
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
