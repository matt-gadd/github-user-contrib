"use strict";
module.exports =  function(results) {
	results.users.forEach((user) => {
		user.repos = user.repos.filter((repo) => {
			return !!(repo.prs.length !== 0 || repo.for.length !== 0 || repo.against.length !== 0);
		});
	});

	return results;
};
