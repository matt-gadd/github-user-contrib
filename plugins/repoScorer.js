"use strict";
var analyze = require('Sentimental').analyze;
var emojify = require("emojify.js");
var marked = require("marked");

module.exports = function (options) {

	function scoreForComment(previousValue, currentValue) {
		return previousValue + (currentValue.path ? options.weighting.for.diff : options.weighting.for.issue);
	}

	function scoreAgainstComment(previousValue, currentValue) {
		return previousValue - (currentValue.path ? options.weighting.against.diff : options.weighting.against.issue);
	}

	return function (results) {
		results.users.forEach(function (user) {
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
					repo.sentiment += sentiment;
					emojify.replace(comment.body, function () {
						repo.emojis += 1;
					});
					comment.body = marked(comment.body);
					comment.sentiment = sentiment;
				});

				repo.kudos = (repo.againstScore + repo.forScore) + repo.prScore;
			});
		});
		return results;
	};
};
