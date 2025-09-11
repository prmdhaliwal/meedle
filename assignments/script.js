const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://127.0.0.1:27017/fit2101_lms";
const dbName = "test";
const collectionName = "assignments";

MongoClient.connect(uri, function(err, client) {
    if (err) throw err;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);


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

          
            const assignment = {
                id: Date.now(), 
                title,
                description,
                weighting,
                lessonId
            };
            
        
            //assignments.push(assignment); // This will need to connect to database
            // before renderAssignments, need method to get assignments from database
            collection.insertOne(assignment, function(err, res) {
                if (err) throw err;
                console.log("doc inserted"); 
            });

            renderAssignments();
            assignmentForm.reset();
            assignmentModal.style.display = 'none';
            
            alert('Assignment added successfully!');
        });
        
        function renderAssignments() {
            assignmentList.innerHTML = '';
            
            collection.find({}).toArray(function(err, assignments) {
                if (err) throw err;
            });


            if (assignments.length === 0) {
                assignmentList.innerHTML = '<p>No assignments yet. Click "Add New Assignment" to create your first assignment.</p>';
                return;
            }
            
            
            
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
});
