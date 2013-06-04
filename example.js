(function () {
  "use strict";

  // require
  var fs = require("fs");
  var ejson = require("./ejson.js");

  var contents = fs.readFileSync("example.ejson").toString();
  var contentsT = ejson.transform(contents);

  var json;
  try {
    json = JSON.parse(contents);
  } catch (e) {
    console.error("Expected json error: ", e);
  }

  try {
    json = JSON.parse(contentsT);
  } catch (e) {
    console.error(e);
  }

  console.log(contentsT);
  console.log(json);
}());
