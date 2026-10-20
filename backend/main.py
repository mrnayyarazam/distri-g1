from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import insightface
import cv2
import numpy as np

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# AI MODEL
# ==============================

face_app = insightface.app.FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


# ==============================
# TEMPORARY EVENT MEMORY
# ==============================

known_embeddings = []

# Initial similarity threshold.
# We can calibrate this after testing with real photos.
SIMILARITY_THRESHOLD = 0.70


# ==============================
# HELPER FUNCTIONS
# ==============================

def normalize_embedding(embedding):
    """Normalize a face embedding."""
    norm = np.linalg.norm(embedding)

    if norm == 0:
        return embedding

    return embedding / norm


def cosine_similarity(embedding_a, embedding_b):
    """Calculate cosine similarity between two embeddings."""
    return float(np.dot(embedding_a, embedding_b))


def get_center_face(faces, image_width, image_height):
    """
    If multiple faces exist, select the face
    closest to the center of the image.
    """

    image_center_x = image_width / 2
    image_center_y = image_height / 2

    def distance_from_center(face):
        x1, y1, x2, y2 = face.bbox

        face_center_x = (x1 + x2) / 2
        face_center_y = (y1 + y2) / 2

        return (
            (face_center_x - image_center_x) ** 2
            + (face_center_y - image_center_y) ** 2
        )

    return min(faces, key=distance_from_center)

def is_image_blurry(image, threshold=50):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    return blur_score < threshold, blur_score

def validate_face_quality(face, image_width, image_height):
    x1, y1, x2, y2 = face.bbox

    face_width = x2 - x1
    face_height = y2 - y1

    if face_width < 100 or face_height < 100:
        return False, "Face is too small. Move closer to the camera."

    margin = 5

    if (
        x1 < margin
        or y1 < margin
        or x2 > image_width - margin
        or y2 > image_height - margin
    ):
        return False, "Face is cut off. Keep your full face inside the frame."

    return True, "Face quality passed."


# ==============================
# BASIC ROUTES
# ==============================

@app.get("/")
def root():
    return {
        "status": "DISTRI G1 backend is running"
    }


@app.get("/ai-status")
def ai_status():
    return {
        "ai": "ready",
        "model": "InsightFace",
        "status": "DISTRI G1 AI backend is available"
    }


# ==============================
# FACE DETECTION TEST
# ==============================

@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):

    image_bytes = await file.read()

    image_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        return {
            "success": False,
            "message": "Invalid image"
        }

    faces = face_app.get(image)

    return {
        "success": True,
        "faces_detected": len(faces)
    }


# ==============================
# IDENTITY VERIFICATION
# ==============================

@app.post("/verify-face")
async def verify_face(file: UploadFile = File(...)):

    # Read image temporarily
    image_bytes = await file.read()

    image_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        return {
            "success": False,
            "status": "BAD_IMAGE",
            "message": "Invalid image"
        }

    # Detect faces
    faces = face_app.get(image)

    if len(faces) == 0:
        return {
            "success": False,
            "status": "NO_FACE",
            "message": "No face detected. Please capture a clearer image."
        }
    is_blurry, blur_score = is_image_blurry(image)
    

    if is_blurry:
         return {
            "success": False,
            "status": "BAD_QUALITY",
            "message": "Image quality is too low. Please capture a clearer image."
        }

    # Select center face
    height, width = image.shape[:2]

    target_face = get_center_face(
        faces,
        width,
        height
    )
    quality_ok, quality_message = validate_face_quality(
        target_face,
        width,
        height
    )

    if not quality_ok:
        return {
            "success": False,
            "status": "BAD_QUALITY",
            "message": quality_message
        }
    # Get face embedding
    embedding = normalize_embedding(
        target_face.embedding
    )

    # Compare with previously seen people
    best_similarity = 0.0

    for known_embedding in known_embeddings:

        similarity = cosine_similarity(
            embedding,
            known_embedding
        )

        if similarity > best_similarity:
            best_similarity = similarity

    # Duplicate person
    if best_similarity >= SIMILARITY_THRESHOLD:

        return {
            "success": True,
            "status": "DUPLICATE",
            "message": "This person has already received food.",
            "similarity": round(best_similarity, 4)
        }

    # New person
    known_embeddings.append(embedding)

    return {
        "success": True,
        "status": "NEW",
        "message": "New person verified successfully.",
        "similarity": round(best_similarity, 4),
        "memory_count": len(known_embeddings)
    }