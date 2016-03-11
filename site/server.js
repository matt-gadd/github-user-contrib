var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var config = require("../config");
var ContribCat = require("../lib");
var mongoose = require('mongoose');
var moment = require("moment");
var marked = require("marked");
var contribCat = new ContribCat(config);
var User = require("./../models/User");
var auth = require("http-auth");
var path = require("path");

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
	var sinceQuery = {
		$gt: moment().startOf("day").subtract(config.reportDays, "days").toDate()
	};

	User.findOne({"name": req.params.username.toLowerCase()}, {"repos.prs": 0}).populate({
			path: 'repos.prs',
			match: { "created_at": sinceQuery }})
		.populate({
			path: 'repos.for repos.against',
			match: { "updated_at": sinceQuery },
			select: 'path body html_url user.login filtered'})
		.lean().then((user) => {
		res.render('user.html', {
			user: user
		});
	});
});

if (config.auth) {
	var basic = auth.basic({
		"realm": "Contrib Cat",
		"file": path.join(__dirname, "users.htpasswd")
	});
	app.use(auth.connect(basic));
}

app.get("/", (req, res) => {
	return User.find({}, {"scores": 1, "name": 1, "filtered": 1, "partial": 1}, {"sort": {"scores.kudos": -1}}).lean().then((users) => {
		res.render('index.html', {
			users: users
		});
	});
});

app.listen(port, () => {
	console.log("Listening on port %s...", port);
});

