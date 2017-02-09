var Excel = require('exceljs');
var workbook = new Excel.Workbook();
'https://webkiosk.jiit.ac.in/StudentFiles/Academic/ViewDatewiseLecAttendance.jsp?EXAM=2017EVESEM&CTYPE=R&SC=090345&LTP=L&&mRegConfirmDate=06-01-2017&mRegConfirmDateOrg=06-01-2017&prevLFSTID=&mLFSTID=JIIT1609001'

workbook.xlsx.readFile(__dirname + '/TimeTable/BTechVIIISem.xlsx')
  .then(function(sheet) {
      // use workbook
      console.log(sheet);
  });