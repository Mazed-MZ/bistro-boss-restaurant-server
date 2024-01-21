const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use(express.static('resizeImage'));
app.use(fileUpload());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster3.66f5xwc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // const dessertsDish = client.db("BistroBossDB").collection("dessertsCollection");
    const allFoodsMenu = client.db("BistroBossDB").collection("AllfoodsMenuCollection");

    //---->>>> Load All Foods Menu <<<<----
    app.get('/allMenu', async (req, res) => {
      const allFoods = allFoodsMenu.find();
      const result = await allFoods.toArray();
      // console.log(result)
      res.send(result);
    })

    // ---->>> Load all desserts <<<----
    // app.get('/desserts', async (req, res) => {
    //   const allDessert = dessertsDish.find();
    //   const result = await allDessert.toArray();
    //   // console.log(result)
    //   res.send(result);
    // })

    // ---->>>> Load Individual foods <<<<-----
    app.get('/allMenu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allFoodsMenu.findOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Bistro Boss Restaurant Server is running')
})


// ---->>>>> Upload Resize Image <<<<----
app.post('/addDoctor', (req, res) => {
  const file = req.files.file;
  console.log(file);
  file.mv(`${__dirname}/resizeImage/${file.name}`, err => {
    if (err) {
      console.log(err);
      return res.status(500).send({ msg: 'failed to upload image' })
    }
    return res.send({ path: `/${file.name}` })
  })
})

app.listen(port, (req, res) => {
  console.log(`Bistro Boss Restaurant Server is running on ${port}`)
})