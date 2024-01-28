const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use(express.static('resizeImage'));
app.use(fileUpload());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  //bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCES_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next()
  })
}


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
    const cartCollection = client.db("BistroBossDB").collection("cartCollection");
    const userCollection = client.db("BistroBossDB").collection("userCollection");



    //---->>> create JWT token for secure server url <<<----
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCES_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })


    //------>>>> create verifyAdmin function <<<<----
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden access'});
      }
      next()
    }

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

    //----->>>> Create User Data <<<<-----
    app.post('/signinuser', async (req, res) => {
      const file = req.files.file;
      const displayName = req.body.name;
      const email = req.body.email;
      const password = req.body.password;
      const photoURL = `http://localhost:5000/${file.name}`;
      // console.log(file, name, email, password, photoURL);
      const newUser = { displayName, email, password, photoURL };

      file.mv(`${__dirname}/resizeImage/${file.name}`, err => {
        if (err) {
          console.log(err);
          return res.status(500).send({ msg: 'failed to upload image' })
        }
      })

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    app.post('/loginuser', async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      console.log('existing user', existingUser);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    // ---->>>> create google user in mongodb <<<----
    app.post('/googleuser', async (req, res) => {
      const displayName = req.body.displayName;
      const email = req.body.email;
      const photoURL = req.body.photoURL;
      const googleUser = { displayName, email, photoURL };
      console.log(googleUser);
      const query = { email: googleUser.email }
      const existingUser = await userCollection.findOne(query);
      console.log('existing user', existingUser);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(googleUser);
      res.send(result);
    })

    //---->>>> load all user data <<<<----
    app.get('/user',verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      console.log(result)
      res.send(result);
    })


    //---->>>> Delete user <<<<-----
    app.delete('/carts/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    //---->>> Make Admin for any user <<<---
    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    //=====>>>> Check admin <<<<=====
    app.get('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    })


    //------>>>> Create User Cart Data <<<<----
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    //----->>>> Load User Cart Data <<<<-----
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    // ------>>> Delete Cart item <<<------
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
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