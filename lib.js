"use strict";

var request = require("request");
var moment = require("moment");
var Promise = require('bluebird');
var _ = require("lodash");
var linkParser = require('parse-link-header');
var mongoose = require('mongoose');
var _get = Promise.promisify(request.get, {multiArgs: true});
var get = require("./cache")(_get);
var PullRequest = require("./models/PullRequest").PullRequest;
var Comment = require("./models/Comment");
var User = require("./models/User");

Promise.promisifyAll(mongoose);

mongoose.connect("mongodb://localhost/contribcat", { keepAlive: 120 });

module.exports = class ContribCat {

	constructor(config) {
		this.config = config;
		this.getPullsTemplate = _.template("${apiUrl}/repos/${org}/${repo}/pulls?page=${page}&per_page=${size}&state=all&base=${head}");
		this.cutOffDate = moment().endOf("day").subtract(this.config.days, "days");
	}

	load() {
		get.load();
		var results = this.getPullRequestsForRepos(this.config)
			.then(this.getCommentsOnCodeForPullRequestsBatch.bind(this))
			.then(this.getCommentsOnIssueForPullRequestsBatch.bind(this));

		results.then(get.dump);
		return results;
	}

	sync() {
		return this.createUsers().then(this.saveUsers.bind(this));
	}

	run() {
		return this.getUsers().then(this.runPlugins.bind(this));
	}

	_fetchPullRequests(url, repo) {
		return get(url, repo).spread((response, body) => {
			body = _.cloneDeep(body);
			var links = linkParser(response.headers.link);

			var items = body.filter((item) => {
				return moment(item.created_at).isAfter(this.cutOffDate);
			});

			return Promise.map(items, (item) => {
				return PullRequest.createAsync(item).reflect();
			}).then(() => {
				if (links && links.next && items.length === body.length) {
					return this._fetchPullRequests(links.next.url, repo);
				}
			});
		});
	}

	_fetchCommentsForPullRequest(url, pr_url, repo) {
		return get(url, repo).spread((response, body) => {
			var links = linkParser(response.headers.link);

			body = _.cloneDeep(body);
			body.forEach((comment) => {
				if (!comment.pull_request_url) {
					comment.pull_request_url = pr_url;
				}
			});

			return Comment.collection.insertManyAsync(body, { ordered: false }).reflect().then(() => {
				if (links && links.next) {
					return this._fetchCommentsForPullRequest(links.next.url, pr_url, repo);
				}
			});
		});
	}

	getPullRequestsForRepos() {
		var query = {"$or": []};
		return Promise.all(this.config.repos.map((target) => {
			var parts = target.split(":");
			var head = parts[1];
			var repo = parts[0];
			var url = this.getPullsTemplate({
				"apiUrl": this.config.apiUrl,
				"org": repo.split("/")[0],
				"repo": repo.split("/")[1],
				"head": head || this.config.defaultBranch,
				"page": 1,
				"size": 100
			});
			query.$or.push({"base.repo.full_name": repo.toLowerCase()});
			return this._fetchPullRequests(url, repo);
		})).then(() => {
			query.created_at = {$gt: this.cutOffDate.toDate()};
			return PullRequest.find(query).lean().execAsync();
		});
	}

	getCommentsOnCodeForPullRequests(prs) {
		return Promise.map(prs, (pr) => {
			return this._fetchCommentsForPullRequest(pr.review_comments_url, pr.url, pr.base.repo.full_name);
		}).then(() => {
			return prs;
		});
	}

	getCommentsOnCodeForPullRequestsBatch(prs) {
		var chunkedArray = _.chunk(prs, 10);
		var first = chunkedArray.shift();

		var finish = chunkedArray.reduce((defPrevious, current, currentIndex) => {
			return defPrevious.then(() => {
				console.log("Processing Pull Requests Comments batch", currentIndex + 1, "of", chunkedArray.length);
				return this.getCommentsOnCodeForPullRequests(current);
			});
		}, this.getCommentsOnCodeForPullRequests(first));

		return finish.then(() => {
			return prs;
		});
	}

	getCommentsOnIssueForPullRequests(prs) {
		return Promise.map(prs, (pr) => {
			return this._fetchCommentsForPullRequest(pr.comments_url, pr.url, pr.base.repo.full_name)
		}).then(() => {
			return prs;
		});
	}

	getCommentsOnIssueForPullRequestsBatch(prs) {
		var chunkedArray = _.chunk(prs, 10);
		var first = chunkedArray.shift();

		var finish = chunkedArray.reduce((defPrevious, current, currentIndex) => {
			return defPrevious.then(() => {
				console.log("Processing Issue Comments batch", currentIndex + 1, "of", chunkedArray.length);
				return this.getCommentsOnIssueForPullRequests(current);
			});
		}, this.getCommentsOnIssueForPullRequests(first));

		return finish.then(() => {
			return prs;
		});
	}

	createUsers() {
		var users = {};
		return PullRequest.findAsync({ created_at: {$gt: this.cutOffDate.toDate()}}).map((pr) => {
			var author = pr.user.login;
			if (!users[author]) {
				users[author] = {
					"name": author.toLowerCase(),
					"prs": [],
					"for": [],
					"against": [],
					"gravatar": pr.user.avatar_url
				};
			}
			users[author].prs.push(pr);
			return Comment.find({"pull_request_url": pr.url }).lean().execAsync().map((comment) => {
				var commenter = comment.user.login;
				if (!users[commenter]) {
					users[commenter] = {
						"name": commenter.toLowerCase(),
						"prs": [],
						"for": [],
						"against": [],
						"gravatar": comment.user.avatar_url
					};
				}
				if (comment.user.login !== author) {
					users[author].against.push(comment);
					users[commenter].for.push(comment);
				}
			});
		}).then(() => {
			return users;
		});
	}

	getUsers() {
		return User.find().populate("for against", "path body").lean().execAsync();
	}

	getUser(username) {
		return User.find({"name": username.toLowerCase()}).lean().execAsync();
	}

	saveUsers(users) {
		return Promise.map(Object.keys(users), (username) => {
			return User.findOneAndUpdate({"name": username}, users[username], {"upsert": true, "new": true}).execAsync()
				.reflect().then((body) => {
					return body._doc
				})
		});
	}

	runPlugins(users) {
		var result = {
			users: users
		};
		return Promise.each(this.config.plugins, (plugin) => {
			return plugin(result);
		}).then(() => {
			return result;
		});
	}

	runReporters(result) {
		return Promise.each(this.config.reporters, (reporter) => {
			return reporter(result);
		}).then(() => {
			return result;
		});
	}
};
