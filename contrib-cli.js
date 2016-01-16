#!/usr/bin/env node
"use strict";

var program = require('commander');
var mongoose = require('mongoose');
var config = require("./config");
var ContribCat = require("./lib");


program
	.version("0.0.1")
	.option("-m, --mode <mode>", "cli mode", /^(sync|report)$/i, "stats")
	.option("-d, --days <number>", "cli mode", "Number of days to sync", 1)
	.parse(process.argv);

var mode = program.mode.toLowerCase();

if (mode === "sync") {

} else if (mode === "report") {

} else {
	//invalid mode
}


var contribCat = new ContribCat(config);


if (program.mode === "sync") {
	contribCat.sync().then(function() {
		console.log("process completed");
		mongoose.disconnect();
	});
}
