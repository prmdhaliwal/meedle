let MongoClient = require('mongodb').MongoClient;
let uri = "mongodb://127.0.0.1:27017/fit2101_lms";

MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    db.close();
});


module.exports = {connectDB, client}


// I used Deepseek to explain to me how to create a JS script to store html form information and display it. I then used some examples and edited it to meet my needs.
document.addEventListener('DOMContentLoaded', function() {
    const addAssignmentBtn = document.getElementById('addAssignmentBtn');
    const assignmentModal = document.getElementById('assignmentModal');
    const closeModal = document.getElementById('closeModal');
    const assignmentForm = document.getElementById('assignmentForm');
    const assignmentList = document.getElementById('assignmentList');
    
    let assignments = [];
    
    addAssignmentBtn.addEventListener('click', function() {
        assignmentModal.style.display = 'flex';
    });
    
    closeModal.addEventListener('click', function() {
        assignmentModal.style.display = 'none';
    });

    assignmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const weighting = document.getElementById('weighting').value;
        const lessonId = document.getElementById('lessonId').value;

        // Old test code
        // const assignment = {
        //     id: Date.now(), 
        //     title,
        //     description,
        //     weighting,
        //     lessonId
        // };
        
       
        //assignments.push(assignment); // This will need to connect to database
        // before renderAssignments, need method to get assignments from database
        MongoClient.connect(uri, function(err, db) {
            if(err) throw err;
            let dbo = db.db("test")
            let assignment = { title: title, description: description, weighting: weighting, lessonId: lessonId };
            dbo.collection("assignments").insertOne(assignment, function(err, res) {
                if(err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });

        renderAssignments();
        assignmentForm.reset();
        assignmentModal.style.display = 'none';
        
        alert('Assignment added successfully!');
    });
    
    function renderAssignments() {
        MongoClient.connect(uri, function(err, db) {
            if (err) throw err;
            let dbo = db.db("test");
            dbo.collection("assignments").find({}).toArray(function(err, result) {
                if (err) throw err;
                assignments = result;
                db.close();
            });
        });

        if (assignments.length === 0) {
            assignmentList.innerHTML = '<p>No assignments yet. Click "Add New Assignment" to create your first assignment.</p>';
            return;
        }
        
        assignmentList.innerHTML = '';
        
        assignments.forEach(assignment => {
            const assignmentElement = document.createElement('div');
            assignmentElement.classList.add('assignment-item');
            
            
            assignmentElement.innerHTML = `
                <h3>${assignment.title}</h3>
                <p>${assignment.description}</p>
                <p><strong>Weighting:</strong> ${assignment.weighting}%</p>
                <p><strong>Lesson ID:</strong> ${assignment.lessonId}</p>
            `;
            
            assignmentList.appendChild(assignmentElement);
        });
    }
    
    renderAssignments();
});

