const express = require("express");
const nodemailer = require('nodemailer');
const app = express();
const mongoose = require("mongoose")
const ejs = require("ejs");
const passport = require("passport")
const {initializingPassport,isAuthenticated} = require("./passportConfig")
const expressSession = require("express-session")
const path = require("path")
const multer = require("multer")
const XLSX = require("xlsx");
const ActiveAttendance = require("./models/activeAttendance");
const AllCourses = require("./models/allCourses");
const AllLectures = require("./models/allLectures");
const StudentEnrollment = require("./models/studentEnrollment");
const User = require("./models/user");
const MarkAttendance = require("./models/markAttendance");

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

const emailName = "Edyth Hagenes";
const emailEmail = "edyth17@ethereal.email";
const emailPassword = "u1p3PW6Z7Ymk9SmrzK";

app.set("view engine","ejs")
initializingPassport(passport);


app.use(express.json())
app.use(express.urlencoded({extended:true}))


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
            res.render("dashboard/instructorDashboard",{data:all});
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
        res.render("addStudent/addStudent",{courseName:courseName,courseCode:courseCode});
        
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
                instructorEmail:req.user.email
            })
            // send email to res.email
            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: `${emailEmail}`,
                    pass: `${emailPassword}`
                }
            });
        
            // Message object
            let message = {
                from: `${emailName} ${emailEmail}`,
                to: `${res.email}`,
                subject: `Enrollement in course ${courseCode}`,
                text: `Hello ${res.email}`,
                html: `<p><b>If you have not registered please register in <a href = 'http://localhost:3000' target = "__blank">Here</a></b></p>`
            };
        
            transporter.sendMail(message, (err, info) => {
                if (err) {
                    console.log('Error occurred. ' + err.message);
                    return process.exit(1);
                }
            })
        
        })
        res.redirect("/dashboard/instructor");
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
            res.render("dashboard/studentDashboard",{data:all});
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

// get a particular courses created page for instructor
app.get("/getCourse/:courseID",(req,res)=>{

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
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: `${emailEmail}`,
                    pass: `${emailPassword}`
                }
            });
        
            // Message object
            let message = {
                from:  `${emailName} ${emailEmail}`,
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
        res.redirect("/");
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
            // const s = await User.find({email:req.params.email});
            // if(!s.length)
            const student = await StudentEnrollment.find({courseId:lecture.courseId,studentEmail:req.params.studentEmail});
            if(!student.length){
                res.render("attendanceCredentials/invalidStudent",{studentEmail:req.params.studentEmail,courseCode:student.courseCode});
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

// logout
app.get("/logout",(req,res,next)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.listen(3000,()=>{
    console.log("Listening on port 3000")
});