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
		}).reverse();

		let bestRepoCount = user.repos.length < 3 ? 1 : user.repos.length < 5 ? 2 : 3;

		user.strongestRepos = user.repos.splice(0, bestRepoCount);
		user.weakestRepos = _.takeRight(user.repos, bestRepoCount).reverse();
	});

	return results;
};
