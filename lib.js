"use strict";

var request = require("request");
var moment = require("moment");
var Promise = require('bluebird');
var _ = require("lodash");
var linkParser = require('parse-link-header');
var _get = Promise.promisify(request.get, {multiArgs: true});
var get = require("./cache")(_get);

module.exports = class ContribCat {

	constructor(config) {
		this.config = config;
		this.getPullsTemplate = _.template("${apiUrl}/repos/${org}/${repo}/pulls?page=${page}&per_page=${size}&state=all&base=integration");
		this.cutOffDate = moment().endOf("day").subtract(this.config.days, "days");
	}

	run() {
		get.load();
		var results = this.getPullRequestsForRepos(this.config)
			.then(this.getCommentsOnCodeForPullRequestsBatch.bind(this))
			.then(this.getCommentsOnIssueForPullRequestsBatch.bind(this))
			.then(this.createUsers.bind(this))
			.then(this.runPlugins.bind(this));

		results.then(get.dump);
		return results;
	}

	_fetchPullRequests(url, repo, children) {
		children = children || [];
		return get(url, repo).spread((response, body) => {
			body = _.cloneDeep(body);
			var links = linkParser(response.headers.link);
			var items = body.filter((item) => {
				return moment(item.created_at).isAfter(this.cutOffDate);
			});
			Array.prototype.push.apply(children, items);
			if (links && links.next && items.length === body.length) {
				return this._fetchPullRequests(links.next.url, repo, children);
			}
			return children;
		});
	}

	_fetchCommentsForPullRequest(url, repo, children) {
		children = children || [];
		return get(url, repo).spread((response, body) => {
			body = _.cloneDeep(body);
			var links = linkParser(response.headers.link);
			Array.prototype.push.apply(children, body);
			if (links && links.next) {
				return this._fetchCommentsForPullRequest(links.next.url, repo, children);
			}
			return children;
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
			return this._fetchPullRequests(url, repo);
		})).then(function (results) {
			return Array.prototype.concat.apply([], results);
		});
	}

	getCommentsOnCodeForPullRequests(prs) {
		var promises = [];
		prs.forEach((pr) => {
			promises.push(this._fetchCommentsForPullRequest(pr.review_comments_url, pr.base.repo.full_name).then(function (comments) {
				pr.comments = pr.comments ? pr.comments.concat(comments) : comments;
			}));
		});
		return Promise.all(promises).then(function () {
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
		var promises = [];
		prs.forEach((pr) => {
			promises.push(this._fetchCommentsForPullRequest(pr.comments_url, pr.base.repo.full_name).then(function (comments) {
				pr.comments = pr.comments ? pr.comments.concat(comments) : comments;
			}));
		});
		return Promise.all(promises).then(function () {
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

	createUsers(prs) {
		var users = {};
		prs.forEach(function (pr) {
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

			pr.comments.forEach(function (comment) {
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

		});
		return users;
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
}
