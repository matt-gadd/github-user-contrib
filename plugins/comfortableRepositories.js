"use strict";
var _ = require("lodash");

module.exports = function (results) {
	results.users.forEach(user => {
		let filteredRepos = user.repos.filter(repo => {
			return repo.prs.length > 4;
		});

		filteredRepos.sort(function (a, b) {
			if (a.kudos > b.kudos) {
				return 1;
			}
			if (a.kudos < b.kudos) {
				return -1;
			}
			return 0;
		});

		let bestRepoCount = filteredRepos.length < 3 ? 1 : filteredRepos.length < 5 ? 2 : 3;

		user.strongestRepos = _.takeRight(filteredRepos, bestRepoCount).reverse();
		user.weakestRepos = _.take(filteredRepos, bestRepoCount);
	});

	return results;
};
