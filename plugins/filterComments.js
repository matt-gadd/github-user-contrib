"use strict";
module.exports = function (options) {

	function filterComment(comment) {
		if (options.filterIssueOnly) {
			return comment.path || comment.body.length > options.minlength;
		}
		return comment.body.length > options.minlength;
	}

	return function (results) {
		results.users.forEach((user) => {
			user.repos.forEach((repo) => {
				repo.againstFiltered = repo.against.filter((comment) => filterComment);
				repo.forFiltered = repo.for.filter((comment) => filterComment);
			});
		});
		return results;
	};
};
