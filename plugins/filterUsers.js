"use strict";

module.exports = function (options) {
	options = options || {};
	options.excludes = options.excludes || [];
	options.inactive = options.inactive || {};
	return function (results) {
		results.users.forEach((user) => {
			let filtered = false;
			if (options.excludes.indexOf(user.name) !== -1) {
				filtered = true;
			} else if (options.filterSuspended) {
				filtered = user.details.suspended_at;
			} else if (options.inactive.filter) {
				if (!options.inactive.suspendedOnly || user.details.suspended_at) {
					filtered = !user.repos.some(repo => repo.prs.length > 0 || repo.for.length > 0 || repo.against.length > 0);
				}
			}
			user.filtered = filtered;
		});
		return results;
	};
};
