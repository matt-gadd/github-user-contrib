"use strict";
var config = require("./config");
var mongoose = require('mongoose');
var ContribCat = require("./lib");
var contribCat = new ContribCat(config);


console.log("Started Load");
contribCat.load()
	.then(contribCat.sync.bind(contribCat))
	.then(() => {
		console.log("Load Completed");
	})
	.finally(() => {
		mongoose.disconnect();
	});
