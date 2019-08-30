const MongoClient = require('mongodb').MongoClient;

let db;

module.exports = {
  connectToServer: (callback) => {
    MongoClient.connect(process.env.DB_URL, {useNewUrlParser: true, useUnifiedTopology: true}, ( err, client ) => {
      db = client.db('tf2frags');
      return callback(err);
    });
  },

  getDb: () => {
    return db;
  },
};
