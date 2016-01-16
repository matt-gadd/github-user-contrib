#!/usr/bin/env node
"use strict";

var program = require('commander');
var mongoose = require('mongoose');
var config = require("./config");
var ContribCat = require("./lib");

program
	.version("0.0.1")
	.option("-m, --mode <mode>", "cli mode", /^(load|sync)$/i, "stats")
	.parse(process.argv);

var mode = program.mode.toLowerCase();
var contribCat = new ContribCat(config);

if (mode === "load") {
	contribCat.load().then(function() {
		console.log("load completed");
		mongoose.disconnect();
	});
} else if (mode === "sync") {
	contribCat.sync().then(function() {
		console.log("sync completed");
		mongoose.disconnect();
	});
} else {
	mongoose.disconnect();
	console.error("unsupported mode")
}
