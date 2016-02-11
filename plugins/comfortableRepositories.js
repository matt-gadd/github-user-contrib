"use strict";
var _ = require("lodash");

module.exports = function (results) {
	results.users.forEach(user => {
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
	});

	return results;
};
