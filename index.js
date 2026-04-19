const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
// dotenv.config();
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.febqytm.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.userId = decoded.userId;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const expensesCollection = client
      .db("expenseTrackerApp")
      .collection("expenses");
    const usersCollection = client.db("expenseTrackerApp").collection("users");

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        if (!user.email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const existingUser = await usersCollection.findOne({
          email: user.email,
        });
        if (existingUser) {
          return res.status(400).send({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(user.password, 12);
        const newUser = {
          name: user.name,
          email: user.email,
          password: hashedPassword,
        };

        const result = await usersCollection.insertOne(newUser);
        res.send({ message: "User created successfully" });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to create user", error: error.message });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res
            .status(400)
            .send({ message: "Email and password are required" });
        }

        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(400).send({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(400).send({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        const loggedInUser = {
          name: user.name,
          email: user.email,
        };

        res.send({ message: "Login successful", token, user: loggedInUser });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to login", error: error.message });
      }
    });

    app.post("/expenses", verifyToken, async (req, res) => {
      try {
        const expense = req.body;
        const newExpense = {
          ...expense,
          userId: req.userId,
        };
        const result = await expensesCollection.insertOne(newExpense);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to add expense", error: error.message });
      }
    });

    app.get("/expenses", verifyToken, async (req, res) => {
      try {
        const expenses = await expensesCollection.find({ userId: req.userId }).toArray();
        res.send(expenses);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch expenses", error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Expenses Tracker app server is running ");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
