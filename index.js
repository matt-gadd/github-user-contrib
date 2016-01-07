"use strict";
var fs = require("fs");
var request = require("request");
var moment = require("moment");
var Promise = require('bluebird');
var _ = require("lodash");
var linkParser = require('parse-link-header');
var _get = Promise.promisify(request.get, {multiArgs: true});
var config = require("./config");

var cutOffDate = moment().endOf("day").subtract(config.days, "days");
var getPullsTemplate = _.template("${apiUrl}/repos/${org}/${repo}/pulls?page=${page}&per_page=${size}&state=all");
var cache = {};

function get(url) {
	if (cache[url]) {
		return Promise.resolve(cache[url]);
	} else {
		console.log(url);
		return cache[url] = _get({
			uri: url,
			json: true
		});
	}
}

function dumpCache() {
	var cacheDump = {};
	Object.keys(cache).forEach(function (url) {
		cacheDump[url] = Promise.resolve(cache[url]).spread(function (response, body) {
			return [response, body];
		});
	});
	return Promise.props(cacheDump).then(function (results) {
		fs.writeFile("cache.json", JSON.stringify(results, null, "\t"), function (err) {
			if (err) throw err;
			console.log('It\'s saved!');
		});
	});
}

function loadCache() {
	try {
		var cacheRaw = fs.readFileSync("cache.json", 'utf8');
		cache = JSON.parse(cacheRaw);
	} catch (e) {
	}
}

function _fetchPullRequests(url, children) {
	children = children || [];
	return get(url).spread(function (response, body) {
		body = _.cloneDeep(body);
		var links = linkParser(response.headers.link);
		var items = body.filter(function (item) {
			return moment(item.created_at).isAfter(cutOffDate);
		});
		Array.prototype.push.apply(children, items);
		if (links && links.next && items.length === body.length) {
			return _fetchPullRequests(links.next.url, children);
		}
		return children;
	});
}

function _fetchCommentsForPullRequest(url, children) {
	children = children || [];
	return get(url).spread(function (response, body) {
		body = _.cloneDeep(body);
		var links = linkParser(response.headers.link);
		Array.prototype.push.apply(children, body);
		if (links && links.next) {
			return _fetchPullRequests(links.next.url, children);
		}
		return children;
	});
}

function getPullRequestsForRepos(config) {
	return Promise.all(config.repos.map(function (repo) {
		var parts = repo.split("/");
		var url = getPullsTemplate({
			"apiUrl": config.apiUrl,
			"org": parts[0],
			"repo": parts[1],
			"page": 1,
			"size": 1
		});
		return _fetchPullRequests(url);
	})).then(function (results) {
		return Array.prototype.concat.apply([], results);
	});
}

function getCommentsOnCodeForPullRequests(prs) {
	var promises = [];
	prs.forEach(function(pr) {
		promises.push(_fetchCommentsForPullRequest(pr.review_comments_url).then(function (comments) {
			pr.comments = pr.comments ? pr.comments.concat(comments) : comments;
		}));
	});
	return Promise.all(promises).then(function () {
		return prs;
	});
}

function getCommentsOnIssueForPullRequests(prs) {
	var promises = [];
	prs.forEach(function(pr) {
		promises.push(_fetchCommentsForPullRequest(pr.comments_url).then(function (comments) {
			pr.comments = pr.comments ? pr.comments.concat(comments) : comments;
		}));
	});
	return Promise.all(promises).then(function () {
		return prs;
	});
}

function createUsers(prs) {
	var users = {}
	prs.forEach(function (pr) {
		var author = pr.user.login;
		if (!users[author]) {
			users[author] = {
				"for": [],
				"against": []
			};
		}
		pr.comments.forEach(function (comment) {
			var commenter = comment.user.login;
			if (!users[commenter]) {
				users[commenter] = {
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

function runPlugins(users) {
	var result = {
		users: users
	};
	return Promise.each(config.plugins, function(plugin) {
		return plugin(result);
	}).then(function () {
		return result;
	});
}

function runReporters(result) {
	return Promise.each(config.reporters, function(reporter) {
		return reporter(result);
	}).then(function () {
		return result;
	});
}


loadCache();
getPullRequestsForRepos(config)
	.then(getCommentsOnCodeForPullRequests)
	.then(getCommentsOnIssueForPullRequests)
	.then(createUsers)
	.then(runPlugins)
	.then(runReporters)
	.then(dumpCache);
