var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var config = require("../config");
var ContribCat = require("../lib");
var mongoose = require('mongoose');
var contribCat = new ContribCat(config);

var port = 9000;
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

app.get("/user/:username", (req, res) => {
	contribCat.getUser(req.params.username).then(contribCat.runPlugins.bind(contribCat)).then((results) => {
		res.render('index.html', {
			user: results.users[0]
		});
	});
});

app.get("/overview", (req, res) => {
	contribCat.run().then((results) => {
		results.users.sort(function (a, b) {
			if (a.kudos > b.kudos) {
				return 1;
			}
			if (a.kudos < b.kudos) {
				return -1;
			}
			return 0;
		}).reverse();
		res.render('overview.html', {
			users: results.users
		});
	});
});

app.listen(port, () => {
	console.log("Listening on port %s...", port);
});

