const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization)
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "Unauthorized Access" });
    }
    // console.log("the user is going to be verified")
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tzxjncj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const userCollection = client.db("playzone").collection("users");
    const classCollection = client.db("playzone").collection("addedClasses");
    const selectedClassCollection = client
      .db("playzone")
      .collection("selectedClass");
      const paymentCollection = client.db("playzone").collection("payments");
    //middlewares
    //admin verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      console.log(user)
      if (user?.role != "admin") {
        return req
          .status(401)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    //Instructor  verify
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role != "instructor") {
        return req
          .status(401)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    //student  verify
    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role != "student") {
        return req
          .status(401)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    //get all of the users //jwt //admin verify //complete verify
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      console.log(req.decoded);
      const jwtEmail = req.decoded.email;
      console.log(jwtEmail)
      if (!email) {
        return res.send([]);
      }
      if (jwtEmail !== email) {
        return res
          .status(401)
          .send({ error: true, message: "Forbidden Access" });
      }
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //store user info in the database //no verify needed
    app.put("/users", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: userInfo,
      };
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    //update role of the user admin or instructors //jwt //admin verify
    app.patch("/users/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const data = req.body;
      const updatedRole = data.role;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: updatedRole,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //checking a user admin or not //jwt verify
    app.get("/users/admin/:email",verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded);
      const decodeEmail = req.decoded.email;
      if (email !== decodeEmail) {
        res.send({ admin: "false" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role == "admin" };
      res.send(result);
    });

    //checking a user instructor or not //jwt verify
    app.get("/users/instructor/:email",verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodeEmail = req.decoded.email;
      if (email !== decodeEmail) {
        res.send({ instructor: "false" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role == "instructor" };
      res.send(result);
    });

    //checking a user student or not //jwt verify
    app.get("/users/student/:email",verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodeEmail = req.decoded.email;
      if (email !== decodeEmail) {
        res.send({ student: "false" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { student: user?.role == "student" };
      res.send(result);
    });

    //post method of the jwt token
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //getting all the classes added by the instructor //verifyjwt //verifyAdmin
    app.get("/allclasses", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //sending data of addaded class of an instructors //verifyJwt //verify Instructors
    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result);
    });

    //getting classes for a instrucctor //verifyinstructor //verifyJwt

    app.get(
      "/classes/:email",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.params.email;
        const query = { instructorEmail: email };
        const result = await classCollection.find(query).toArray();
        res.send(result);
      }
    );

    //update status approve or deny //jwt //admin
    app.patch("/classes/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const data = req.body;
      const updatedStatus = data.status;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updatedStatus,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //sending feedback to the to the instructors from admin //jwt //admin
    app.patch("/class/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //update class data by instructor //jwt //verifyinstructor
    app.patch(
      "/updateclass/:id",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const specificIdData = await classCollection.findOne(query);
        const previousClassName = specificIdData.className;
        const previousSeats = specificIdData.seats;
        const previousPrice = specificIdData.price;

        let className = data.className;
        let price = data.price;
        let seats = data.seats;
        if (className == "") {
          className = previousClassName;
        }

        if (price == "") {
          price = previousPrice;
        }
        if (seats == "") {
          seats = previousSeats;
        }
        const updateDoc = {
          $set: {
            className: className,
            price: price,
            seats: seats,
          },
        };
        const result = await classCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    //get the approved classes from the database //open api
    app.get("/verifiedclass", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //getting all the instructor  //open api
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    //sending data of selected class by student //jwt //verifyStudent
    app.post("/selectedClass", verifyJWT,verifyStudent, async (req, res) => {
      const selectedClassInfo = req.body;
      const result = await selectedClassCollection.insertOne(selectedClassInfo);
      //testing
      res.send(result);
    });

    //get selectedclass info of a specific user //jwt //verifyStudent
    app.get(
      "/selectedClass/:email",
      verifyJWT,
      verifyStudent,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await selectedClassCollection.find(query).toArray();
        res.send(result);
      }
    );

    //delete a user specific selected class //jwt //verifyStudent
    app.delete(
      "/selectedClass/:id",
      verifyJWT,
      verifyStudent,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await selectedClassCollection.deleteOne(query);
        res.send(result);
      }
    );

    //stripe payment intent api //jwt //verify student
    app.post("/create-payment-intent", verifyJWT,verifyStudent, async (req, res) => {
      const { payAmount } = req.body;
      const amount = parseInt(payAmount * 100);
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // //payment //verifyJwt //verifyStudent //add payment database //delete myselected class //update seats //update enrollment
    app.post("/payments",verifyJWT,verifyStudent, async (req, res) => {
      const paymentInfo = req.body;
      const id=req.body.selectedclassId;
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      const query={_id: new ObjectId(id)}
      const selectedClassResult = await selectedClassCollection.deleteOne(query);
      const classId=req.body.classId;
      const classQuery={_id: new ObjectId(classId)}
      const classResult=await classCollection.findOne(classQuery);
      const seats =classResult.seats;
      const newSeats=seats-1;
      const enrolled=classResult.enrolled;
      const newEnrolled=enrolled+1;
      const updateDoc = {
        $set: {
          seats:newSeats,
          enrolled:newEnrolled,
        },
      }
      const modifiedClassResult = await classCollection.updateOne(classQuery, updateDoc);
      res.send({ paymentResult,selectedClassResult, modifiedClassResult });
    });

    //Enrolled class of a specific student //jwt //verifyAdmin
    app.get(
      "/payment/:email",verifyJWT,verifyStudent,async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
        res.send(result);
      }
    );

    //popular class based on enrollment //open api
      app.get("/popularclass",async(req,res)=>{
        const query={
          status:"approved"
        }
        const result = await classCollection.find(query).sort({ 
          enrolled: -1 }).limit(6).toArray();
          res.send(result);
      })


      //

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
