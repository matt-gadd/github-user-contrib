"use strict";
var moment = require("moment");

module.exports = function (options) {

	return function (results) {
		results.users.forEach(function (user) {
			user.scores = {
				"kudos": 0,
				"prScore": 0,
				"forScore": 0,
				"againstScore": 0,
				"prCount": 0,
				"forCount": 0,
				filteredForCount: 0,
				"againstCount": 0,
				filteredAgainstCount: 0,
				"sentiment": 0,
				"emojis": 0
			};

			user.repos.forEach((repo) => {
				user.scores.kudos += repo.kudos;
				user.scores.prScore += repo.prScore;
				user.scores.forScore += repo.forScore;
				user.scores.againstScore += repo.againstScore;
				user.scores.prCount += repo.prs.length;
				user.scores.forCount += repo.for.length;
				user.scores.filteredForCount += repo.forFiltered.length;
				user.scores.filteredAgainstCount += repo.againstFiltered.length;
				user.scores.againstCount += repo.against.length;
				user.scores.emojis += repo.emojis;
				user.scores.sentiment += repo.sentiment;
			});

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
