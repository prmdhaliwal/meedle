    document.addEventListener('DOMContentLoaded', function() {
        // get the information from the form
        const addAssignmentBtn = document.getElementById('addAssignmentBtn');
        const assignmentModal = document.getElementById('assignmentModal');
        const closeModal = document.getElementById('closeModal');
        const assignmentForm = document.getElementById('assignmentForm');
        const assignmentList = document.getElementById('assignmentList');
        
        // this array will be replaced with the database, was just used temporarily to test stuff
        let assignments = [];

        // to initially open the modal
        addAssignmentBtn.addEventListener('click', function() {
            assignmentModal.style.display = 'flex';
        });
        
        // to close the modal
        closeModal.addEventListener('click', function() {
            assignmentModal.style.display = 'none';
        });

        // to submit the form
        assignmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // form values
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const weighting = document.getElementById('weighting').value;
            const lessonId = document.getElementById('lessonId').value;

            // assignment object, will be replaced by the schema stuff
            const assignment = {
                id: Date.now(), 
                title,
                description,
                weighting,
                lessonId
            };
            
            // this pushes to the temp array for testing
            // instead of this, will need to have a method to create a new doc and send to database
            assignments.push(assignment);

            // this gets the assignments from the database and renders them
            renderAssignments();

            // reset the form
            assignmentForm.reset();
            assignmentModal.style.display = 'none';
            
            // alert feedback, can remove later
            alert('Assignment added successfully!');
        });
        
        // function to render assignments, will need to get from database instead of the temp array
        function renderAssignments() {
            assignmentList.innerHTML = '';

            // checks if no assignments and displays message
            if (assignments.length === 0) {
                assignmentList.innerHTML = '<p>No assignments yet. Click "Add New Assignment" to create your first assignment.</p>';
                return;
            }
            
            // for each assignment, create html and then append to the html
            // basically creates html stuff for each assignment
            // needs to be changed to get from database instead of temporary array
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
// });
