let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://127.0.0.1:27017/fit2101_lms";
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});