"use strict";
var analyze = require('Sentimental').analyze;
var emojify = require("emojify.js");
var marked = require("marked");

function scoreComment(previousValue, currentValue, weighting) {
	if (currentValue.filtered) {
		return previousValue;
	} else {
		return previousValue + (currentValue.path ? weighting.diff : weighting.issue);
	}
}

module.exports = function (options) {

	function scoreForComment(previousValue, currentValue) {
		return scoreComment(previousValue, currentValue, options.weighting.for);
	}

	function scoreAgainstComment(previousValue, currentValue) {
		return scoreComment(previousValue, currentValue, options.weighting.against);
	}

	return function (results) {
		results.users.forEach(function (user) {
			user.repos.forEach((repo) => {
				repo.prScore = repo.prs.length * options.weighting.pr;
				repo.sentiment = 0;
				repo.emojis = 0;

				repo.againstScore = repo.against.reduce(scoreAgainstComment, 0);
				repo.forScore = repo.for.reduce(scoreForComment, 0);

				repo.for.forEach(function (comment) {
					var sentiment = analyze(comment.body).score;
					repo.sentiment += sentiment;
					emojify.replace(comment.body, function () {
						repo.emojis += 1;
					});
					comment.body = marked(comment.body);
					comment.sentiment = sentiment;
				});

				let averageCommentsPerPr = repo.prs.length === 0 ? 0 : repo.against.length / repo.prs.length;
				repo.averageCommentsPerPr = Math.ceil(averageCommentsPerPr);

				repo.kudos = (repo.againstScore + repo.forScore) + repo.prScore;
			});
		});
		return results;
	};
};
