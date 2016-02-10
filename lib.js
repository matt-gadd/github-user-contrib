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
var connectionTemplate = _.template("mongodb://${url}/${db}");

Promise.promisifyAll(mongoose);

module.exports = class ContribCat {

	constructor(config) {
		this.config = config;
		this.getUserTemplate = _.template("${apiUrl}/users/${username}");
		this.getPullsTemplate = _.template("${apiUrl}/repos/${org}/${repo}/pulls?page=${page}&per_page=${size}&state=all&base=${head}&sort=updated&direction=desc");
		this.cutOffDate = moment().endOf("day").subtract(this.config.syncDays, "days");
		mongoose.connect(connectionTemplate(this.config.store), { keepAlive: 120 });
	}

	load() {
		if (this.config.caching) {
			get.load();
		}
		var results = this.getPullRequestsForRepos(this.config)
			.then(this.getCommentsOnCodeForPullRequestsBatch.bind(this))
			.then(this.getCommentsOnIssueForPullRequestsBatch.bind(this));

		if (this.config.caching) {
			results.then(get.dump);
		}
		return results;
	}

	sync() {
		return this.createUsers()
			.then(this.fetchUserDetails.bind(this))
			.then(this.saveUsers.bind(this));
	}

	_fetchPullRequests(url, repo) {
		return get(url, repo).spread((response, body) => {
			body = _.cloneDeep(body);
			var links = linkParser(response.headers.link);

			var items = body.filter((item) => {
				return moment(item.updated_at).isAfter(this.cutOffDate);
			});

			return Promise.map(items, (item) => {
				item.base.repo.full_name = item.base.repo.full_name.toLowerCase();
				item.user.login = item.user.login.toLowerCase();
				return PullRequest.findOneAndUpdate({"url": item.url}, item, {"upsert": true}).execAsync().reflect();
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
				comment.user.login = comment.user.login.toLowerCase();
				if (!comment.pull_request_url) {
					comment.pull_request_url = pr_url;
				}
			});

			return Promise.map(body, (item) => {
				return Comment.createAsync(item).reflect();
			}).then(() => {
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
				"size": this.config.pageSize
			});
			query.$or.push({"base.repo.full_name": repo.toLowerCase()});
			return this._fetchPullRequests(url, repo);
		})).then(() => {
			query.updated_at = {$gt: this.cutOffDate.toDate()};
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
		return User.find().lean().execAsync().then((users) => {
			users = _.keyBy(users, 'name');
			return PullRequest.findAsync({ updated_at: {$gt: this.cutOffDate.toDate()}}).map((pr) => {
				var author = pr.user.login;
				if (!users[author]) {
					users[author] = {
						"repos": [],
						"name": author.toLowerCase(),
						"gravatar": pr.user.avatar_url
					};
				}

				let authorRepo = _.find(users[author].repos, { 'name': pr.base.repo.full_name});

				if (!authorRepo) {
					authorRepo = {
						"name": pr.base.repo.full_name,
						"prs": [],
						"for": [],
						"against": []
					};
					users[author].repos.push(authorRepo);
				}

				if (_.findIndex(authorRepo.prs, function(o) {return pr._id.equals(o);}) === -1) {
					authorRepo.prs.push(pr);
				}

				return Comment.find({"pull_request_url": pr.url }).lean().execAsync().map((comment) => {
					var commenter = comment.user.login;
					if (!users[commenter]) {
						users[commenter] = {
							"repos": [],
							"name": commenter.toLowerCase(),
							"gravatar": comment.user.avatar_url
						};
					}

					let commenterRepo = _.find(users[commenter].repos, { 'name': pr.base.repo.full_name});

					if (!commenterRepo) {
						commenterRepo = {
							"name": pr.base.repo.full_name,
							"prs": [],
							"for": [],
							"against": []
						};
						users[commenter].repos.push(commenterRepo);
					}

					if (comment.user.login !== author) {
						if (_.findIndex(authorRepo.against, function(o) {return comment._id.equals(o);}) === -1) {
							authorRepo.against.push(comment);
						}

						if (_.findIndex(commenterRepo.for, function(o) {return comment._id.equals(o);}) === -1) {
							commenterRepo.for.push(comment);
						}
					}
				});
			}).then(() => {
				return users;
			});
		});
	}

	getUserStatistics(days, username) {
		var userQuery = {},
			sinceQuery = {
				$gt: moment().endOf("day").subtract(days || this.config.reportDays, "days").toDate()
			};
		if (username) {
			userQuery.name = username.toLowerCase();
		}

		return User.find(userQuery)
			.populate({
				path: 'repos.prs',
				match: { "created_at": sinceQuery }})
			.populate({
				path: 'repos.for repos.against',
				match: { "updated_at": sinceQuery },
				select: 'path body html_url user.login'})
			.lean()
			.execAsync().then((users) => {
				return {
					startDate: moment().endOf("day").subtract(days || this.config.reportDays, "days"),
					reportDays: this.config.reportDays,
					users: users
				};
			});
	}

	fetchUserDetails(users) {
		return Promise.map(Object.keys(users), (username) => {
			var user = users[username];
			return get(this.getUserTemplate({"username": username, "apiUrl": this.config.apiUrl}), "user").spread((response, body) => {
				user.details = body;
				return user;
			});
		});
	}

	saveUsers(users) {
		return Promise.map(users, (user) => {
			return User.findOneAndUpdate({"name": user.name}, user, {"upsert": true, "new": true}).execAsync().reflect();
		}).then(() => {
			return users;
		});
	}

	runPlugins(result) {
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
