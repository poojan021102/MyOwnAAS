const express = require("express");
const nodemailer = require('nodemailer');
const app = express();
const mongoose = require("mongoose");
const ejs = require("ejs");
const passport = require("passport");
const {initializingPassport,isAuthenticated} = require("./passportConfig");
const expressSession = require("express-session");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");
const ActiveAttendance = require("./models/activeAttendance");
const AllCourses = require("./models/allCourses");
const AllLectures = require("./models/allLectures");
const StudentEnrollment = require("./models/studentEnrollment");
const User = require("./models/user");
const MarkAttendance = require("./models/markAttendance");
const allCourses = require("./models/allCourses");
const allLectures = require("./models/allLectures");
const studentEnrollment = require("./models/studentEnrollment");
const markAttendance = require("./models/markAttendance");
const user = require("./models/user");
const xl = require("excel4node");

const storage = multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,"./uploads");
    },
    filename: (req,file,callback)=>{
        callback(null,file.fieldname + '-' + Date.now() + path.extname(
            file.originalname
        ))
    } 
});

const upload = multer({storage:storage});

// connect database

const user_name= '202001028';
const password= '59qvguSDzT3XlS0c';
const url = `mongodb+srv://202001028:${password}@cluster0.fxivxyw.mongodb.net/?retryWrites=true&w=majority`
mongoose.connect(url,{useNewUrlParser:true})
const con = mongoose.connection
con.on('open',()=>{
    console.log('Database connected...')
})

// const emailName = "Rosalee Ferry";
// const emailEmail = "rosalee.ferry0@ethereal.email";
// const emailPassword = "6aAGhJPAC88yShD2A8";

const emailEmail = "poojanpatel02112002@gmail.com"
const emailPassword = "yozbsphjlxhtggpl"

app.set("view engine","ejs")
initializingPassport(passport);


app.use(express.json())
app.use(express.urlencoded({extended:true}))


app.use('/coursePage',express.static(__dirname + '/views/coursePage'));


app.use(expressSession({secret:"secret",resave:false,
saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

// home page
app.get("/",async(req,res)=>{
    if(!req.user) res.render("homePage/homePage");
    else{
        if(req.user.role === "student")res.redirect("/dashboard/student");
        else res.redirect("/dashboard/instructor");
    }
});


// instructor register
app.post("/register/instructor",async(req,res)=>{
    const user = await User.findOne({email:req.body.email})
    if (user){
        res.redirect("/register/instructor");
    }
    else{
        const newUser=await User.create(req.body);
        res.redirect("/login/instructor")
    }
});
app.get("/register/instructor",(req,res)=>{
    res.render("register/instructorRegister")
})

// student register
app.post("/register/student",async(req,res)=>{
    const user = await User.findOne({email:req.body.email})
    if(user){
        res.redirect("/register/student")
    }
    else{
        const newUser=await User.create(req.body);
        res.redirect("/login/student")
    }
});
app.get("/register/student",(req,res)=>{
    res.render("register/studentRegister")
})

// instructor login
app.post("/login/instructor",passport.authenticate("local",{failureRedirect:"/login/instructor",successRedirect:"/dashboard/instructor"}),(req,res)=>{
    
})
app.get("/login/instructor",(req,res)=>{
    res.render("login/instructorLogin");
})

// student login
app.post("/login/student",passport.authenticate("local",{failureRedirect:"/login/student",successRedirect:"/dashboard/student"}),(req,res)=>{

})
app.get("/login/student",(req,res)=>{
    res.render("login/studentLogin");
})

// instructor dashboard
app.get("/dashboard/instructor",async(req,res)=>{
    if(!req.user)res.redirect("/");
    else{
        if(req.user.role == "student"){
            res.redirect("/dashboard/student");
        }
        else{
            // console.log(req.user.id.toString())
            const all = await AllCourses.find({instructorId:req.user.id});
            res.render("dashboard/instructorDashboard",{data:all,instructorEmail:req.user.email,firstName:req.user.firstName,lastName:req.user.lastName});
        }
    }
})

// add student for instructor
app.get("/addStudent/:courseName/:courseCode/:courseId",(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    }
    else{
        let courseName = req.params.courseName;
        let courseCode = req.params.courseCode;
        res.render("addStudent/addStudent",{courseId:req.params.courseId,courseName:courseName,courseCode:courseCode,instructorEmail:user.email});
    }
})

app.post("/addStudent/:courseName/:courseCode/:courseId",upload.single("file"),async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    } 
    else{
        const file = XLSX.readFile(req.file.path);
        const courseId = req.params.courseId;
        const courseName = req.params.courseName;
        const courseCode = req.params.courseCode;
        const sheets = file.SheetNames
        data = [];
        for (let i = 0;i<sheets.length;++i){
            const temp = XLSX.utils.sheet_to_json(
                file.Sheets[file.SheetNames[i]]
                );
                temp.forEach((res)=>{
                data.push(res);
            })
        }
        data.forEach(res=>{
            StudentEnrollment.create({
                courseId: new mongoose.Types.ObjectId(courseId),
                studentEmail:res.email,
                courseName: courseName,
                instructorId:req.user.id,
                courseCode: courseCode,
                courseName:courseName,
                instructorName:req.user.firstName,
                instructorEmail:req.user.email,
                studentName:res.name
            })
            // send email to res.email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 465,
                auth: {
                    user: `${emailEmail}`,
                    pass: `${emailPassword}`
                }
            });
            
            // Message object
            let message = {
                from: `${emailEmail}`,
                to: `${res.email}`,
                subject: `Enrollement in course ${courseCode}`,
                text: `Hello ${res.name}`,
                html: `<p><b>If you have not registered please register in <a href = 'http://localhost:3000' target = "__blank">Here</a></b></p>`
            };
        
            transporter.sendMail(message, (err, info) => {
                if (err) {
                    console.log('Error occurred. ' + err.message);
                    return process.exit(1);
                }
            })
        
        })
        res.redirect(`/coursePage/${req.params.courseId}`);
    }
});


// student dashboard
app.get("/dashboard/student",async(req,res)=>{
    if(!req.user)res.redirect("/");
    else{
        if(req.user.role == "instructor"){
            res.redirect("/dashboard/instructor");
        }
        else{
            const all = await StudentEnrollment.find({studentEmail:req.user.email});
            res.render("dashboard/studentDashboard",{data:all,studentEmail:req.user.email,firstName:req.user.firstName,lastName:req.user.lastName});
        }
    }
})


// create course for instructor
app.post("/createCourse",async(req,res)=>{
    if(! req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student")
    }
    else{
        try{
            course = await AllCourses.create({
                courseCode: req.body.courseCode,
                instructorId: req.user.id,
                courseName:req.body.courseName
            });
            res.redirect("/dashboard/instructor");
        }
        catch(err){
            res.redirect("/dashboard/instructor");
        }
    }
})
app.get("/createCourse",(req,res)=>{
    if(! req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    }
    else{
        res.render("createCourse/createCourse")
    }
})

// delete course for instructor
app.get("/deleteCourse/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    }
    else{
        const a = await AllCourses.deleteMany({
            "_id": new mongoose.Types.ObjectId(req.params.courseId)
        });
        const c = await allLectures.find({
            "courseId":new mongoose.Types.ObjectId(req.params.courseId)
        });
        await allLectures.deleteMany({
            "courseId":new mongoose.Types.ObjectId(req.params.courseId)
        });
        for(let i = 0;i<c.length;++i){
            await ActiveAttendance.deleteMany({
                "lectureId":c[i].id
            });
        }
        await MarkAttendance.deleteMany({
            "lectureId":new mongoose.Types.ObjectId(req.params.courseId)
        });
        await StudentEnrollment.deleteMany({
            "courseId":new mongoose.Types.ObjectId(req.params.courseId)
        });
        res.redirect("/dashboard/instructor");
    }
})


// open attendance for a particular course
app.get("/openAttendance/:courseId",(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    }
    else{
        res.render("openAttendance/openAttendance",{courseId:req.params.courseId});
    }
})

app.post("/openAttendance/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else if(req.user.role == "student"){
        res.redirect("/dashboard/student");
    }
    else{
        courseId = req.params.courseId;
        const w = await AllLectures.create({
            courseId:new mongoose.Types.ObjectId(courseId),
            lectureName:req.body.lectureName
        });
        const listOfStudents = await StudentEnrollment.find({courseId:new mongoose.Types.ObjectId(courseId)});
        s = [];
        for(let i=0;i<listOfStudents.length;++i){
            s.push(listOfStudents[i].studentEmail);
        }
        // start new attendance
        
        
        const t = await ActiveAttendance.create({
            lectureId:w.id,
            startTime: new Date(),
            minutes:req.body.minutes
        });
        
        
        // send email to /t.id/studentEmail
        for(let i = 0;i<s.length;++i){
            // send email to res.email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 465,
                auth: {
                    user: `${emailEmail}`,
                    pass: `${emailPassword}`
                }
            });
        
            // Message object
            let message = {
                from:  `${emailEmail}`,
                to: `${s[i]}`,
                subject: `Attendance in course ${listOfStudents[i].courseCode}`,
                text: `Hello ${s[i]}`,
                html: `<p><h2>Attendance started for ${listOfStudents[i].courseCode} <a target = "__blank" href = "http://localhost:3000/markAttendance/${t.id}/${s[i]}">Here</a></h2><br><b>If you have not registered please register in <a target = "__blank" href = 'http://localhost:3000'>Here</a></b></p>`
            };
        
            transporter.sendMail(message, (err, info) => {
                if (err) {
                    console.log('Error occurred. ' + err.message);
                    return process.exit(1);
                }
            })
        }
        res.redirect(`/coursePage/${req.params.courseId}`);
    }
});

// mark attendance for student
app.get("/markAttendance/:attendanceId/:studentEmail",async(req,res)=>{
    const attendance = await ActiveAttendance.findById(new mongoose.Types.ObjectId(req.params.attendanceId));
    if(!attendance){
        res.render("attendanceCredentials/noAttendance");
    }
    else{
        let minu = new Date(attendance.startTime);
        const lecture = await AllLectures.findById(attendance.lectureId);
        if(!lecture){
            res.render("attendanceCredentials/invalidLecture");
        }
        else{
            const student = await StudentEnrollment.find({courseId:lecture.courseId,studentEmail:req.params.studentEmail});
            if(!student.length){
                res.render("attendanceCredentials/invalidStudent",{studentEmail:req.params.studentEmail});
            }
            else{
                const mark1 = await MarkAttendance.find({
                    lectureId:lecture.id,
                    lectureName:lecture.lectureName,
                    studentEmail:req.params.studentEmail,
                    courseId:lecture.courseId
                });
                // console.log(mark1);
                if(!mark1.length){
                    let curr = new Date();
                    let diff = Math.abs(minu - curr)/(1000*60);
                    if(diff <= attendance.minutes){
                        const mark = await MarkAttendance.create({
                            lectureId:lecture.id,
                            lectureName:lecture.lectureName,
                            studentEmail:req.params.studentEmail,
                            courseId:lecture.courseId
                        });
                        const course = await AllCourses.findById(lecture.courseId);
                        res.render("attendanceCredentials/successAttendance",{courseCode:course.courseCode,studentEmail:req.params.studentEmail});
                    }
                    else{
                        res.render("attendanceCredentials/lateAttendance");
                    }
                }
                else{
                    res.render("attendanceCredentials/alreadyMarked");
                }
            }
        }
    }
});

// course Page
app.get("/coursePage/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else{
        if(req.user.role == "student"){
            res.redirect("/dashboard/student");
        }
        else{
            const course = await allCourses.findById(new mongoose.Types.ObjectId(req.params.courseId));
            if(!course){
                res.redirect("/");
            }
            else{
                const number = await studentEnrollment.find({
                    courseId: new mongoose.Types.ObjectId(req.params.courseId)
                });
                const lectures = await allLectures.find({
                    courseId:new mongoose.Types.ObjectId(req.params.courseId)
                })
                const actualNumber = await markAttendance.find({
                    courseId: new mongoose.Types.ObjectId(req.params.courseId)
                })
                // console.log(actualNumber)
                let averageAttendance = (actualNumber.length/(lectures.length*number.length))*100;
                if(isNaN(averageAttendance)){
                    averageAttendance = 0;
                }
                allStudentDetails = [];
                for(let i = 0;i<number.length;++i){
                    allStudentDetails.push({email:number[i].studentEmail,studentName:number[i].studentName});
                }
                allLecturePage = [];
                lectureData = {};
                allLectureNames = [];
                for(let i = 0;i<lectures.length;++i){
                    allLecturePage.push({
                        id:lectures[i].id,
                        lectureName:lectures[i].lectureName
                    })
                    lectureData[lectures[i].lectureName] = 0;
                }
                for(let i = 0;i<actualNumber.length;i++){
                    lectureData[actualNumber[i].lectureName] += 1;
                }
                allLectureCount = [];
                Object.keys(lectureData).forEach(function(key) {
                    allLectureNames.push(key);
                    allLectureCount.push(lectureData[key]);
                  })

                res.render("coursePage/index",{
                    courseId:req.params.courseId,
                    courseCode:course.courseCode,
                    courseName: course.courseName,
                    numberOfStudentEnrolled: number.length,
                    numberOfLectures:lectures.length,
                    averageAttendance:averageAttendance,
                    instructorEmail:req.user.email,
                    studentDetails:allStudentDetails,
                    allLectures:allLecturePage,
                    allLectureNames:allLectureNames,
                    allLectureCount:allLectureCount
                });
            }
        }
    }
})

//lecture Page
app.get("/lecturePage/:lectureId/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else{
        if(req.user.role == "student"){
            res.redirect("/dashboard/student");
        }
        else{
            const allStudent = await studentEnrollment.find({
                courseId:new mongoose.Types.ObjectId(req.params.courseId) 
            });
            const course = await allCourses.findById(new mongoose.Types.ObjectId(req.params.courseId));
            // console.log(course)
            // console.log(allStudent)
            if(!course){
                res.redirect("/");
            }
            else if(!allStudent.length){
                res.redirect("/");
            }
            else{
                // console.log("Here")
                allStudentData = {};
                studentName = {};
                for(let i = 0;i<allStudent.length;++i){
                    allStudentData[allStudent[i].studentEmail] = 0;
                    studentName[allStudent[i].studentEmail] = allStudent[i].studentName;
                }
                const marked = await markAttendance.find({
                    lectureId:new mongoose.Types.ObjectId(req.params.lectureId)
                });
                const lec = await allLectures.findById(new mongoose.Types.ObjectId(req.params.lectureId));
                const allLec = await allLectures.find({
                    courseId:new mongoose.Types.ObjectId(req.params.courseId)
                });
                
                if(!allLec.length || !lec){
                    res.redirect("/");
                }
                else{
                    for(let i = 0;i<marked.length;++i){
                        allStudentData[marked[i].studentEmail] = 1;
                    }
                    allStudents = [];
                    Object.keys(allStudentData).forEach(function(key) {
                        allStudents.push({email:key,count:allStudentData[key],studentName:studentName[key]});
                    });
                    res.render("lecturePage/index",{
                        allStudentData:allStudents,
                        courseCode:course.courseCode,
                        courseName:course.courseName,
                        courseId:req.params.courseId,
                        allLectures:allLec,
                        instructorEmail:req.user.email,
                        lectureName: lec.lectureName,
                    });
                }
            }
        }
    }
}) 

// student Course Page
app.get("/studentCoursePage/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else{
        if(req.user.role == "instructor"){
            res.redirect("/dashboard/instructor");
        }
        else{
            // console.log(req.params.courseId)
            const course = await allCourses.findById(new mongoose.Types.ObjectId(req.params.courseId));
            const allLectureMade = await allLectures.find({
                courseId:new mongoose.Types.ObjectId(req.params.courseId)
            });
            const markedAttendance = await MarkAttendance.find({
                courseId:new mongoose.Types.ObjectId(req.params.courseId),
                studentEmail:req.user.email
            });
            if(!course){
                res.redirect("/dashboard/student");
            }
            else{
                allLectureId = {};
                allLectureName = {};
                for(let i = 0;i<allLectureMade.length;++i){
                    allLectureId[allLectureMade[i].id] = 0;
                    allLectureName[allLectureMade[i].id] = allLectureMade[i].lectureName;
                }
                for(let i = 0;i<markedAttendance.length;++i){
                    allLectureId[markedAttendance[i].lectureId] = 1;
                }
                actualLectureName = [];
                actualLectureStatus = [];
                Object.keys(allLectureId).forEach(function(key) {
                    actualLectureName.push(allLectureName[key]);
                    actualLectureStatus.push(allLectureId[key]);
                  });
                  let avg = (markedAttendance.length/allLectureMade.length)*100;
                  if(isNaN(avg)){
                      avg = 0;
                    }
                    res.render("studentCoursePage/studentCoursePage",{
                    courseCode:course.courseCode,
                    courseName:course.courseName,
                    studentEmail:req.user.email,
                    firstName:req.user.firstName,
                    lastName:req.user.lastName,
                    totalLectureCreated:allLectureMade.length,
                    markedAttendance:markedAttendance.length,
                    averageAttendance:avg,
                    courseId:course.id,
                    actualLectureName:actualLectureName,
                    actualLectureStatus:actualLectureStatus
                });
            }
        }
    }
});

// download report
app.get("/downloadReport/:courseId",async(req,res)=>{
    if(!req.user){
        res.redirect("/");
    }
    else{
        if(req.user.role == "student"){
            res.redirect("/dashboard/student");
        }
        else{
            const course = await allCourses.findById(new mongoose.Types.ObjectId(req.params.courseId));
            if(!course){
                res.redirect("/");
            }
            else{
                const allLec = await allLectures.find({
                    courseId:new mongoose.Types.ObjectId(req.params.courseId)
                });
                headerName = ["Student Email"];
                lectureData = {};
                for(let i = 0;i<allLec.length;++i){
                    headerName.push(allLec[i].lectureName);
                }
                const allStudent = await StudentEnrollment.find({
                    courseId:new mongoose.Types.ObjectId(req.params.courseId)
                });
                for(let i = 0;i<allStudent.length;++i){
                    lectureData[allStudent[i].studentEmail] = {};
                    for(let j = 1;j<headerName.length;++j){
                        lectureData[allStudent[i].studentEmail][headerName[j]] = "0";
                    }
                }
                const mark = await markAttendance.find({
                    courseId:new mongoose.Types.ObjectId(req.params.courseId)
                });
                for(let i = 0;i<mark.length;++i){
                    lectureData[mark[i].studentEmail][mark[i].lectureName] = "1";
                }

                const wb = new xl.Workbook();
                const ws = wb.addWorksheet(`${course.courseCode}-${course.courseName}`);
                colIndex = 1;
                headerName.forEach(item=>{
                    ws.cell(1,colIndex++).string(item);
                });
                let rowIndex = 2;
                Object.keys(lectureData).forEach(key=>{
                    colIndex = 1;
                    ws.cell(rowIndex,colIndex++).string(key);
                    Object.keys(lectureData[key]).forEach(lec=>{
                        ws.cell(rowIndex,colIndex++).string(lectureData[key][lec]);
                    })
                    rowIndex++;
                });
                const n = `downloadReport/${course.courseCode}-${course.courseName}.xlsx`; 
                wb.write(n);
                res.download(n);
            }
        }
    }
})

// logout
app.get("/logout",(req,res,next)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.use((req, res, next) => {
    res.status(404).render("pageNotFound/pageNotFound");
})
app.listen(3000,()=>{
    console.log("Listening on port 3000")
});