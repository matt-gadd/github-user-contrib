var express = require("express");
var app = express();
var nunjucks = require("nunjucks");
var port = 9000;

nunjucks.configure("./templates", {
	autoescape: true,
	noCache: true,
	express: app
});

app.use(express.static('./'));
app.engine("html", nunjucks.render);
app.set("view engine", "html");

app.get("/:username", function(req, res) {
	res.render('index.html', {
		username : req.params.username
  });
});

app.listen(port);
console.log("Listening on port %s...", port);
