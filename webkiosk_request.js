var request = require('request');
var querystring = require('querystring');
var form = {
  x: "",
  txtInst: "Institute",
  InstCode: "JIIT",
  txtuType: "Member Type",
  UserType: "S",
  txtCode: "Enrollment No",
  MemberCode: "13103687",
  txtPin: "Password/Pin",
  Password: "017687IM",
  BTNSubmit: "Submit",
  DOB: "DOB",
  DATE1: "10-12-1995"
}
var cookieJar = request.jar(),
    formData = querystring.stringify(form),
    loginURL = 'https://webkiosk.jiit.ac.in/CommonFiles/UserAction.jsp?' + formData;

console.log(loginURL);

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
      request({
        method: 'GET',
        url: 'https://webkiosk.jiit.ac.in/StudentFiles/FrameLeftStudent.jsp',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Connection': 'keep-alive'
        },
        jar: cookieJar
      }, function (err, res, body) {
          
      })
    }
})






