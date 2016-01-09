"use strict";

var request = require("request");
var moment = require("moment");
var Promise = require('bluebird');
var _ = require("lodash");
var linkParser = require('parse-link-header');
var mongoose = require('mongoose');
var _get = Promise.promisify(request.get, {multiArgs: true});
var get = require("./cache")(_get);
var PullRequest = require("./models/PullRequest");
var Comment = require("./models/Comment");

Promise.promisifyAll(mongoose);

module.exports = class ContribCat {

	constructor(config) {
		this.config = config;
		this.getPullsTemplate = _.template("${apiUrl}/repos/${org}/${repo}/pulls?page=${page}&per_page=${size}&state=all&base=integration");
		this.cutOffDate = moment().endOf("day").subtract(this.config.days, "days");
	}

	run() {
		get.load();
		var results = this.getPullRequestsForRepos(this.config)
			.then(this.getCommentsOnCodeForPullRequests.bind(this))
			.then(this.getCommentsOnIssueForPullRequests.bind(this))
			.then(this.createUsers.bind(this))
			.then(this.runPlugins.bind(this));

		results.then(get.dump);
		return results;
	}

	_fetchPullRequests(url) {
		return get(url).spread((response, body) => {
			body = _.cloneDeep(body);
			var links = linkParser(response.headers.link);

			var items = body.filter((item) => {
				return moment(item.created_at).isAfter(this.cutOffDate);
			});

			var promises = [];
			items.forEach((item) => {
				promises.push(PullRequest.createAsync(item).then(function() {}, function() {}));
			});

			Promise.all(promises).then(function() {
				if (links && links.next && items.length === body.length) {
					return this._fetchPullRequests(links.next.url);
				}
			}.bind(this));
		});
	}

	_fetchCommentsForPullRequest(url, pr_url) {
		return get(url).spread((response, body) => {
			var links = linkParser(response.headers.link);

			body = _.cloneDeep(body);
			body.forEach((comment) => {
				if (!comment.pull_request_url) {
					comment.pull_request_url = pr_url;
				}
			});

			return Comment.collection.insertManyAsync(body, { ordered: false }).then(function() {
				if (links && links.next) {
					return this._fetchCommentsForPullRequest(links.next.url);
				}
			}.bind(this), function() {});
		});
	}

	getPullRequestsForRepos() {
		return Promise.all(this.config.repos.map((repo) => {
			var parts = repo.split("/");
			var url = this.getPullsTemplate({
				"apiUrl": this.config.apiUrl,
				"org": parts[0],
				"repo": parts[1],
				"page": 1,
				"size": 100
			});
			return this._fetchPullRequests(url);
		})).then(function () {
			return PullRequest.find().lean().execAsync();
		});
	}

	getCommentsOnCodeForPullRequests(prs) {
		var promises = [];
		prs.forEach((pr) => {
			promises.push(this._fetchCommentsForPullRequest(pr.review_comments_url));
		});
		return Promise.all(promises).then(function () {
			return prs;
		});
	}

	getCommentsOnIssueForPullRequests(prs) {
		var promises = [];
		prs.forEach((pr) => {
			promises.push(this._fetchCommentsForPullRequest(pr.comments_url, pr.url));
		});
		return Promise.all(promises).then(function () {
			return prs;
		});
	}

	createUsers() {
		var users = {}, commentPromises = [];
		return PullRequest.findAsync({ created_at: {$gt: this.cutOffDate.toDate()}}).then(function(prs) {
			prs.forEach((pr) => {
				var author = pr.user.login;
				if (!users[author]) {
					users[author] = {
						"prs": [],
						"for": [],
						"against": []
					};
				}
				users[author].prs.push(pr);
				users[author].gravatar = pr.user.avatar_url;
				commentPromises.push(Comment.find({"pull_request_url": pr.url }).lean().execAsync().then(function(comments) {
					comments.forEach((comment) => {
						var commenter = comment.user.login;
						if (!users[commenter]) {
							users[commenter] = {
								"prs": [],
								"for": [],
								"against": []
							};
						}
						if (comment.user.login !== author) {
							users[author].against.push(comment);
							users[commenter].for.push(comment);
						}
					});
				}));
			});
			return Promise.all(commentPromises).then(function () {
				return users;
			});
		});
	}

	runPlugins(users) {
		var result = {
			users: users
		};
		return Promise.each(this.config.plugins, function(plugin) {
			return plugin(result);
		}).then(function () {
			return result;
		});
	}

	runReporters(result) {
		return Promise.each(this.config.reporters, function(reporter) {
			return reporter(result);
		}).then(function () {
			return result;
		});
	}
};
