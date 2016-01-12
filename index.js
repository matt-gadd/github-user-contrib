"use strict";
var config = require("./config");
var mongoose = require('mongoose');
var ContribCat = require("./lib");
var contribCat = new ContribCat(config);

mongoose.connect("mongodb://localhost/contribcat");

contribCat.run()
	.then(contribCat.runReporters.bind(contribCat))
	.finally(function () {
		mongoose.disconnect();
	});
