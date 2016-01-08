"use strict";
var config = require("./config");
var mongoose = require('mongoose');
var ContribCat = require("./lib");
var contribCat = new ContribCat(config);

mongoose.connect("mongodb://localhost/contribcat");

contribCat.run().then(function (results) {
	console.log(results);
}).finally(function () {
	mongoose.disconnect();
});

