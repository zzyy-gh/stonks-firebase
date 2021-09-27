const functions = require("firebase-functions");
var cors = require("cors")({
  origin: true,
});

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const metaRef = db.collection("ticker_meta");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions
//   .runWith({ memory: "128MB", timeoutSeconds: 540 })
//   .https.onRequest((request, response) => {
//     functions.logger.info("Hello logs!", { structuredData: true });
//     response.send("Hello from Firebase!");
//   });

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
// exports.addMessage = functions.https.onRequest(async (req, res) => {
//   // Grab the text parameter.
//   const original = req.query.text;
//   // Push the new message into Firestore using the Firebase Admin SDK.
//   const writeResult = await admin
//     .firestore()
//     .collection("messages")
//     .add({ original: original });
//   // Send back a message that we've successfully written the message
//   res.json({ result: `Message with ID: ${writeResult.id} added.` });
// });

// // Listens for new messages added to /messages/:documentId/original and creates an
// // uppercase version of the message to /messages/:documentId/uppercase
// exports.makeUppercase = functions.firestore
//   .document("/messages/{documentId}")
//   .onCreate((snap, context) => {
//     // Grab the current value of what was written to Firestore.
//     const original = snap.data().original;

//     // Access the parameter `{documentId}` with `context.params`
//     functions.logger.log("Uppercasing", context.params.documentId, original);

//     const uppercase = original.toUpperCase();

//     // You must return a Promise when performing asynchronous tasks inside a Functions such as
//     // writing to Firestore.
//     // Setting an 'uppercase' field in Firestore document returns a Promise.
//     return snap.ref.set({ uppercase }, { merge: true });
//   });

exports.addSrapedMeta = functions
  .runWith({ memory: "512MB", timeoutSeconds: 540 })
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    // Grab the text parameter.
    let data = req.body.data;
    console.log(data.length);

    let structuredData = [];
    let batchArray = [];
    const batchSize = 500;

    if (data.length > 0) {
      for (
        let loop = 0;
        loop < Math.floor((data.length - 1) / batchSize) + 1;
        loop++
      ) {
        structuredData.push([]);
      }
      data.forEach((item, index) => {
        structuredData[Math.floor(index / batchSize)].push(item);
      });
    } else {
      res.json({ result: "No data to be uploaded." });
    }

    data = null;

    structuredData.forEach(async (array) => {
      // Get a new write batch
      let batch = db.batch();

      array.forEach((value) => {
        const ref = db.collection("ticker_meta").doc(value["uuid"]);
        delete value["uuid"];
        batch.set(ref, value);
      });

      batchArray.push(batch);
    });

    for (const batch of batchArray) {
      await batch.commit();
      console.log("Batch upload is successful.");
    }

    // Send back a message that we've successfully written the message
    // res.json({ result: `Data received: ${data}` });
    res.json({ result: "Upload successful." });
  });

exports.addSrapedInfo = functions
  .runWith({ memory: "512MB", timeoutSeconds: 540 })
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    // Grab the text parameter.
    let data = req.body.data;
    console.log(data.length);

    let structuredData = [];
    let batchArray = [];
    const batchSize = 500;

    if (data.length > 0) {
      for (
        let loop = 0;
        loop < Math.floor((data.length - 1) / batchSize) + 1;
        loop++
      ) {
        structuredData.push([]);
      }
      data.forEach((item, index) => {
        structuredData[Math.floor(index / batchSize)].push(item);
      });
    } else {
      res.json({ result: "No data to be uploaded." });
    }

    data = null;

    structuredData.forEach(async (array) => {
      // Get a new write batch
      let batch = db.batch();

      array.forEach((value) => {
        const ref = db.collection("ticker_info").doc(value["tkr"]);
        delete value["tkr"];
        batch.set(ref, value);
      });

      batchArray.push(batch);
    });

    for (const batch of batchArray) {
      await batch.commit();
      console.log("Batch upload is successful.");
    }

    // Send back a message that we've successfully written the message
    // res.json({ result: `Data received: ${data}` });
    res.json({ result: "Upload successful." });
  });

exports.getDateRange = functions
  .runWith({ memory: "512MB", timeoutSeconds: 540 })
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      var latest;
      var earliest;
      const promise1 = await metaRef
        .orderBy("date", "desc")
        .limit(1)
        .get()
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            latest = doc.data();
          });
        });
      const promise2 = await metaRef
        .orderBy("date")
        .limit(1)
        .get()
        .then((snapshot) => {
          snapshot.docs.forEach((doc) => {
            earliest = doc.data();
          });
        });

      Promise.all([promise1, promise2]);

      console.log("latest earliest:", latest["date"], earliest["date"]);
      res.json({ latest: latest["date"], earliest: earliest["date"] });
    });
  });

exports.getPerfData = functions
  .runWith({ memory: "512MB", timeoutSeconds: 540 })
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      var date = parseInt(req.query.date);
      var dayLs = [];
      var weekLs = [];
      var monthLs = [];
      const dayc = "dayc";
      const weekc = "weekc";
      const monc = "monc";
      const dayLimit = 5;
      const wkLimit = 5;
      const monLimit = 20;

      const retrieve = async (period, limit) => {
        list = [];
        await metaRef
          .where("date", "==", date)
          .orderBy(String(period), "desc")
          .limit(parseInt(limit))
          .get()
          .then((snapshot) => {
            snapshot.docs.forEach((doc) => {
              data = doc.data();
              data["uuid"] = doc.id;
              list.push(data);
            });
          });
        return list;
      };

      const promise = await Promise.all([
        await retrieve(dayc, dayLimit),
        await retrieve(weekc, wkLimit),
        await retrieve(monc, monLimit),
      ]);

      dayLs = promise[0];
      weekLs = promise[1];
      monthLs = promise[2];

      console.log("length:", dayLs.length, weekLs.length, monthLs.length);
      res.json({ day: dayLs, week: weekLs, month: monthLs });
    });
  });
