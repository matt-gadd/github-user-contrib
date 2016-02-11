"use strict";
var analyze = require('Sentimental').analyze;
var emojify = require("emojify.js");
var _ = require("lodash");
var marked = require("marked");
var moment = require("moment");

module.exports = function (options) {

	function scoreForComment(previousValue, currentValue) {
		return previousValue + currentValue.path ? options.weighting.for.diff : options.weighting.for.issue;
	}

	function scoreAgainstComment(previousValue, currentValue) {
		return previousValue + currentValue.path ? options.weighting.against.diff : options.weighting.against.issue;
	}

	return function (results) {
		results.users.forEach(function (user) {
			user.scores = {
				"kudos": 0,
				"prScore": 0,
				"forScore": 0,
				"againstScore": 0,
				"prCount": 0,
				"forCount": 0,
				"againstCount": 0,
				"sentiment": 0,
				"emojis": 0
			};

			user.repos.forEach((repo) => {
				repo.prScore = repo.prs.length * options.weighting.pr;

				if (repo.againstFiltered) {
					repo.againstScore = repo.againstFiltered.reduce(scoreAgainstComment, 0);
				} else {
					repo.againstScore = repo.against.reduce(scoreAgainstComment, 0);
				}

				if (repo.againstFiltered) {
					repo.forScore = repo.forFiltered.reduce(scoreForComment, 0);
				} else {
					repo.forScore = repo.for.reduce(scoreForComment, 0);
				}

				repo.for.forEach(function (comment) {
					var sentiment = analyze(comment.body).score;
					user.scores.sentiment += sentiment;
					emojify.replace(comment.body, function () {
						user.scores.emojis += 1;
					});
					comment.body = marked(comment.body);
					comment.sentiment = sentiment;
				});

				repo.kudos = (repo.againstScore + repo.forScore) + repo.prScore;

				user.scores.kudos += repo.kudos;
				user.scores.prScore += repo.prScore;
				user.scores.forScore += repo.forScore;
				user.scores.againstScore += repo.againstScore;
				user.scores.prCount += repo.prs.length;
				user.scores.forCount += repo.for.length;
				user.scores.againstCount += repo.against.length;
			});

			user.repos.sort(function (a, b) {
				if (a.kudos > b.kudos) {
					return 1;
				}
				if (a.kudos < b.kudos) {
					return -1;
				}
				return 0;
			});

			let bestRepoCount = user.repos.length < 3 ? 1 : user.repos.length < 5 ? 2 : 3;

			user.strongestRepos = _.takeRight(user.repos, bestRepoCount).reverse();
			user.weakestRepos = _.take(user.repos, bestRepoCount);

			let averageCommentsPerPr = user.scores.prCount === 0 ? 0 : user.scores.againstCount / user.scores.prCount;
			user.scores.averageCommentsPerPr = Math.ceil(averageCommentsPerPr);
			user.scores.averageCommentsPerPrForSort = averageCommentsPerPr;

			var created = moment(user.details.created_at).endOf("day");
			var after = created.isAfter(results.startDate);

			if (after) {
				var days = created.diff(results.startDate, "days");
				var average = user.scores.kudos/(results.reportDays - days);
				user.partial = true;
				user.scores.originalKudos = user.scores.kudos;
				user.scores.kudos = Math.round(average * results.reportDays);
			}
		});
		return results;
	};
};
