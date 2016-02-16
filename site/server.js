var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var config = require("../config");
var ContribCat = require("../lib");
var mongoose = require('mongoose');
var moment = require("moment");
var marked = require("marked");
var contribCat = new ContribCat(config);

var port = 9000;
var env = nunjucks.configure("./templates", {
	autoescape: true,
	noCache: true,
	express: app
});

env.addFilter('githubPretty', function(str) {
    return str.replace(/.*?.com\//, "").replace(/#.*/, "");
});

env.addFilter('githubLinkBuilder', function(str) {
	return config.githubUrl + "/" + str;
});

env.addFilter('sentimentClass', function(str) {
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

env.addFilter("marked", function (str) {
	return marked(str);
});

env.addFilter("formatDate", function (str) {
	return moment(str).format('DD/MM/YYYY');
});

app.use(express.static('./'));
app.use("/emojify", express.static("../node_modules/emojify.js/dist"));

app.engine("html", nunjucks.render);
app.set("view engine", "html");

app.get("/user/:username", (req, res) => {
	contribCat.getUserStatistics(req.query.days, req.params.username).then(contribCat.runPlugins.bind(contribCat)).then((results) => {
		res.render('user.html', {
			user: results.users[0]
		});
	});
});

app.get("/", (req, res) => {
	contribCat.getUserStatistics(req.query.days)
		.then(contribCat.runPlugins.bind(contribCat))
		.then((results) => {
			res.render('index.html', {
				users: results.users
			});
	});
});

app.listen(port, () => {
	console.log("Listening on port %s...", port);
});

