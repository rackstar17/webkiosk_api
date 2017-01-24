var request = require('request');
var querystring = require('querystring');
var restify = require('restify');
var bodyParser=require('body-parser');
var morgan=require('morgan');
var server = restify.createServer();

server.use(bodyParser.urlencoded({extended:true}));
server.use(bodyParser.json());
server.use(morgan('dev'));

var form = {
  x: "",
  txtInst: "Institute",
  InstCode: "",
  txtuType: "Member Type",
  UserType: "S",
  txtCode: "Enrollment No",
  MemberCode: "",
  txtPin: "Password/Pin",
  Password: "",
  BTNSubmit: "Submit"
}
var cookieJar = request.jar();

// function to login to webkiosk web app
function webkioskLogin (enroll, password, institute, returnResponse, callback) {  
  form.InstCode = institute;
  form.MemberCode = enroll;
  form.Password = password;

  var formData = querystring.stringify(form),
      loginURL = 'https://webkiosk.jiit.ac.in/CommonFiles/UserAction.jsp?' + formData;

  // https request to login to the webkiosk
  request({
    method: 'GET',
    url: loginURL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive'
    },
    jar: cookieJar
  }, function (err, res, body) {
      if(!err & res.statusCode == 200) {
        console.log('login successfull');
        callback(returnResponse);
      }
  })
}

// function to get the overall attendance 
function getOverallAttendance (returnResponse) {
  // https get request to get the Attendance page to crawl
  request({
    method: 'GET',
    url: 'https://webkiosk.jiit.ac.in/StudentFiles/Academic/StudentAttendanceList.jsp',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive'
    },
    jar: cookieJar
  }, function (err, res, body) {
      returnResponse.send(body);
  });
}

// API Routes

server.post('/attendance', function (req, res) {
  webkioskLogin(req.body.enroll, req.body.password, req.body.institute, res, getOverallAttendance);
});

// Server started at port 8080
server.listen(8080, function () {
  console.log('listening at port 8080');
});