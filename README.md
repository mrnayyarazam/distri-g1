# DISTRI G1
### AI-Based Controlled Food Distribution System

**DISTRI G1** is an AI-powered prototype that demonstrates how face recognition can help prevent duplicate food distribution during an event.

The system captures a person's image, detects a face, generates a numerical face embedding, and compares it with embeddings temporarily remembered during the current event. Based on the comparison, the application marks the person as new or duplicate and updates the dashboard.

> **Project status:** Exhibition and demonstration prototype. It is not a production-ready identity or food distribution system.

---

## 🏆 Achievement

**2nd Place | INTELLI-GENZ 2K26**

DISTRI G1 received **Second Place and a Special Commendation Cash Award of ₹750** at the *INTELLI-GENZ 2K26 One Day National Level Technical Symposium*, organised by the Department of Artificial Intelligence and Data Science.

The project was presented as a demonstration of using artificial intelligence to support controlled food distribution.

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Project Objectives](#-project-objectives)
- [How the System Works](#-how-the-system-works)
- [Understanding Face Embeddings](#-understanding-face-embeddings)
- [Technology Stack](#-technology-stack)
- [Main Features](#-main-features)
- [Project Structure](#-project-structure)
- [Requirements](#-requirements)
- [Getting Started](#-getting-started)
- [Using the Application](#-using-the-application)
- [API Endpoints](#-api-endpoints)
- [Temporary Storage and Privacy](#-temporary-storage-and-privacy)
- [Current Limitations](#-current-limitations)
- [Future Improvements](#-future-improvements)
- [Acknowledgements](#-acknowledgements)

---

## 🎯 Problem Statement

During food distribution at an event, the same person may attempt to collect food more than once. This can make distribution less fair and make stock management difficult.

DISTRI G1 explores a computer-vision approach to this problem by comparing face representations captured during the event.

The prototype aims to:

- Recognise previously seen participants.
- Detect repeated distribution attempts.
- Reject images that cannot be processed reliably.
- Track stock and distribution activity through a dashboard.

## 🎯 Project Objectives

1. Build an interactive web interface for controlled food distribution.
2. Integrate an AI-based face detection and recognition model.
3. Compare face embeddings to identify possible duplicate participants.
4. Keep recognised face embeddings temporarily in memory during an event.
5. Display distribution results and operational counters in the dashboard.

---

## 🔄 How the System Works

The application has two main parts: a Next.js frontend and a Python FastAPI backend.

```text
Camera / Image Input
        |
        v
Next.js Frontend
        |
        v
FastAPI Verification API
        |
        v
Image Decoding and Face Detection
        |
        v
Image Quality Validation
        |
        v
Select Target Face
        |
        v
Generate Face Embedding
        |
        v
Compare with Stored Embeddings
        |
        v
Distribution Decision
   /       |        \
  v        v         v
 NEW    DUPLICATE   ERROR
  |        |         |
  v        v         v
Update   Block     Show Warning
Stock    Repeat    or Retry
        |
        v
Dashboard Update
```

### Step 1: Capture an Image

The user captures an image through the application's camera interface or supplies an image through the available input workflow.

### Step 2: Send the Image to the Backend

The frontend sends the image to the FastAPI endpoint:

`POST /verify-face`

The backend decodes the uploaded image into an OpenCV image array.

### Step 3: Detect the Face

InsightFace processes the image and detects visible faces. If no face is detected, the backend returns `NO_FACE`.

When multiple faces are present, the current implementation selects the detected face whose centre is closest to the centre of the image.

### Step 4: Validate Image Quality

The backend checks whether the image is sufficiently sharp using a Laplacian-variance blur check. It also checks whether the selected face is large enough and sufficiently inside the image boundaries.

Poor-quality images may return `BAD_QUALITY`, asking the user to capture a clearer image.

These are basic quality checks, not a guarantee that an image is suitable for reliable identity recognition.

### Step 5: Generate the Face Embedding

InsightFace generates a numerical representation of the selected face. This is called a **face embedding**.

The embedding is normalised before comparison.

### Step 6: Compare with Previously Seen Faces

The backend compares the new embedding with embeddings stored in the temporary event memory. It calculates cosine similarity to estimate how closely the face representations match.

The current initial similarity threshold is:

`SIMILARITY_THRESHOLD = 0.45`

This is a configurable prototype value, not a universally correct threshold. It requires testing and calibration with representative images.

### Step 7: Make a Decision

| Result | Meaning | System action |
|---|---|---|
| `NEW` | No stored embedding meets the duplicate threshold | Remember the embedding and report a successful verification |
| `DUPLICATE` | A stored embedding meets or exceeds the threshold | Block another distribution attempt |
| `NO_FACE` | No face was detected | Request a clearer image |
| `BAD_QUALITY` | The image fails a quality check | Request a better image |
| `BAD_IMAGE` | The image cannot be decoded | Ask for a valid image |

The dashboard tracks remaining stock, successful distribution, duplicate attempts, and errors.

**Important:** Face recognition is probabilistic. The system can incorrectly match different people or fail to match the same person. It should not be treated as a guarantee of identity.

---

## 🧠 Understanding Face Embeddings

A face embedding is a list of numbers generated by a trained AI model to represent facial features. It is not an ordinary photograph and is not a human-readable description of a face.

### Why use embeddings?

Comparing entire photographs pixel by pixel is unreliable. The same person may appear different across photographs because of lighting, angle, facial expression, camera quality, or accessories.

A face recognition model transforms the detected face into an embedding so that the system can compare numerical representations instead of relying on exact pixel equality.

### How does normalisation work?

The backend normalises an embedding using its vector magnitude:

\[
\hat{v}=\frac{v}{\|v\|}
\]

Here:

- \(v\) is the original embedding vector.
- \(\|v\|\) is the vector's magnitude.
- \(\hat{v}\) is the normalised embedding.

For a non-zero vector, this makes its magnitude equal to one. Normalisation allows dot product comparison to represent cosine similarity.

### How does cosine similarity work?

For two normalised embeddings \(a\) and \(b\):

\[
\operatorname{similarity}(a,b)=a\cdot b
\]

The system compares the new embedding with each stored embedding and keeps the highest similarity score.

If the highest score reaches the configured threshold, the prototype marks the person as a duplicate. Otherwise, it marks the person as new and stores the embedding.

### What does the threshold mean?

The threshold controls how similar two embeddings must be before the system treats them as a match.

- A threshold that is too low may incorrectly classify different people as duplicates.
- A threshold that is too high may fail to recognise the same person in a different image.

The appropriate value depends on the model, image conditions, and evaluation data. It should be calibrated using known same-person and different-person image pairs rather than chosen by guesswork.

### What happens when the backend restarts?

The prototype keeps embeddings in a Python list in server memory. It does not save them to a permanent database.

When the backend process restarts, the list is reset, so the system no longer remembers the faces from the previous process.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Web application framework and frontend |
| React | Interactive user interface |
| JavaScript | Frontend behaviour and API requests |
| Tailwind CSS | Dashboard styling |
| Python | Backend application logic |
| FastAPI | HTTP API and image verification endpoints |
| InsightFace | Face detection and face embedding generation |
| `buffalo_l` model | Pretrained InsightFace model used by the prototype |
| ONNX Runtime | Executes supported neural-network operations |
| OpenCV | Image decoding and image-quality processing |
| NumPy | Embedding normalisation and numerical comparison |
| Uvicorn | Runs the FastAPI application |

---

## ✨ Main Features

- Camera-based image capture in the frontend.
- AI-based face detection.
- Face embedding generation and similarity comparison.
- Duplicate distribution detection.
- Basic blur, face-size, and image-boundary validation.
- Temporary in-memory recognition records.
- Dashboard counters for stock and distribution activity.
- Separate handling for duplicates and verification errors.
- FastAPI endpoints with interactive API documentation.

---

## 📁 Project Structure

The following is a simplified view of the project:

```text
distri-g1/
├── app/
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── backend/
│   └── main.py
├── public/
│   └── logo.png
├── .venv/
├── node_modules/
├── package.json
├── package-lock.json
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── .gitignore
└── README.md
```

### Important files and folders

- **`app/page.js`**: Main dashboard, camera workflow, verification requests, and displayed statistics.
- **`app/layout.js`**: Root layout and metadata for the Next.js application.
- **`app/globals.css`**: Global styles and Tailwind CSS import.
- **`backend/main.py`**: FastAPI server, InsightFace initialisation, image validation, embeddings, and duplicate matching.
- **`public/logo.png`**: Logo served as a static asset.
- **`.venv/`**: Local Python virtual environment containing the backend dependencies.
- **`node_modules/`**: Installed JavaScript dependencies.
- **`package.json`**: Frontend dependencies and npm scripts.
- **`package-lock.json`**: Records the resolved npm dependency versions.
- **`README.md`**: Project documentation and setup instructions.

---

## ⚙️ Requirements

Install the following before running the application:

- Git
- Node.js and npm
- Python compatible with the required backend packages
- A supported web browser
- A camera, if testing camera capture
- The InsightFace `buffalo_l` model and the required Python dependencies

The original development environment used Windows and a Python virtual environment at `.venv/`. Different operating systems or Python versions may require adjustments.

---

## 🚀 Getting Started
Repository
- GitHub: https://github.com/mrnayyarazam/distri-g1
_______________________________________________________________________________________________________________
- Clone URL: https://github.com/mrnayyarazam/distri-g1.git
### 1. Clone the Repository

Replace the placeholder below with the actual public GitHub repository URL after making the project available on GitHub.

```bash
git clone <https://github.com/mrnayyarazam/distri-g1.git >
cd dristri-g1
```

Make sure the directory name matches the folder created by the clone operation.

### 2. Install Frontend Dependencies

From the project root, run:

```bash
npm install
```

This installs the packages declared in `package.json` and `package-lock.json`.

### 3. Set Up the Python Environment

On Windows PowerShell, create a virtual environment if you do not already have one:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies used by the project:

```powershell
python -m pip install fastapi "uvicorn[standard]" python-multipart numpy opencv-python insightface onnxruntime
```

**Model setup:** InsightFace needs the configured `buffalo_l` model to be available. The model must be downloaded or provisioned according to the library's supported setup process before verification can work. Model download behaviour can vary by environment. The development machine already had the model initialised.

If you have a compatible local model package or model cache, use that setup rather than assuming the server can download it automatically.

### 4. Start the Backend

Open a terminal at the project root, activate the `.venv` environment, and run:

```powershell
python -m uvicorn backend.main:app --reload
```

The backend runs at:

- **API root:** http://127.0.0.1:8000
- **AI status:** http://127.0.0.1:8000/ai-status
- **Interactive API documentation:** http://127.0.0.1:8000/docs

Keep this terminal open.

### 5. Start the Frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Then open:

**http://localhost:3000**

Keep both the frontend and backend running while using the application.

### 6. Stop the Application

Press `Ctrl + C` in each running terminal to stop the frontend and backend.

---

## 🖥️ Using the Application

1. Start the backend and frontend using the commands above.
2. Open http://localhost:3000 in a browser.
3. Allow camera access if the browser requests it.
4. Capture an image containing a clear, visible face.
5. Start verification.
6. Read the displayed result and dashboard counters.
7. To test duplicate detection, submit another image of the same participant during the same backend session.
8. Restarting the backend clears the temporary recognition memory.

A duplicate test may fail if the image is too different, the face is poorly visible, or the configured similarity threshold is not appropriate. This is an area for further calibration.

### Dashboard metrics

- **Items Remaining:** Current frontend stock counter.
- **Successful Distribution:** Number of successful distribution decisions recorded by the dashboard.
- **Duplicate Attempts:** Number of requests the frontend records as duplicate attempts.
- **Errors:** Number of handled verification failures and connection errors recorded by the frontend.

The frontend counters currently live in React state and may reset when the browser page is refreshed. They should not be treated as a durable transaction record.

---

## 🔌 API Endpoints

The FastAPI backend exposes these endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Check that the backend is running |
| `GET` | `/ai-status` | Return the AI backend status |
| `POST` | `/detect-face` | Detect the number of faces in an uploaded image |
| `POST` | `/verify-face` | Validate an image, compare its face embedding, and return a verification result |

### Test the API through Swagger

1. Start the backend.
2. Open http://127.0.0.1:8000/docs.
3. Expand `POST /verify-face`.
4. Click **Try it out**.
5. Select an image file.
6. Click **Execute**.
7. Inspect the JSON response.

A successful HTTP response may still contain a verification status such as `DUPLICATE` or `BAD_QUALITY`. HTTP status and application decision are different things.

---

## 🔒 Temporary Storage and Privacy

The current prototype keeps face embeddings temporarily in server memory.

- Recognition embeddings are not written to a permanent database.
- The verification backend uses uploaded image bytes in memory for processing.
- Restarting the backend clears the in-memory embedding list.
- The frontend counters are also temporary and may reset after a browser refresh.

This does not automatically mean the entire development environment stores no data elsewhere. Browser behaviour, server logs, backups, and operating-system files may have separate retention behaviour.

Face embeddings are biometric data and should be handled carefully. Obtain appropriate consent before testing on people. Do not use this demonstration as the sole basis for real-world access, identity, or distribution decisions.

---

## ⚠️ Current Limitations

- The application is an exhibition prototype, not a production distribution platform.
- Recognition quality can change with lighting, pose, facial expression, occlusion, image resolution, and camera quality.
- Sunglasses and closed eyes may reduce recognition accuracy.
- The configured threshold has not been established as suitable for all participants and conditions.
- A face match is not proof of identity and can produce false matches or missed matches.
- The current approach selects the face closest to the image centre when multiple faces are detected.
- Embeddings are lost when the backend restarts.
- Dashboard statistics are temporary and are not a permanent audit record.
- The current local setup uses a single backend process and in-memory recognition list.
- Remote use from a mobile phone requires the frontend and backend to be reachable over the network, along with appropriate camera permissions, HTTPS where required, CORS configuration, and deployment settings.

---

## 🔮 Future Improvements

- Calibrate the similarity threshold with representative same-person and different-person test images.
- Improve handling of sunglasses, closed eyes, pose changes, and challenging lighting.
- Add clearer verification feedback and confidence-aware handling for uncertain cases.
- Improve quality validation without unnecessarily rejecting usable images.
- Synchronise dashboard statistics with backend verification results.
- Add a robust method for recording distribution decisions if permanent records become a requirement.
- Integrate mobile camera capture for remote demonstrations.
- Evaluate a suitable deployment platform and model resource requirements.
- Add automated tests for image quality, repeated submissions, and backend error cases.

---

## 🙏 Acknowledgements

Thanks to the organisers and evaluators of **INTELLI-GENZ 2K26** for the opportunity to demonstrate DISTRI G1 and receive Second Place with a Special Commendation Cash Award.

The project was developed as a practical exploration of computer vision, face embeddings, similarity matching, frontend/backend integration, and controlled distribution workflows.

## 👨‍💻 Developer

**Nayyar Azam**

Computer Science Engineering student and developer of DISTRI G1.

GitHub: [@mrnayyarazam](https://github.com/mrnayyarazam)

---

## 📚 References

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [InsightFace Project](https://github.com/deepinsight/insightface)
- [OpenCV Documentation](https://docs.opencv.org/)
- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)

---

*DISTRI G1 is an educational prototype created to demonstrate a possible AI-assisted approach to controlled food distribution. It is not a guarantee of identity or a production-ready biometric system.*
