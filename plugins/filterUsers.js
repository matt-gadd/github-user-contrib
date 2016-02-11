"use strict";

module.exports = function (options) {
	options = options || {};
	options.excludes = options.excludes || [];
	return function (results) {
		results.users = results.users.filter((user) => {
			if (options.excludes.indexOf(user.name) !== -1) {
				return false;
			}
			if (options.filterInactive) {
				if (user.details.suspended_at) {
					return user.repos.some(repo => repo.prs.length > 0 || repo.for.length > 0 || repo.against.length > 0);
				}
			}
			return true;
		});
		return results;
	};
};