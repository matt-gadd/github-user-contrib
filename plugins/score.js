var analyze = require('Sentimental').analyze;
var emojify = require("emojify.js");

module.exports = function (options) {
	return function (results) {
		Object.keys(results.users).forEach(function (username) {
			var user = results.users[username];
			var forScore = user.for.length * options.weighting.for;
			var againstScore = user.against.length * options.weighting.against;
			var prScore = user.prs.length * options.weighting.pr;

			user.score = againstScore + forScore;
			user.emojis = 0;
			user.sentiment = 0;

			user.for.forEach(function (comment) {
				user.sentiment += analyze(comment.body).score;
				emojify.replace(comment.body, function () {
					user.emojis += 1;
				});
			});
			var sentimentScore = user.sentiment * options.weighting.sentiment;

			user.kudos = user.score + sentimentScore + prScore;
		});
		return results;
	};
}
