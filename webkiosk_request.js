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
      'Content-Type': 'application/x-www-studentForm-urlencoded'
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
function getOverallAttendance (returnResponse, subjectName, year) {
  var registeredSubjectsAttendance = {
    "subjects": [] 
  };
  // https get request to get the Attendance page to crawl
  request({
    method: 'GET',
    url: 'https://webkiosk.jiit.ac.in/StudentFiles/Academic/StudentAttendanceList.jsp',
    headers: {
      'Content-Type': 'application/x-www-studentForm-urlencoded'
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
        if(!subjectAttendanceDetails.subjectName.includes('PROJECT')) {
          registeredSubjectsAttendance.subjects.push(subjectAttendanceDetails);
        }
      });

      // if there exists a subject whose detailed attendance has to be returned
      if(subjectName && year) {
        var detailedAttendanceLinks = $('tbody tr td a')
        var detailedAttendanceSubjectIndex = 0;

        for(var subject = 0; subject < registeredSubjectsAttendance.subjects.length; subject++) {
          if(registeredSubjectsAttendance.subjects[subject].subjectName.includes(subjectName)) {
            detailedAttendanceSubjectIndex = subject;
            break;
          }
        }
        request({
          method: 'GET',
          url: 'https://webkiosk.jiit.ac.in/StudentFiles/Academic/' +
            $(detailedAttendanceLinks[2*detailedAttendanceSubjectIndex + 1]).attr('href'),
          headers: {
            'Content-Type': 'application/x-www-studentForm-urlencoded'
          },
          jar: cookieJar
        }, function (err, res, body) {
          // Crawl the detailed attendance table and return json response
          var $ = cheerio.load(body);
          var detailedAttendanceBody = $('.sort-table tbody tr td');
          var querySubjectDetailedAttendace = {
            "data": []
          };
          var crawlData = {};
          detailedAttendanceBody.each(function (i) {
            var detailedData = $(this).text();
            var modulo;

            if(year == '4' || year == '2') {
              modulo = (i+1)%5;
            }
            if(year == '3') {
              modulo = (i+1)%6;
            }

            if(modulo == 0) {
              querySubjectDetailedAttendace.data.unshift(crawlData);
              crawlData = {};
            }
            if(modulo == 2) {
              crawlData.dateTime = detailedData;
            }
            if(modulo == 3) {
              crawlData.profName = detailedData;
            }
            if(modulo == 4) {
              crawlData.attendanceStatus = detailedData;
            }
          });
          returnResponse.send(querySubjectDetailedAttendace);
        });
      }
      else {
        returnResponse.send(registeredSubjectsAttendance);
      }
  });
}

// function to get the datesheet of the latest exam about to happen
function getDatesheet(returnResponse) {
  request({
    method: 'GET',
    url: 'https://webkiosk.jiit.ac.in/StudentFiles/Exam/StudViewDateSheet.jsp',
    headers: {
      'Content-Type': 'application/x-www-studentForm-urlencoded'
    },
    jar: cookieJar
  }, function (err, res, body) {
      var $ = cheerio.load(body);
      var datesheetData = $('.sort-table tr');
      var datesheet = {
        "subjects": []
      };
      datesheetData.each(function (i, datesheetRow) {
        if(i != 0) {
          var subjectDates = {}
          subjectDates.subjectName = $(datesheetRow).children().eq(3).text();
          // if the subject row has no date ie- subject exam lies on the same date
          subjectDates.date = $(datesheetRow).children().eq(1).text() != '\u00a0' // this special character stands for &nbsp
            ? $(datesheetRow).children().eq(1).text() : datesheet.subjects[datesheet.subjects.length - 1].date; 

          subjectDates.time = $(datesheetRow).children().eq(2).text();
          datesheet.subjects.push(subjectDates);
        }
      });
      returnResponse.send(datesheet);
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

server.post('/detailedattendance', function (req, res) {
  webkioskLogin(req.body.enroll, req.body.password, req.body.institute).then(function () {
    getOverallAttendance(res, req.body.subjectName, req.body.year);
  }, function (err) {
    res.send(err);
  });
});

server.post('/datesheet', function (req, res) {
  webkioskLogin(req.body.enroll, req.body.password, req.body.institute).then(function () {
    getDatesheet(res);
  }, function (err) {
    res.send(err);
  });
});

// Server started at port 8080
server.listen(process.env.PORT || 8080, function () {
  console.log('listening at port 8080');
});
