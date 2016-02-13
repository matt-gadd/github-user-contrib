"use strict";

module.exports = function (options) {

	return function (results) {
		results.users.forEach((user) => {
			user.repos.forEach((repo) => {
				repo.against.forEach((comment) => {
					comment.filtered = options.excludes.indexOf(comment.user.login) > -1;
				});
			});
		});
		return results;
	};
};
