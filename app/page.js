"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  /* =====================================================
     REFERENCES
  ===================================================== */

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /* =====================================================
     CAMERA STATE
  ===================================================== */

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  /* =====================================================
     IMAGE STATE
  ===================================================== */

  const [image, setImage] = useState(null);

  /* =====================================================
     VERIFICATION STATE
  ===================================================== */

  const [verifying, setVerifying] = useState(false);

  const [status, setStatus] = useState({
    initial: "Pending",
    sent: "Pending",
    verified: "Pending",
    distribution: "Pending",
  });

  /* =====================================================
     OPERATIONAL STATS
  ===================================================== */
const [stats, setStats] = useState({
  remaining: 100,
  distributed: 0,
  duplicates: 0,
  errors: 0,
});

  /* =====================================================
     ATTACH CAMERA STREAM TO VIDEO
  ===================================================== */

  useEffect(() => {
    if (cameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOpen, stream]);

  /* =====================================================
     CLEAN CAMERA WHEN COMPONENT UNMOUNTS
  ===================================================== */

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [stream]);

  /* =====================================================
     FILE UPLOAD
  ===================================================== */

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum file size is 5MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      setImage(event.target.result);

      setStatus({
        initial: "Pending",
        sent: "Pending",
        verified: "Pending",
        distribution: "Pending",
      });
    };

    reader.readAsDataURL(file);
  };

  /* =====================================================
     FILE INPUT CHANGE
  ===================================================== */

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    handleFile(file);

    // Allows selecting the same file again
    event.target.value = "";
  };

  /* =====================================================
     DRAG & DROP
  ===================================================== */

  const handleDrop = (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    handleFile(file);
  };

  /* =====================================================
     OPEN CAMERA
  ===================================================== */

  const openCamera = async () => {
    setCameraError("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera access is not supported by this browser."
        );

        return;
      }

      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

      setStream(mediaStream);
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error:", error);

      setCameraError(
        "Unable to access the camera. Please allow camera permission."
      );

      setCameraOpen(true);
    }
  };

  /* =====================================================
     CLOSE CAMERA
  ===================================================== */

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setCameraOpen(false);
    setCameraError("");
  };

  /* =====================================================
     CAPTURE IMAGE
  ===================================================== */

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        "Camera is not ready yet. Please wait a moment."
      );

      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture the image.");

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const capturedImage = canvas.toDataURL(
      "image/jpeg",
      0.92
    );

    setImage(capturedImage);

    // Reset verification state for new image
    setStatus({
      initial: "Pending",
      sent: "Pending",
      verified: "Pending",
      distribution: "Pending",
    });

    closeCamera();
  };

  /* =====================================================
     REMOVE IMAGE
  ===================================================== */

  const removeImage = () => {
    setImage(null);

    setStatus({
      initial: "Pending",
      sent: "Pending",
      verified: "Pending",
      distribution: "Pending",
    });
  };

  /* =====================================================
     VERIFY IMAGE
     
     NOTE:
     This is currently a frontend simulation.
     Replace this with your FastAPI request later.
  ===================================================== */
const verifyImage = async () => {
  if (!image) {
    alert("Please capture or upload an image first.");
    return;
  }

  if (verifying) return;

  setVerifying(true);

  setStatus({
    initial: "Checking",
    sent: "Pending",
    verified: "Pending",
    distribution: "Pending",
  });

  try {
    // ---------------------------------------------
    // STEP 1: Initial check
    // ---------------------------------------------

    await wait(500);

    setStatus((previous) => ({
      ...previous,
      initial: "Complete",
      sent: "Checking",
    }));

    // ---------------------------------------------
    // STEP 2: Convert captured image to file
    // ---------------------------------------------

    const response = await fetch(image);
    const blob = await response.blob();

    const formData = new FormData();

    formData.append(
      "file",
      blob,
      "verification-image.jpg"
    );

    setStatus((previous) => ({
      ...previous,
      sent: "Complete",
      verified: "Checking",
    }));

    // ---------------------------------------------
    // STEP 3: Send image to FastAPI AI
    // ---------------------------------------------

    const aiResponse = await fetch(
      "http://127.0.0.1:8000/verify-face",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!aiResponse.ok) {
      throw new Error(
        `AI server returned ${aiResponse.status}`
      );
    }

    const result = await aiResponse.json();

    console.log("DISTRI G1 AI Response:", result);

    // ---------------------------------------------
    // STEP 4: NEW PERSON
    // ---------------------------------------------

    if (result.status === "NEW") {
      setStatus((previous) => ({
        ...previous,
        verified: "Approved",
        distribution: "Checking",
      }));

      await wait(700);

      setStatus((previous) => ({
        ...previous,
        distribution: "Complete",
      }));

      setStats((previous) => ({
        ...previous,
        distributed: previous.distributed + 1,
        
        remaining: Math.max(
          0,
          previous.remaining - 1
        ),
      }));

      return;
    }
    // don't sent image to ai ,image quility is too poor
   if (result.status === "BAD_QUALITY") {setStatus({verification: "Rejected", message: result.message,});
         setStats((prev) => ({
         ...prev,
         errors: prev.errors + 1,
        }));
         alert(result.message);
   return;
  }
// ---------------------------------------------
    // STEP 5: DUPLICATE PERSON
    // ---------------------------------------------

    if (result.status === "DUPLICATE") {
      setStats((previous) => ({
       ...previous,
      duplicates: previous.duplicates + 1,  
     }));

     setStatus((previous) => ({
     ...previous,
     verified: "Rejected",
     distribution: "Blocked", 
    }));

      return;
    }

    // ---------------------------------------------
    // STEP 6: NO FACE / BAD IMAGE
    // ---------------------------------------------

    setStatus((previous) => ({
      ...previous,
      verified: "Rejected",
      distribution: "Rejected",
    }));
    setStats((prev) => ({
     ...prev,
     errors: prev.errors + 1,
     }));
    

    alert(
      result.message ||
      "Verification failed. Please capture a clearer image."
    );

  } catch (error) {
    console.error("Verification error:", error);

    setStatus((previous) => ({
      ...previous,
      verified: "Rejected",
      distribution: "Rejected",
    }));

    setStats((previous) => ({
      ...previous,
      errors: previous.errors + 1,
    }));

    alert(
      "Unable to connect to the DISTRI G1 AI server."
    );

  } finally {
    setVerifying(false);
  }
};

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020817] text-white">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="h-[88px] border-b border-[#19345a] bg-[#061329]/95">

        <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-6">

          {/* BRAND */}

          <div className="flex items-center gap-5">

            <div className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-xl border border-[#25476f] bg-[#07172f]">

              <img
                src="/logo.png"
                alt="Distri G1 Logo"
                className="h-full w-full object-contain"
              />

            </div>

            <div>

              <h1 className="text-[30px] font-bold leading-none tracking-tight">

                DISTRI{" "}

                <span className="text-[#20a9ff]">
                  G1
                </span>

              </h1>

              <p className="mt-2 text-[15px] tracking-wide text-[#7796c4]">
                AI Controlled Distribution System
              </p>

            </div>

          </div>

          {/* SYSTEM STATUS */}

          <div className="flex items-center gap-5">

            <div className="flex h-[44px] items-center gap-3 rounded-xl border border-[#234267] bg-[#06162d] px-5">

              <span className="h-3 w-3 rounded-full bg-[#00e5c3] shadow-[0_0_12px_#00e5c3]" />

              <span className="text-[16px] tracking-wide text-[#00e5c3]">
                SYSTEM READY
              </span>

            </div>

           

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="mx-auto max-w-[1380px] px-6 pb-8 pt-5">

        {/* PAGE TITLE */}

        <div className="mb-5 text-center">

          <h2 className="text-[28px] font-bold">

            Intelligent verification{" "}

            <span className="text-[#80a8ff]">
              for automated food distribution.
            </span>

          </h2>

        </div>


        {/* =================================================
            IDENTITY VERIFICATION CARD
        ================================================= */}

        <section className="mx-auto max-w-[806px] rounded-[20px] border border-[#1266b8] bg-[#06172d]/80 p-[30px] shadow-[0_0_35px_rgba(0,80,180,0.10)]">

          {/* CARD HEADER */}

          <div className="mb-4 flex items-start justify-between">

            <div>

              <h3 className="text-[26px] font-semibold">
                Identity Verification
              </h3>

              <p className="mt-1 text-[16px] text-[#9bb9e5]">
                Capture or upload an image for verification.
              </p>

            </div>

            <div className="flex h-[42px] items-center gap-3 rounded-xl border border-[#23476e] bg-[#071a34] px-4 text-sm text-[#c7ddff]">

              <CameraIcon />

              WEBCAM / FILE

            </div>

          </div>


          {/* =================================================
              IMAGE / CAMERA PLACEHOLDER
          ================================================= */}

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={handleDrop}
            className="relative h-[232px] overflow-hidden rounded-xl border border-[#24476d] bg-[#031227]"
          >

            {/* GRID */}

            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage: `
                  linear-gradient(#123056 1px, transparent 1px),
                  linear-gradient(90deg, #123056 1px, transparent 1px)
                `,
                backgroundSize: "22px 22px",
              }}
            />

            {/* CORNER GUIDES */}

            <div className="absolute left-5 top-5 h-5 w-5 border-l border-t border-[#b9d7ff]" />

            <div className="absolute right-5 top-5 h-5 w-5 border-r border-t border-[#b9d7ff]" />

            <div className="absolute bottom-5 left-5 h-5 w-5 border-b border-l border-[#b9d7ff]" />

            <div className="absolute bottom-5 right-5 h-5 w-5 border-b border-r border-[#b9d7ff]" />


            {/* =================================================
                IMAGE EXISTS
            ================================================= */}

            {image ? (

              <div className="absolute inset-0 flex items-center justify-center">

                <img
                  src={image}
                  alt="Verification preview"
                  className="max-h-full max-w-full object-contain"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-sm text-white transition hover:bg-black/90"
                >
                  Remove
                </button>

              </div>

            ) : (

              /* =================================================
                 NO IMAGE
              ================================================= */

              <div className="relative z-10 flex h-full flex-col items-center justify-center">

                <div className="flex h-[58px] w-[58px] items-center justify-center rounded-xl bg-[#0b2444] text-[#00cfff]">

                  <CameraIcon size={29} />

                </div>


                {/* OPEN CAMERA */}

                <button
                  type="button"
                  onClick={openCamera}
                  className="mt-2 flex items-center gap-3 rounded-xl bg-[#112b4d] px-6 py-2.5 font-medium transition hover:bg-[#15365d]"
                >

                  <span className="text-2xl leading-none text-[#00cfff]">
                    +
                  </span>

                  Open Camera

                </button>


                <p className="mt-2 text-[13px] text-[#a7c5ee]">
                  Preferred method
                </p>

              </div>

            )}

          </div>


          {/* =================================================
              HIDDEN CANVAS
          ================================================= */}

          <canvas
            ref={canvasRef}
            className="hidden"
          />


          {/* =================================================
              UPLOAD IMAGE
          ================================================= */}

          <div className="mt-4 flex items-center gap-4">

            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="flex h-[42px] items-center gap-3 rounded-xl border border-[#23476e] bg-[#071a34] px-4 transition hover:bg-[#0b2444]"
            >

              <UploadIcon />

              Upload Image

            </button>


            <span className="text-sm text-[#9bb9e5]">
              or drag and drop JPG, PNG (Max 5MB)
            </span>


            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />

          </div>


          {/* =================================================
              VERIFY BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={verifyImage}
            disabled={verifying}
            className={`mt-4 flex h-[56px] w-full items-center justify-center gap-4 rounded-xl text-[20px] font-semibold transition ${
              verifying
                ? "cursor-wait bg-[#1255a8]"
                : "bg-[#0875ff] hover:bg-[#0068eb]"
            }`}
          >

            <ShieldIcon />

            {verifying
              ? "VERIFYING..."
              : "VERIFY"}

          </button>


          {/* =================================================
              VERIFICATION STATUS
          ================================================= */}

          <div className="mt-4 border-t border-[#183552] pt-3">

            <StatusRow
              label="Initial check complete"
              status={status.initial}
              active
            />

            <StatusRow
              label="Image sent to AI"
              status={status.sent}
            />

            <StatusRow
              label="AI photo verified"
              status={status.verified}
            />

            <StatusRow
              label="Distribution decision complete"
              status={status.distribution}
            />

          </div>


          {/* =================================================
              STATUS MESSAGE
          ================================================= */}

          <div className="mt-3 flex h-[47px] items-center gap-3 rounded-xl border border-[#17385d] bg-[#0a203e] px-4">

            <span className="text-2xl text-[#00cfff]">
              ϟ
            </span>

            <span className="text-sm text-[#9ebce8]">

              {verifying
                ? "AI verification in progress..."
                : image
                ? "Image ready for verification."
                : "Ready to verify. No request sent yet."}

            </span>

          </div>

        </section>


        {/* =================================================
            OPERATIONAL OVERVIEW
        ================================================= */}

        <section className="mt-5">

          {/* SECTION TITLE */}

          <div className="mb-3 flex items-center gap-3">

            <div className="flex items-center gap-3 text-[#00bfff]">

              <ChartIcon />

              <span className="text-[14px] font-medium tracking-wider">
                OPERATIONAL OVERVIEW
              </span>

            </div>

            <div className="h-px flex-1 bg-[#193553]" />

          </div>


          {/* STAT CARDS */}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <StatCard
              icon={<BoxIcon />}
              title="ITEMS REMAINING"
              value={stats.remaining}
              label="Stock safe"
              iconColor="blue"
            />
            <StatCard
              icon={<CheckCircleIcon />}
              title="SUCCESSFUL DISTRIBUTION"
              value={stats.distributed}
              label="Approved"
              iconColor="green"
            />

            <StatCard
              icon={<XCircleIcon />}
              title="DUPLICATE ATTEMPTS"
              value={stats.duplicates}
              label="Rejected / Dup"
              iconColor="pink"
            />

            <StatCard
              icon={<XCircleIcon />}
              title="ERRORS"
              value={stats.errors} 
              label="Verification errors"
              iconColor="red"
           />

          </div>

        </section>

      </div>


      {/* =========================================================
          CAMERA MODAL
          
          IMPORTANT:
          This is outside the main verification card.
          Therefore it covers the entire screen.
      ========================================================= */}

      {cameraOpen && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">

          {/* =================================================
              MODAL CONTAINER
          ================================================= */}

          <div className="w-full max-w-4xl rounded-2xl border border-[#00cfff]/20 bg-[#0b1728] p-5 shadow-[0_0_60px_rgba(0,150,255,0.15)]">

            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="mb-5 flex items-center justify-between">

              <div>

                <h3 className="text-xl font-semibold text-white">
                  Camera Verification
                </h3>

                <p className="mt-1 text-sm text-[#7189a9]">
                  Position the person inside the camera frame.
                </p>

              </div>


              {/* CLOSE */}

              <button
                type="button"
                onClick={closeCamera}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#8297b5] transition hover:bg-white/10 hover:text-white"
                aria-label="Close camera"
              >
                ✕
              </button>

            </div>


            {/* =================================================
                LARGE CAMERA PREVIEW
            ================================================= */}

            <div className="relative overflow-hidden rounded-2xl border border-[#00cfff]/20 bg-black">

              {stream ? (

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video max-h-[70vh] w-full object-cover"
                />

              ) : (

                <div className="flex aspect-video items-center justify-center bg-[#030912]">

                  <div className="text-center">

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#ff668b]/30 bg-[#ff668b]/10 text-[#ff668b]">
                      !
                    </div>

                    <p className="text-sm text-[#ff668b]">
                      Camera unavailable
                    </p>

                  </div>

                </div>

              )}


              {/* =================================================
                  CAMERA CORNER GUIDES
              ================================================= */}

              {stream && (

                <div className="pointer-events-none absolute inset-0">

                  {/* TOP LEFT */}

                  <div className="absolute left-5 top-5 h-10 w-10 border-l-2 border-t-2 border-[#20cfff]" />

                  {/* TOP RIGHT */}

                  <div className="absolute right-5 top-5 h-10 w-10 border-r-2 border-t-2 border-[#20cfff]" />

                  {/* BOTTOM LEFT */}

                  <div className="absolute bottom-5 left-5 h-10 w-10 border-b-2 border-l-2 border-[#20cfff]" />

                  {/* BOTTOM RIGHT */}

                  <div className="absolute bottom-5 right-5 h-10 w-10 border-b-2 border-r-2 border-[#20cfff]" />

                </div>

              )}


              {/* =================================================
                  LIVE INDICATOR
              ================================================= */}

              {stream && (

                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">

                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

                  <span className="text-xs font-medium tracking-wider text-white">
                    LIVE
                  </span>

                </div>

              )}

            </div>


            {/* =================================================
                CAMERA ERROR
            ================================================= */}

            {cameraError && (

              <p className="mt-4 text-center text-sm text-[#ff668b]">
                {cameraError}
              </p>

            )}


            {/* =================================================
                CAMERA CONTROLS
            ================================================= */}

            <div className="mt-5 grid grid-cols-2 gap-3">

              {/* CANCEL */}

              <button
                type="button"
                onClick={closeCamera}
                className="h-[52px] rounded-xl border border-[#29415e] bg-[#0a1a2e] font-medium text-[#b8c9e3] transition hover:bg-[#10253e] hover:text-white"
              >
                Cancel
              </button>


              {/* CAPTURE IMAGE */}

              <button
                type="button"
                onClick={captureImage}
                disabled={!stream}
                className={`flex h-[52px] items-center justify-center gap-3 rounded-xl font-semibold text-white transition ${
                  stream
                    ? "bg-[#087fff] shadow-[0_0_20px_rgba(0,127,255,0.20)] hover:bg-[#006de0]"
                    : "cursor-not-allowed bg-[#17416c]"
                }`}
              >

                <CameraIcon size={20} />

                Capture Image

              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}


/* =========================================================
   STATUS ROW
========================================================= */

function StatusRow({
  label,
  status,
  active = false,
}) {
  const isComplete =
    status === "Complete" ||
    status === "Approved";

  const isRejected =
    status === "Rejected";

  const isChecking =
    status === "Checking";

  return (

    <div className="flex h-[35px] items-center border-b border-[#102d4b] last:border-0">

      {/* STATUS CIRCLE */}

      <div
        className={`mr-3 flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full border-[3px] ${
          isComplete
            ? "border-[#00dfb6] bg-[#00dfb6]/10"
            : isRejected
            ? "border-[#ff628b] bg-[#ff628b]/10"
            : isChecking
            ? "animate-pulse border-[#00aaff] bg-[#00aaff]/10"
            : active
            ? "border-[#008cff]"
            : "border-[#7896cc]"
        }`}
      >

        {isComplete && (

          <span className="text-[12px] text-[#00dfb6]">
            ✓
          </span>

        )}

        {isRejected && (

          <span className="text-[12px] text-[#ff628b]">
            ×
          </span>

        )}

      </div>


      {/* LABEL */}

      <span className="flex-1 text-[15px] text-[#b4cdf1]">
        {label}
      </span>


      {/* STATUS TEXT */}

      <span
        className={`min-w-[90px] text-right text-[13px] ${
          isComplete
            ? "text-[#00dfb6]"
            : isRejected
            ? "text-[#ff628b]"
            : isChecking
            ? "text-[#55bfff]"
            : "text-[#b8cef0]"
        }`}
      >
        {status}
      </span>


      {/* FINAL SYMBOL */}

      <span className="w-[35px] text-right text-[#8ca8d0]">

        {isComplete
          ? "✓"
          : isRejected
          ? "×"
          : "—"}

      </span>

    </div>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
  label,
  iconColor,
}) {
  const colors = {
    blue: "text-[#00bfff]",
    indigo: "text-[#7189c8]",
    green: "text-[#00dfb6]",
    pink: "text-[#ff668b]",
  };

  const dotColors = {
    blue: "bg-[#00bfff]",
    indigo: "bg-[#7189c8]",
    green: "bg-[#00dfb6]",
    pink: "bg-[#ff668b]",
  };

  return (

    <div className="flex h-[105px] items-center rounded-xl border border-[#162f50] bg-[#06162d] px-6">

      {/* ICON */}

      <div className={`mr-5 ${colors[iconColor]}`}>
        {icon}
      </div>


      {/* CONTENT */}

      <div className="flex-1">

        <p className="text-[13px] tracking-wide text-[#bad0ef]">
          {title}
        </p>


        <div className="mt-2 flex items-end justify-between">

          <span
            className={`text-[36px] font-semibold leading-none ${colors[iconColor]}`}
          >
            {value}
          </span>

          <span className="text-[13px] text-[#c0d3f0]">
            {label}
          </span>

        </div>

      </div>


      {/* STATUS DOT */}

      <span
        className={`ml-3 mt-3 h-3 w-3 self-start rounded-full ${dotColors[iconColor]}`}
      />

    </div>
  );
}


/* =========================================================
   CAMERA ICON
========================================================= */

function CameraIcon({ size = 20 }) {
  return (

    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >

      <path d="M4 7h3l2-2h6l2 2h3v11H4V7Z" />

      <circle
        cx="12"
        cy="12.5"
        r="3.5"
      />

    </svg>

  );
}


/* =========================================================
   UPLOAD ICON
========================================================= */

function UploadIcon() {
  return (

    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >

      <path d="M12 16V4" />

      <path d="m7 9 5-5 5 5" />

      <path d="M4 15v4h16v-4" />

    </svg>

  );
}


/* =========================================================
   SHIELD ICON
========================================================= */

function ShieldIcon() {
  return (

    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="currentColor"
    >

      <path d="M12 2 4 5v6c0 5.2 3.4 9.8 8 11 4.6-1.2 8-5.8 8-11V5l-8-3Zm-1 14-3-3 1.4-1.4L11 13.2l3.6-3.6L16 11l-5 5Z" />

    </svg>

  );
}


/* =========================================================
   SETTINGS ICON
========================================================= */

function SettingsIcon() {
  return (

    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >

      <circle
        cx="12"
        cy="12"
        r="3"
      />

      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.6-1H6v-2h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8 9l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2.4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.8v2h-.8a1.7 1.7 0 0 0-1.8 1Z" />

    </svg>

  );
}


/* =========================================================
   CHART ICON
========================================================= */

function ChartIcon() {
  return (

    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >

      <path d="M4 19V9" />

      <path d="M10 19V5" />

      <path d="M16 19v-7" />

      <path d="M22 19H2" />

    </svg>

  );
}


/* =========================================================
   BOX ICON
========================================================= */

function BoxIcon() {
  return (

    <svg
      width="37"
      height="37"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >

      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />

      <path d="m4 7.5 8 4.5 8-4.5" />

      <path d="M12 12v9" />

    </svg>

  );
}


/* =========================================================
   CHECK CIRCLE ICON
========================================================= */

function CheckCircleIcon() {
  return (

    <svg
      width="39"
      height="39"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >

      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />

    </svg>

  );
}


/* =========================================================
   X CIRCLE ICON
========================================================= */

function XCircleIcon() {
  return (

    <svg
      width="39"
      height="39"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >

      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m9 9 6 6M15 9l-6 6" />

    </svg>

  );
}


/* =========================================================
   DELAY HELPER
========================================================= */

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}