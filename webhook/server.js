"use strict";
var express = require('express');
var bl = require("bl");
var Promise = require('bluebird');
var PullRequest = require("./../models/PullRequest").PullRequest;
var Comment = require("./../models/Comment");
var User = require("./../models/User");
var mongoose = require("mongoose");
var config = require("./../config");
var app = express();

Promise.promisifyAll(mongoose);
mongoose.connect("mongodb://localhost/contribcat-test", { keepAlive: 120 });
var db = mongoose.connection;

function savePullRequest(data) {
	if (data.action === "opened") {
		return PullRequest.createAsync(data.pull_request).then((pullRequest) => {
			return User.findOne({"name": data.pull_request.user.login}).execAsync().then((user) => {
				if (user) {
					user._doc.prs.push(pullRequest._doc);
					return user.saveAsync();
				} else {
					var newUser = {
						"name": data.pull_request.user.login.toLowerCase(),
						"prs": [pullRequest._doc],
						"for": [],
						"against": [],
						"gravatar": data.pull_request.user.avatar_url
					};
					return User.createAsync(newUser);
				}
			});
		});
	}
}

function savePullRequestComment(data) {
	return Comment.createAsync(data.comment).then((savedComment) => {
		if (data.pull_request.user.login !== savedComment.user.login) {
			return Promise.map([data.pull_request.user.login, savedComment.user.login], (username) => {
				return User.findOne({"name": username.toLowerCase()}).execAsync().then((user) => {
					if (user) {
						if (user.name === data.pull_request.user.login) {
							user.against.push(savedComment);
						} else {
							user.for.push(savedComment);
						}
						return user.saveAsync();
					} else {
						var newUser = {
							"name": username.toLowerCase(),
							"prs": [],
							"for": [],
							"against": [],
							"gravatar": savedComment.user.avatar_url
						};

						if (newUser.name === data.pull_request.user.login) {
							newUser.against.push(savedComment);
						} else {
							newUser.for.push(savedComment);
						}
						return User.createAsync(newUser);
					}
				});
			});
		}
	});
}

function saveIssueComment(data) {
	//set pull request url on issue
	data.comment.pull_request_url = data.comment.issue_url.replace("issues", "pulls");

	return Comment.createAsync(data.comment).then((savedComment) => {
		if (data.issue.user.login !== data.comment.user.login) {
			return Promise.map([data.issue.user.login, data.comment.user.login], (username) => {
				return User.findOne({"name": username}).execAsync().then((user) => {
					if (user) {
						if (user.name === data.issue.user.login) {
							user.against.push(savedComment);
						} else {
							user.for.push(savedComment);
						}
						return user.saveAsync();
					} else {
						var newUser = {
							"name": username.toLowerCase(),
							"prs": [],
							"for": [],
							"against": [],
							"gravatar": data.comment.user.avatar_url
						};

						if (newUser.name === data.issue.user.login) {
							newUser.against.push(savedComment);
						} else {
							newUser.for.push(savedComment);
						}
						return User.createAsync(newUser);
					}
				});
			});
		}
	});
}

app.post('/', (req, res) => {
	var eventType = req.get("x-github-event");
	req.pipe(bl((err, body) => {
		var data = {};
		try { data = JSON.parse(body.toString()); } catch (e) {}

		if (eventType === "pull_request") {
			savePullRequest(data).then(() => {
				return res.end();
			});
		} else if (eventType === "pull_request_review_comment") {
			savePullRequestComment(data).then(() => {
				return res.end();
			});
		} else if (eventType === "issue_comment") {
			saveIssueComment(data).then(() => {
				return res.end();
			});
		}
	}));
});

app.get("/", (req, res) => {
	res.send("GitHub User Contrib Bot Running");
});

app.set('port', config.botPort || 5000);

db.once("open", () => {
	app.listen(app.get("port"), () => {
		console.log("Listening on port", app.get("port"));
	});
});



