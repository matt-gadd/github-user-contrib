var analyze = require('Sentimental').analyze;
var emojify = require("emojify.js");
var moment = require("moment");

module.exports = function (options) {
	return function (results) {
		results.users.forEach(function (user) {
			var forScore = 0;
			var againstScore = 0;
			var prScore = user.prs.length * options.weighting.pr;
			var averageCommentsPerPr = user.prs.length === 0 ? user.prs.length : user.against.length / user.prs.length;

			user.for.forEach((comment) => {
				if (comment.path) {
					forScore += options.weighting.for.diff;
				} else {
					if (comment.body.length > 20) {
						forScore += options.weighting.for.issue;
					}
				}
			});

			user.against.forEach((comment) => {
				if (comment.path) {
					againstScore -= options.weighting.against.diff;
				} else {
					if (comment.body.length > 20) {
						againstScore -= options.weighting.against.issue;
					}
				}
			});

			user.score = againstScore + forScore;
			user.emojis = 0;
			user.sentiment = 0;

			user.for.forEach(function (comment) {
				var sentiment = analyze(comment.body).score;
				user.sentiment += sentiment;
				emojify.replace(comment.body, function () {
					user.emojis += 1;
				});
				comment.sentiment = sentiment;
			});
			var sentimentScore = user.sentiment * options.weighting.sentiment;

			user.kudos = user.score + sentimentScore + prScore;
			user.averageCommentsPerPr = Math.ceil(averageCommentsPerPr);
			user.averageCommentsPerPrForSort = averageCommentsPerPr;

			var created = moment(user.details.created_at).endOf("day");
			var after = created.isAfter(results.startDate);

			if (after) {
				var days = created.diff(results.startDate, "days");
				var average = user.kudos/(365 - days);
				user.partial = true;
				user.originalKudos = user.kudos;
				user.kudos += Math.round(average * 365);
			}

		});
		return results;
	};
};
