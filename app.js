var express = require('express')
var app = express();
var http = require('http'); 
var https = require('https');
var cons = require('consolidate')
var childProcess = require('child_process');
var path =require("path");
var phantomjs = require('phantomjs/lib/phantomjs');
var binPath = phantomjs.path
var fs = require("fs");
var ssl_path= 'crt/ssl.key';


app.set('views', __dirname + '/views');
app.engine('html', cons.handlebars);
app.set('view engine', 'html');

var bodyParser = require('body-parser');
var session = require('express-session');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({ resave: true,
                  saveUninitialized: true,
                  secret: 'uwotm8' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));
app.use('/test', express.static(__dirname + '/test'));
app.use('/screenshots', express.static(__dirname + '/screenshots'));
app.use('/Auditor',express.static(path.join(__dirname, 'src/HTML_CodeSniffer/Auditor')));    
app.use('/Images',express.static(path.join(__dirname, 'src/HTML_CodeSniffer/Auditor/Images')));


if (fs.existsSync(ssl_path)) {
		var hskey = fs.readFileSync(ssl_path);
		var hscert = fs.readFileSync('cert/abc.cer') ; //Replace here with your certificate file
		var options = {
		    key: hskey,
		    cert: hscert
		};
		var httpsServer = https.createServer(options, app);
		httpsServer.listen(443);
		console.log('Express started on port 443');	

} else {
		var server = http.createServer(app);
		app.listen(80);
		// Start with Sudo for starting in default port
		console.log('Express started on port 80');
}

	app.get('/', function(req, res) {
		res.render('index.html',{data:''});
	});

	app.get('/help', function(req, res) {
		res.render('help.html');
	});

	app.get('/getURL', function(req, res) {
		res.render('index.html',{data:''});
	});

	app.post('/sniffURL', function(req, res) {
 		var childArgs
 		, userName = ''
 		, d = new Date()
        , customDateString = d.getHours() +'_'  + d.getMinutes() + '_' + d.getSeconds() +'_'+ d.getMonth() + '_' + d.getDate() + '_' + d.getFullYear()
        , dirName = "screenshots/" + customDateString
        , scrshot = req.body.scrshot
        , msgErr = req.body.msgErr
        , msgWarn = req.body.msgWarn
        , msgNotice = req.body.msgNotice
    	, eLevel=[]

    	if(typeof msgErr !== 'undefined' && msgErr=='true') eLevel.push(1);
    	if(typeof msgWarn !== 'undefined' && msgWarn=='true') eLevel.push(2);
    	if(typeof msgNotice !== 'undefined' && msgNotice=='true') eLevel.push(3);

    	//Default to Error
		if(typeof msgErr === 'undefined' &&  typeof msgWarn === 'undefined' && typeof msgNotice === 'undefined') eLevel.push(1);

		fs.mkdirSync(dirName);		//Create SCREEN SHOT DIRECTORY

		// console.log(req.body);

		if (typeof req.session.userName !== 'undefined') {
			userName = req.session.userName;
			console.log('Testing logged in session: -> ', userName)
		}
		childArgs = ['--config=config/config.json', path.join(__dirname, 'src/PAET.js')
						, req.body.textURL
						, 'WCAG2AA'
						, userName
						, dirName
						, scrshot
						, eLevel
					];
		childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
			res.json({ userName: userName, data: stdout });
			console.log(stdout);
		});
	});

	app.post('/sniffHTML', function(req, res) {
 		var childArgs
 		, userName = ''
 		, d = new Date()
		, tempFilename = 'tmp/'+ new Date().getTime() + '.html'

			// console.log('source HTML --> ', req.body.source);

			var source = '<!DOCTYPE html><html lang="en"><meta charset="utf-8"><head><title>Home - PayPal Accessibility Tool</title></head><body>'
						+ 	req.body.source
						+ '</body></html>';

			fs.writeFile(tempFilename, source , function (err,data) {
			  if (err) {
			    return console.log(err);
			  }

			var childArgs = ['--config=config/config.json', path.join(__dirname, 'src/HTMLCS_Run.js'), tempFilename, 'WCAG2AA', 'P1,P2,P3,P4']
			 	childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
				res.json(stdout);
				console.log(stdout);
			});

		});
	});

	app.post('/login', function(req, res) {
		var userName= req.body.userName,
			password =req.body.password,
			stageName = req.body.stageName,
			server = req.body.server

			console.log(userName, password, stageName, server);
			req.session.userName = userName;

		var childArgs1 = ['--config=config/config.json', path.join(__dirname, 'src/login.js'), userName, password, stageName, server]
			childProcess.execFile(binPath, childArgs1, function(err, stdout, stderr) {
			res.json({ userName: userName, data: stdout });
			console.log(stdout);		 
		});
	});

	app.get('/logout', function(req, res) {
		if (typeof req.session.userName !== 'undefined'){
				var fs = require('fs');
				fs.unlink(req.session.userName+'.txt', function (err) {
					if (err) throw err;
					console.log('successfully deleted cookies');
				});
				delete req.session.userName;
			}
			res.redirect('/');	
	});

