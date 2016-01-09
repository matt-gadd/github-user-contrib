var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var config = require("../config");
var ContribCat = require("../lib");
var mongoose = require('mongoose');
var contribCat = new ContribCat(config);

var port = 9000;
var contibs;

mongoose.connect("mongodb://localhost/contribcat");

var env = nunjucks.configure("./templates", {
	autoescape: true,
	noCache: true,
	express: app
});

env.addFilter('githubPretty', function(str, count) {
    return str.replace(/.*?.com\//, "").replace(/#.*/, "");
});

env.addFilter('sentimentClass', function(str, count) {
	var val = parseInt(str);
	var className = "default";
	if (val < -1) {
		className = "danger";
	} else if (val < 0) {
		className = "warning";
	} else {
		className = "success";
	}
    return className;
});

app.use(express.static('./'));
app.use("/emojify", express.static("../node_modules/emojify.js/dist"));

app.engine("html", nunjucks.render);
app.set("view engine", "html");

app.get("/:username", function(req, res) {
	res.render('index.html', {
		username : req.params.username,
		contribs: contribs
  });
});

contribCat.run().then(function (results) {
	contribs = results;
	app.listen(port);
	console.log("Listening on port %s...", port);
});
