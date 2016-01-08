"use strict";
var config = require("./config");
var ContribCat = require("./lib");
var contribCat = new ContribCat(config);
contribCat.run().then(function (results) {
	console.log(results);
});

