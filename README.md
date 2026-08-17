Ultra Class

Ultra Class is a mobile-responsive, role-based classroom interaction system developed as an MSc project at the University of Strathclyde. It combines classroom session management, student questions, MCQ polling, AI-supported analysis and anonymised evaluation logging in one MERN-stack application.

Features

Administrator: manages staff, students, courses, subjects, lecturer assignments, bulk uploads and settings.

Lecturer: creates sessions, shares QR/session codes, manages questions, runs MCQ polls, reviews participants, uses AI-supported insights and exports evaluation data.

Student: joins authorised sessions, submits questions, attempts quizzes, reviews quiz history and views lecturer-approved summaries.

AI support: question clustering, engagement and sentiment analysis, session summaries and teaching recommendations.

Evaluation logging: records selected research tasks using anonymised participant codes and supports CSV/Excel export.

The postponed attendance concept is not part of the evaluated release and is retained only as future work.

Technology stack

Layer

Technology

Frontend

React 19, Vite 8, Axios, React QR Code

Backend

Node.js, Express 5

Database

MongoDB and Mongoose

Authentication

JSON Web Tokens and bcrypt

AI integration

Google Gemini through @google/genai

Export

ExcelJS and XLSX

Prerequisites

Node.js 20.19 or later (a current LTS release is recommended)

npm

MongoDB Community Server or MongoDB Atlas

Git

A modern browser

A valid Gemini API key for the AI features

Check the installed tools in PowerShell:

node --version
npm --version
git --version
mongod --version

Project structure

ultra_class/
├── backend/       # Express API, MongoDB models and AI services
├── frontend/      # React and Vite user interface
├── .gitignore
└── README.md

Step 1: Clone or open the project

If it is already downloaded:

cd "C:\path\to\ultra_class"

Step 2: Install backend dependencies

cd backend
npm ci

Use npm install instead when intentionally updating dependencies. Do not run both commands.

Step 3: Configure the backend

Copy-Item .env.example .env
notepad .env

Complete the following values:

GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=an_available_gemini_model
JWT_SECRET=a_long_random_secret
EVALUATION_ANONYMISATION_SECRET=a_different_long_random_secret
MONGODB_URI=mongodb://127.0.0.1:27017/ultra_class
PORT=5000
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEFAULT_ADMIN_EMAIL=admin@ultraclass.local
DEFAULT_ADMIN_PASSWORD=a_strong_private_password

Security requirements:

Never commit backend/.env.

Use different long values for the JWT and anonymisation secrets.

Keep JWT_SECRET stable between restarts; changing it invalidates existing login tokens.

Never share API keys or passwords in screenshots, ZIP files or documentation.

Step 4: Start MongoDB

If MongoDB is installed as a Windows service, open an Administrator PowerShell:

net start MongoDB

Alternatively, run it manually:

New-Item -ItemType Directory -Force "C:\data\db"
mongod --dbpath "C:\data\db"

Keep the manual MongoDB terminal open. MongoDB Atlas users should put their Atlas connection string in MONGODB_URI instead.

Step 5: Run the backend

From ultra_class\backend:

npm run dev

For execution without automatic restart:

npm start

Expected output includes:

MongoDB Connected
Server running on http://0.0.0.0:5000

Open http://localhost:5000. It should report that the Ultra Class backend is running.

Step 6: Install frontend dependencies

Open a second PowerShell terminal:

cd "C:\path\to\ultra_class\frontend"
npm ci

Step 7: Configure the frontend

Copy-Item .env.example .env
notepad .env

For use on the same computer:

VITE_API_URL=http://localhost:5000
VITE_APP_URL=http://localhost:5173

Step 8: Run the frontend

For laptop-only access:

npm run dev

Open http://localhost:5173.

For access from phones and other computers on the same network:

npm run dev -- --host

Step 9: Connect phones on the same Wi-Fi

Find the laptop IPv4 address:

ipconfig

Locate the active Wi-Fi adapter. If the address is 192.168.1.115, update frontend/.env:

VITE_API_URL=http://192.168.1.115:5000
VITE_APP_URL=http://192.168.1.115:5173

Update backend/.env:

FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.115:5173

Restart both servers after any .env change:

# Backend terminal
Ctrl+C
npm run dev

# Frontend terminal
Ctrl+C
npm run dev -- --host

Open this on each phone:

http://192.168.1.115:5173

Replace the example with the actual address. Do not use localhost in a QR URL intended for another device. Allow Node.js through Windows Firewall on private networks if prompted. Institutional Wi-Fi may isolate devices; use a private router or mobile hotspot if required.

Step 10: Initial setup and workflow

On a new database, the backend creates the administrator specified by DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD. It is created only if it does not already exist.

Recommended first-run sequence:

Log in as administrator.

Create courses and subjects.

Create lecturer and student accounts.

Assign lecturers and register students.

Log in as a lecturer and create a session.

Let registered students join using the code or QR.

Students submit questions and attempt the MCQ poll.

The lecturer reviews questions and AI features.

End the session and publish the approved summary.

Export anonymised evaluation data when required.

Code-quality checks

Run frontend linting and create the production build:

cd frontend
npm run lint
npm run build

Preview the build:

npm run preview -- --host

Check the backend entry file:

cd ..\backend
node --check server.js

frontend/dist is generated by the build and is intentionally excluded from Git.

Troubleshooting

401 Unauthorized

Log out, refresh and log in again. The token may be missing, expired or signed using an earlier JWT secret. If necessary, run this in the browser console:

localStorage.removeItem("authToken");
localStorage.removeItem("ultraClassUser");
location.reload();

API route not found

Verify the frontend API URL and backend port. JavaScript URLs containing ${API_URL} must use backticks rather than quotation marks.

Frontend origin is blocked

Add the exact frontend address to FRONTEND_ORIGINS and restart the backend.

Phone cannot connect

Use npm run dev -- --host.

Use the laptop IPv4 address, not localhost.

Confirm all devices use the same network.

Check Windows Firewall and whether the IP changed.

Use a hotspot if the Wi-Fi isolates devices.

MongoDB connection error

Confirm MongoDB is running and use:

MONGODB_URI=mongodb://127.0.0.1:27017/ultra_class

AI generation fails

Confirm that the Gemini key and model are valid, the computer has internet access and the selected model is available to the API key.

Analytics displays an old question count

Return to Session Details and reopen Analytics. This release refreshes session questions before loading the page.

Security and privacy

Passwords are hashed using bcrypt.

Protected routes use JWT authentication and role checks.

Only registered students can join relevant subject sessions.

Gemini requests pass through the backend, keeping the API key out of browsers.

Identifiable participant data is not intentionally submitted to Gemini.

Evaluation events use HMAC-based anonymous participant codes.

Real environment files and generated dependencies are excluded from Git.

Evaluation scope

The prototype was evaluated in one structured session with eight student participants. No lecturer volunteers were recruited during the available period. Lecturer functionality was technically tested but not evaluated by representative teaching staff. The results provide preliminary usability evidence and do not establish long-term improvements in learning outcomes.

Future work

Larger and longitudinal student and lecturer evaluation.

Accessibility and multilingual improvements.

Institutional learning-platform integration.

Production cloud deployment, monitoring and backups.

A privacy-preserving attendance mechanism, subject to separate design and ethical review.

Author

Sai Krishna Teja Nerusu

MSc Advanced Computer Science with Artificial Intelligence

University of Strathclyde

Academic project notice

Ultra Class is an academic prototype. It requires production-grade configuration, security review and target-environment testing before institutional or public deployment.