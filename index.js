const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const expensesCollection = client
      .db("expenseTrackerApp")
      .collection("expenses");

    app.post("/expenses", async (req, res) => {
      try {
        const expense = req.body;
        const result = await expensesCollection.insertOne(expense);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to add expense", error: error.message });
      }
    });

    app.get("/expenses", async (req, res) => {
      try {
        const expenses = await expensesCollection.find().toArray();
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

app.listen(port,"0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
