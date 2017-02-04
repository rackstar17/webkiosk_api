var request = require('request');
var querystring = require('querystring');
var restify = require('restify');
var bodyParser=require('body-parser');
var morgan=require('morgan');
var cheerio = require('cheerio');
var Q = require('q');
var server = restify.createServer();

server.use(bodyParser.urlencoded({extended:true}));
server.use(bodyParser.json());
server.use(morgan('dev'));

var studentForm = {
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
function webkioskLogin (enroll, password, institute, returnResponse) {  
  studentForm.InstCode = institute;
  studentForm.MemberCode = enroll;
  studentForm.Password = password;

  var studentFormData = querystring.stringify(studentForm),
      loginURL = 'https://webkiosk.jiit.ac.in/CommonFiles/UserAction.jsp?' + studentFormData,
      defer = new Q.defer();

  // https request to login to the webkiosk
  request({
    method: 'GET',
    url: loginURL,
    headers: {
      'Content-Type': 'application/x-www-studentForm-urlencoded',
      'Connection': 'keep-alive'
    },
    jar: cookieJar
  }, function (err, res, body) {
      if(!err) {
        console.log('login successfull');
        var $ = cheerio.load(body);
        var loginData = $('b').text();
        var wrongEnrollment = loginData.includes('Please give the correct Institute name and Enrollment No');
        var wrongPassword = loginData.includes('For assistance, please contact to System Administrator');
        
        // Return response for the login api
        if(wrongEnrollment) {
          if(returnResponse) {
            returnResponse.send({"status": "fail", "message": "Invalid Enrollment Number"});
          }
          return defer.reject({"status": "fail", "message": "Invalid Enrollment Number"});
        }
        else if(wrongPassword) {
          if(returnResponse) {
            returnResponse.send({"status": "fail", "message": "Invalid Password"});
          }
          return defer.reject({"status": "fail", "message": "Invalid Password"});
        }
        else {
          if(returnResponse) {
            returnResponse.send({"status": "success", "message": "Login successfull"});
          }
          return defer.resolve(true);
        }
      }
  });
  return defer.promise;
}

// function to get the overall attendance 
function getOverallAttendance (returnResponse) {
  var registeredSubjectsAttendance = {
    "subjects": [] 
  };
  // https get request to get the Attendance page to crawl
  request({
    method: 'GET',
    url: 'https://webkiosk.jiit.ac.in/StudentFiles/Academic/StudentAttendanceList.jsp',
    headers: {
      'Content-Type': 'application/x-www-studentForm-urlencoded',
      'Connection': 'keep-alive'
    },
    jar: cookieJar
  }, function (err, res, body) {
      // crawling the attendance data
      var $ = cheerio.load(body);
      var attendanceData = $('tbody tr');

      attendanceData.each(function(i, data) {
        var subjectAttendanceDetails = {};
        $(data).children().each(function (i, childrenData) {
          var subjectAttendanceData = $(childrenData).text();
          switch(i) {
            case 1: 
              subjectAttendanceDetails.subjectName = subjectAttendanceData;

            case 2:
              subjectAttendanceDetails.subjectOverallAttendance = subjectAttendanceData;

            case 3:
              subjectAttendanceDetails.subjectLectureAttendance = subjectAttendanceData;

            default: 
              //do nothing
          }

        });
        registeredSubjectsAttendance.subjects.push(subjectAttendanceDetails);
      });
      returnResponse.send(registeredSubjectsAttendance);
  });
}

// API Routes

server.post('/login', function (req, res) {
  webkioskLogin(req.body.enroll, req.body.password, req.body.institute, res);
});

server.post('/attendance', function (req, res) {
  webkioskLogin(req.body.enroll, req.body.password, req.body.institute).then(function () {
    getOverallAttendance(res);
  }, function (err) {
    res.send(err);
  });
});

// Server started at port 8080
server.listen(process.env.PORT || 8080, function () {
  console.log('listening at port 8080');
});
