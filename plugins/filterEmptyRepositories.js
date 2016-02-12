"use strict";
module.exports = function(options) {
	let forCommentKey = "for", againstCommentKey = "against";
		if (options.useFilteredComments) {
			forCommentKey = "forFiltered";
			againstCommentKey = "againstFiltered";
	}
	return function (results) {
		results.users.forEach((user) => {
			user.repos = user.repos.filter((repo) => {
				return !!(repo.prs.length !== 0 || repo[forCommentKey].length !== 0 || repo[againstCommentKey].length !== 0);
			});
		});
		return results;
	};
};
