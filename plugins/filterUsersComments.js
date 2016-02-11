"use strict";

module.exports = function (options) {

	return function (results) {
		results.users.forEach((user) => {
			user.repos.forEach((repo) => {
				repo.against = repo.against.filter((comment) => {
					return options.excludes.indexOf(comment.user.login) === -1;
				});
			});
		});
		return results;
	};
};
