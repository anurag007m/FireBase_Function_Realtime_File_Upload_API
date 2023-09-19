const functions = require("firebase-functions");
const { Storage } = require("@google-cloud/storage");
const UUID = require("uuid-v4");
const express = require("express");
const formidable = require("formidable-serverless");


const app = express();
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

var admin = require("firebase-admin");


var serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://testchat-5b3a8-default-rtdb.firebaseio.com/", 

});

// const userRef = admin.firestore().collection("users");

const db = admin.database();
const usersRef = db.ref("users");

const storage = new Storage({
  keyFilename: "admin.json",
});

app.post("/creatUser", async (req, res) => {
  const form = new formidable.IncomingForm({ multiples: true });

  try {
    form.parse(req, async (err, fields, files) => {
      let uuid = UUID();
      var downLoadPath =
        "https://firebasestorage.googleapis.com/v0/b/testchat-5b3a8.appspot.com/o/";

      const profileImage = files.profileImage;

      // url of the uploaded image
      let imageUrl;

    //   const docID = userRef.doc().id;

    const docID = usersRef.push().key;

      if (err) {
        return res.status(400).json({
          message: "There was an error parsing the files",
          data: {},
          error: err,
        });
      }
      const bucket = storage.bucket("gs://testchat-5b3a8.appspot.com");

      if (profileImage.size == 0) {
        // do nothing
      } else {
        const imageResponse = await bucket.upload(profileImage.path, {
          destination: `users/${profileImage.name}`,
          resumable: true,
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: uuid,
            },
          },
        });
        // profile image url
        imageUrl =
          downLoadPath +
          encodeURIComponent(imageResponse[0].name) +
          "?alt=media&token=" +
          uuid;
      }
      // object to send to database
      const userModel = {
        id: docID,
        name: fields.name,
        email: fields.email,
        age: fields.age,
        profileImage: profileImage.size == 0 ? "" : imageUrl,
      };

    //   await userRef
    //     .doc(docID)
    //     .set(userModel, { merge: true })
    //     .then((value) => {
    //       // return response to users
    //       res.status(200).send({
    //         message: "user created successfully",
    //         data: userModel,
    //         error: {},
    //       });
    //     });

    await usersRef.child(docID).set(userModel);
    res.status(200).json({
        message: "User created successfully",
        data: userModel,
        error: {},
      });
    });
  } catch (err) {
    res.send({
      message: "Something went wrong",
      data: {},
      error: err,
    });
  }
});

// app.get("/getUsers", async (req, res, next) => {
//   await userRef.get().then((value) => {
//     const data = value.docs.map((doc) => doc.data());
//     res.status(200).send({
//       message: "Fetched all users",
//       data: data,
//     });
//   });
// });

// app.get("/getUser/:id", async (req, res, next) => {
//   await userRef
//     .where("id", "==", req.params.id)
//     .get()
//     .then((value) => {
//       const data = value.docs.map((doc) => doc.data());
//       res.status(200).send({
//         message: "User retrieved ",
//         data: data,
//       });
//     });
// });


app.get("/getUsers", async (req, res) => {
    try {
      const dataSnapshot = await usersRef.once("value");
      const data = dataSnapshot.val();
      
      res.status(200).json({
        message: "Fetched all users",
        data: data,
      });
    } catch (err) {
      res.status(500).json({
        message: "Something went wrong",
        data: {},
        error: err,
      });
    }
  });
  
  app.get("/getUser/:id", async (req, res) => {
    try {
      const userID = req.params.id;
      const dataSnapshot = await usersRef.child(userID).once("value");
      const userData = dataSnapshot.val();
      
      if (userData) {
        res.status(200).json({
          message: "User retrieved",
          data: userData,
        });
      } else {
        res.status(404).json({
          message: "User not found",
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Something went wrong",
        data: {},
        error: err,
      });
    }
  });


exports.api = functions.https.onRequest(app);