
import { supabase } from './supabaseClient.js';

// ==========================================
// HTML ELEMENTS
// ==========================================

const studentForm = document.querySelector('#student-form');
const studentsList = document.querySelector('#students-list');
const message = document.querySelector('#message');
const submitButton = document.querySelector('#submit-button');
const refreshButton = document.querySelector('#refresh-button');

let registrationInProgress = false;


// ==========================================
// 1. FETCH STUDENTS
// ==========================================

async function fetchStudents() {
  message.textContent = 'Loading students...';
  studentsList.replaceChildren();

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Fetch error:', error);

    message.textContent =
      'Could not load students: ' + error.message;

    return;
  }

  if (!data || data.length === 0) {
    message.textContent = 'No students have been added yet.';
    return;
  }

  message.textContent = '';

  data.forEach((student) => {

    // STUDENT CARD
    const card = document.createElement('article');
    card.className = 'student-card';


    // STUDENT INFORMATION
    const info = document.createElement('div');
    info.className = 'student-info';

    const name = document.createElement('h3');
    name.textContent = student.name;

    const email = document.createElement('p');
    email.textContent = student.email;

    const course = document.createElement('p');
    course.textContent = 'Course: ' + student.course;


    // GET STUDENT INITIALS
    const initials = student.name
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    info.style.setProperty('--initials', `"${initials}"`);


    // EDIT COURSE BUTTON
    const editButton = document.createElement('button');

    editButton.textContent = 'Edit Course';
    editButton.type = 'button';
    editButton.className = 'secondary';

    editButton.addEventListener('click', async () => {

      const newCourse = window.prompt(
        'Enter the new course:',
        student.course
      );

      if (newCourse === null) return;

      if (!newCourse.trim()) {
        message.textContent = 'Course cannot be empty.';
        return;
      }

      editButton.disabled = true;

      const { error } = await supabase
        .from('students')
        .update({
          course: newCourse.trim()
        })
        .eq('id', student.id);

      editButton.disabled = false;

      if (error) {
        console.error('Update error:', error);

        message.textContent =
          'Could not update course: ' + error.message;

        return;
      }

      message.textContent = 'Course updated successfully.';

      await fetchStudents();
    });


    // DELETE BUTTON
    const deleteButton = document.createElement('button');

    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';

    deleteButton.addEventListener('click', async () => {

      const confirmed = window.confirm(
        `Delete ${student.name}?`
      );

      if (!confirmed) return;

      deleteButton.disabled = true;

      message.textContent = 'Deleting student...';

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);

      if (error) {
        console.error('Delete error:', error);

        message.textContent =
          'Could not delete student: ' + error.message;

        deleteButton.disabled = false;

        return;
      }

      message.textContent = 'Student deleted successfully.';

      await fetchStudents();
    });


    // ADD ELEMENTS TO CARD
    info.append(name, email, course);

    card.append(info, editButton, deleteButton);

    studentsList.append(card);

  });
}


// ==========================================
// 2. COMPLETE REGISTRATION AFTER VERIFICATION
// ==========================================

async function completeStudentRegistration(user) {

  if (registrationInProgress) return;

  // Check whether email has been verified
  if (!user || !user.email_confirmed_at) return;

  const name = user.user_metadata?.name;
  const course = user.user_metadata?.course;
  const email = user.email?.trim().toLowerCase();

  if (!name || !course || !email) {
    message.textContent =
      'Registration information is incomplete.';

    return;
  }

  registrationInProgress = true;

  try {

    message.textContent =
      'Email verified! Completing registration...';


    // CHECK IF STUDENT ALREADY EXISTS
    const { data: existingStudent, error: checkError } =
      await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (checkError) {
      throw checkError;
    }


    // PREVENT DUPLICATE STUDENT RECORD
    if (existingStudent) {

      message.textContent =
        'Your registration is already complete.';

      await fetchStudents();

      return;
    }


    // SAVE VERIFIED STUDENT
    const { error: insertError } = await supabase
      .from('students')
      .insert([
        {
          user_id: user.id,
          name,
          email,
          course
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    message.textContent =
      'Email verified! Student registered successfully.';

    await fetchStudents();

  } catch (error) {

    console.error('Registration error:', error);

    message.textContent =
      'Could not complete registration: ' + error.message;

  } finally {

    registrationInProgress = false;

  }
}


// ==========================================
// 3. REGISTER STUDENT
// ==========================================

studentForm.addEventListener('submit', async (event) => {

  event.preventDefault();

  const name = document
    .querySelector('#name')
    .value
    .trim();

  const email = document
    .querySelector('#email')
    .value
    .trim()
    .toLowerCase();

  const password = document
    .querySelector('#password')
    .value;

  const course = document
    .querySelector('#course')
    .value
    .trim();


  // CHECK EMPTY FIELDS
  if (!name || !email || !password || !course) {

    message.textContent = 'Please fill in all fields.';

    return;
  }


  // CHECK EMAIL FORMAT
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {

    message.textContent =
      'Please enter a valid email address.';

    return;
  }


  // CHECK PASSWORD LENGTH
  if (password.length < 8) {

    message.textContent =
      'Password must contain at least 8 characters.';

    return;
  }


  submitButton.disabled = true;

  message.textContent = 'Creating your account...';


  try {

    // CREATE SUPABASE AUTH ACCOUNT
    const { data, error } = await supabase.auth.signUp({

      email,

      password,

      options: {

        data: {
          name,
          course
        },

        emailRedirectTo: window.location.origin

      }

    });


    if (error) {

      console.error('Signup error:', error);

      message.textContent = error.message;

      return;
    }


    // CHECK IF SESSION IS AVAILABLE
    if (data.session && data.user) {

      await completeStudentRegistration(data.user);

      studentForm.reset();

    } else {

      message.textContent =
        'Registration started! Please check your email and click the verification link to complete your registration.';

      studentForm.reset();

    }

  } catch (error) {

    console.error('Registration error:', error);

    message.textContent =
      'Something went wrong: ' + error.message;

  } finally {

    submitButton.disabled = false;

  }

});


// ==========================================
// 4. REFRESH STUDENTS
// ==========================================

refreshButton.addEventListener('click', fetchStudents);


// ==========================================
// 5. CHECK AUTHENTICATION ON PAGE LOAD
// ==========================================

async function initializeApp() {

  const { data, error } = await supabase.auth.getSession();

  if (error) {

    console.error('Session error:', error);

    message.textContent =
      'Could not check your session.';

    return;
  }

  const session = data.session;

  if (session) {

    await completeStudentRegistration(session.user);

  } else {

    message.textContent =
      'Register with your email to get started.';

    studentsList.replaceChildren();

  }

}


// ==========================================
// 6. LISTEN FOR AUTHENTICATION CHANGES
// ==========================================

supabase.auth.onAuthStateChange((event, session) => {

  if (event === 'SIGNED_IN' && session) {

    setTimeout(() => {

      completeStudentRegistration(session.user);

    }, 0);

  }

});


// ==========================================
// 7. START APPLICATION
// ==========================================

initializeApp();


















// import { supabase } from './supabaseClient.js';
// const studentForm = document.querySelector('#student-form');
// const studentsList = document.querySelector('#students-list');
// const message = document.querySelector('#message');
// const submitButton = document.querySelector('#submit-button');
// const refreshButton = document.querySelector('#refresh-button');

// async function fetchStudents() {
// message.textContent = 'Loading students...';
// studentsList.replaceChildren();
// const { data, error } = await supabase
// .from('students')
// .select('*')
// .order('id', { ascending: false });
// if (error) {
// console.error('Fetch error:', error);
// message.textContent = 'Could not load students: ' + error.message;
// return;
// }
// if (data.length === 0) {
// message.textContent = 'No students have been added yet.';
// return;
// }
// message.textContent = '';
// data.forEach((student) => {
// const card = document.createElement('article');
// card.className = 'student-card';
// const info = document.createElement('div');
// info.className = 'student-info';
// const name = document.createElement('h3');
// name.textContent = student.name;
// const email = document.createElement('p');
// email.textContent = student.email;
// const course = document.createElement('p');
// course.textContent = 'Course: ' + student.course;
// const editButton = document.createElement('button');
// editButton.textContent = 'Edit Course';
// editButton.type = 'button';
// editButton.className = 'secondary';
// editButton.addEventListener('click', async () => {
// const newCourse = window.prompt(
// 'Enter the new course:', student.course
// );
// if (newCourse === null) return;
// if (!newCourse.trim()) {
// message.textContent = 'Course cannot be empty.';
// return;
// }
// const { error } = await supabase
// .from('students')
// .update({ course: newCourse.trim() })
// .eq('id', student.id);
// if (error) {
// console.error('Update error:', error);
// message.textContent = 'Could not update course: ' + error.message;
// return;
// }
// message.textContent = 'Course updated successfully.';
// await fetchStudents();
// });
// const deleteButton = document.createElement('button');
// deleteButton.textContent = 'Delete';
// deleteButton.className = 'delete-button';
// deleteButton.type = 'button';
// deleteButton.addEventListener('click', async () => {
// const confirmed = window.confirm(`Delete ${student.name}?`);
// if (!confirmed) return;
// deleteButton.disabled = true;
// message.textContent = 'Deleting student...';
// const { error } = await supabase
// .from('students')
// .delete()
// .eq('id', student.id);
// if (error) {
// console.error('Delete error:', error);
// message.textContent = 'Could not delete student: ' + error.message;
// deleteButton.disabled = false;
// return;
// }
// message.textContent = 'Student deleted successfully.';
// await fetchStudents();
// });
// info.append(name, email, course);
// card.append(info, editButton, deleteButton);
// studentsList.append(card);
// });
// }


// studentForm.addEventListener('submit', async (event) => {
// event.preventDefault();
// const name = document.querySelector('#name').value.trim();
// const email = document.querySelector('#email').value.trim();
// const course = document.querySelector('#course').value.trim();

// if (!name || !email || !course) {
// message.textContent = 'Please fill in all fields.';
// return;
// }
// submitButton.disabled = true;
// message.textContent = 'Saving student...';
// const { error } = await supabase
// .from('students')
// .insert([{ name, email, course }]);
// submitButton.disabled = false;
// if (error) {
// console.error('Insert error:', error);
// message.textContent = 'Could not save student: ' + error.message;
// return;
// }
// studentForm.reset();
// message.textContent = 'Student added successfully!';
// await fetchStudents();
// });


// refreshButton.addEventListener('click', fetchStudents);
// fetchStudents();