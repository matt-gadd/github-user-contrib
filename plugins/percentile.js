"use strict";
module.exports = function(results) {
	var filteredUsers = results.users.filter((user) => !user.filtered);
	filteredUsers.sort(function (a, b) {
		if (a.scores.kudos > b.scores.kudos) {
			return 1;
		}
		if (a.scores.kudos < b.scores.kudos) {
			return -1;
		}
		return 0;
	});

	filteredUsers.forEach((user, index) => {
		user.scores.percentile = Math.round(index/filteredUsers.length * 100);
	});

	return results;
};
