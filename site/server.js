var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var config = require("../config");
var ContribCat = require("../lib");
var contribCat = new ContribCat(config);

var port = 9000;
var contibs;

nunjucks.configure("./templates", {
	autoescape: true,
	noCache: true,
	express: app
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
