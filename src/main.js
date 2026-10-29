import { supabase } from './supabaseClient.js';
const studentForm = document.querySelector('#student-form');
const studentsList = document.querySelector('#students-list');
const message = document.querySelector('#message');
const submitButton = document.querySelector('#submit-button');
const refreshButton = document.querySelector('#refresh-button');

async function fetchStudents() {
message.textContent = 'Loading students...';
studentsList.replaceChildren();
const { data, error } = await supabase
.from('students')
.select('*')
.order('id', { ascending: false });
if (error) {
console.error('Fetch error:', error);
message.textContent = 'Could not load students: ' + error.message;
return;
}
if (data.length === 0) {
message.textContent = 'No students have been added yet.';
return;
}
message.textContent = '';
data.forEach((student) => {
const card = document.createElement('article');
card.className = 'student-card';
const info = document.createElement('div');
info.className = 'student-info';
const name = document.createElement('h3');
name.textContent = student.name;
const email = document.createElement('p');
email.textContent = student.email;
const course = document.createElement('p');
course.textContent = 'Course: ' + student.course;
const editButton = document.createElement('button');
editButton.textContent = 'Edit Course';
editButton.type = 'button';
editButton.className = 'secondary';
editButton.addEventListener('click', async () => {
const newCourse = window.prompt(
'Enter the new course:', student.course
);
if (newCourse === null) return;
if (!newCourse.trim()) {
message.textContent = 'Course cannot be empty.';
return;
}
const { error } = await supabase
.from('students')
.update({ course: newCourse.trim() })
.eq('id', student.id);
if (error) {
console.error('Update error:', error);
message.textContent = 'Could not update course: ' + error.message;
return;
}
message.textContent = 'Course updated successfully.';
await fetchStudents();
});
const deleteButton = document.createElement('button');
deleteButton.textContent = 'Delete';
deleteButton.className = 'delete-button';
deleteButton.type = 'button';
deleteButton.addEventListener('click', async () => {
const confirmed = window.confirm(`Delete ${student.name}?`);
if (!confirmed) return;
deleteButton.disabled = true;
message.textContent = 'Deleting student...';
const { error } = await supabase
.from('students')
.delete()
.eq('id', student.id);
if (error) {
console.error('Delete error:', error);
message.textContent = 'Could not delete student: ' + error.message;
deleteButton.disabled = false;
return;
}
message.textContent = 'Student deleted successfully.';
await fetchStudents();
});
info.append(name, email, course);
card.append(info, editButton, deleteButton);
studentsList.append(card);
});
}


studentForm.addEventListener('submit', async (event) => {
event.preventDefault();
const name = document.querySelector('#name').value.trim();
const email = document.querySelector('#email').value.trim();
const course = document.querySelector('#course').value.trim();

if (!name || !email || !course) {
message.textContent = 'Please fill in all fields.';
return;
}
submitButton.disabled = true;
message.textContent = 'Saving student...';
const { error } = await supabase
.from('students')
.insert([{ name, email, course }]);
submitButton.disabled = false;
if (error) {
console.error('Insert error:', error);
message.textContent = 'Could not save student: ' + error.message;
return;
}
studentForm.reset();
message.textContent = 'Student added successfully!';
await fetchStudents();
});


refreshButton.addEventListener('click', fetchStudents);
fetchStudents();