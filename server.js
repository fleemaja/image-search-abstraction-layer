var express = require('express');
var mongo = require('mongodb');
var Search = require('bing.search');

var app = express();

var path = process.cwd();
var port = process.env.PORT || 8080;

mongo.MongoClient.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/image-search-abstraction', function(err, db) {
  if (err) {
    throw new Error('Database failed to connect!');
  } else {
    console.log('Successfully connected to MongoDB on port 27017.');
  }
  
  db.createCollection("queries", {
    capped: true,
    size: 10000,
    max: 10
  });
  
  function save(obj, db) {
    var queries = db.collection('queries');
    queries.save(obj, function(err, result) {
      if (err) throw err;
      console.log('Successfully saved ' + result);
    });
  }
  
  app.set('view engine', 'jade');
  
  app.get("/", function(request, response) {
      response.render('index');
  });
  
  app.get("/latest", function(request, response) {
    var queries = db.collection("queries");
    queries.find({}, { searchQuery: 1, date: 1, _id: 0 }).sort({_id:-1}).toArray(function(err, result) {
      if (err) throw err;
      if (result) {
        response.send(result);
      } else {
        response.send("No queries in database");
      }
    });
  });
  
  app.get("/imagesearch/:query", function(request, response) {
      var query = request.params.query;
      var size = request.query.offset || 10;
      var search = new Search(process.env.API_KEY);
      
      var queryObj = {
        "searchQuery": query,
        "date": new Date().toLocaleString()
      };
      save(queryObj, db);
      
      
    search.images(query, {
        top: size
      },
      function(err, results) {
        if (err) throw err;
        response.send(results.map(function(img) {
            return {
                "url": img.url,
                "snippet": img.title,
                "thumbnail": img.thumbnail.url,
                "context": img.sourceUrl
            };
        }));
      }
    );
  });
  
  app.listen(port);
})