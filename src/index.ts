import * as express from 'express';
const Travis = require('travis-ci');
var travis = new Travis({
    version: '2.0.0'
});

var app = express();
declare var url;
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
//  /^\/(.+)/
app.get('/repos/(*)', (req, res) => {
  var repo = req.params[0];
  travis.repos(repo).get((err, repoResponse) => {
    let lastBuildId = repoResponse.repos[0].last_build_id;
    travis.builds(lastBuildId).get((err, buildResponse) => {
      let result = buildResponse.jobs.map((job) => {
        return {
          version: job.config.node_js,
          status: job.state
        };
      });
      res.status(200);
      url = req.url;
      res.send(result);
    });
  });
});

app.listen(app.get('port'), () => {
  console.log('Node app is running at localhost:' + app.get('port'));
});
