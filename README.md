# BetaScreenCap

BetaScreenCap is a powerful, native-feeling screen capture and recording tool built for the web. Inspired by desktop tools like CleanShot X, it offers a seamless experience for capturing screenshots, recording video with facecam, annotating images, and extracting text using AI—all without installing a browser extension.

## ✨ Key Features

### 📸 Screen Capture & Editing
*   **Instant Capture:** Capture any tab, window, or screen with high fidelity.
*   **Rich Annotation Tools:**
    *   **Arrow & Shapes:** Draw attention with customizable arrows and rectangles (solid, dashed, or filled).
    *   **Pen & Highlighter:** Freehand drawing and highlighting.
    *   **Text:** Add text with adjustable font sizes and colors.
    *   **Counter:** Add numbered steps (1, 2, 3...) to create tutorials easily.
    *   **Blur:** Redact sensitive information with a privacy blur tool.
    *   **Crop:** Trim your screenshot to the perfect size.
*   **Wallpaper Backgrounds:** Automatically add beautiful gradients or solid colors behind your screenshots to make them "social media ready."
*   **Transformation:** Move and **rotate** elements to get the perfect layout.

### 🎥 Screen Recording with Facecam
*   **Picture-in-Picture Facecam:** Add a circular, draggable webcam bubble to your recordings.
    *   *Auto-PiP:* The camera automatically "pops out" when recording starts so you can see yourself while navigating other tabs.
*   **Video Compositor:** The app mixes your screen and webcam in real-time into a single video file.
*   **System & Mic Audio:** Captures both the computer's audio and your microphone commentary.
*   **MP4 Support:** Option to prioritize saving recordings as `.mp4` (browser dependent) or `.webm`.

### 🧠 AI Intelligence
*   **OCR (Text Recognition):** Powered by **Google Gemini 2.5 Flash**, instantly extract text from any screenshot.
*   **Privacy-First:** AI processing happens on-demand only when requested.

## 🚀 How to Use

### taking a Screenshot
1.  Click the **Camera** icon in the toolbar (or use the shortcut `Cmd+Shift+2`).
2.  Select the tab or window you want to capture.
3.  The screenshot will appear in the **Quick Access** menu at the bottom right.
4.  Hover over the preview to **Annotate**, or use the quick buttons to **Copy** or **Save**.

### Recording a Video
1.  (Optional) Click the **Camera** toggle in the toolbar to enable your webcam. Position the bubble where you want it.
2.  Click the **Record** icon.
3.  If the camera is on, it will pop out into a floating window.
4.  Select the screen you want to record.
5.  Perform your demo. The "Sound Keeper" technology ensures your camera stays synced even if you switch tabs.
6.  Click the **Stop** button in the floating overlay or the browser header.

### Using the Editor
*   **Select Tool:** Click to select elements. Drag to move. **Drag the white handle above an element to rotate it.**
*   **Zoom/Pan:** Use the controls at the bottom or mouse wheel to zoom.
*   **Background:** Toggle the "Monitor" icon to add/remove the gradient background.

## ⚙️ Settings
Click the **Gear** icon in the toolbar to:
*   Enable a **3-second countdown** before recording.
*   Toggle **Prefer MP4** format for video downloads.
*   View keyboard shortcuts.

## 🛠️ Technology Stack
*   **Framework:** React 19
*   **Styling:** Tailwind CSS (with custom animations)
*   **Icons:** Lucide React
*   **AI:** Google GenAI SDK (Gemini 2.5 Flash)
*   **Audio/Video:** Web Audio API & MediaStream API (Canvas Compositing)

## 🔒 Permissions
The app requests the following permissions only when needed:
*   `display-capture`: To record your screen.
*   `camera`: For the Facecam feature.
*   `microphone`: For voice-over recording.