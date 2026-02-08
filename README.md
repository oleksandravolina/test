Simple PWA App

Project Description

This is a simple Progressive Web App (PWA) built with HTML, CSS and vanilla JavaScript.
The project was created to meet basic academic requirements and to show how a PWA works in practice.

The application has three simple views and demonstrates installation, offline mode and access to basic device features.

⸻

Technologies Used
	•	HTML – application structure
	•	CSS – styling and responsive layout
	•	JavaScript – application logic and navigation
	•	Web App Manifest – enables app installation
	•	Service Worker – provides offline functionality
	•	Cache API – stores files for offline access

⸻

PWA Features

Installable Application

The app includes a manifest.json, which allows the user to install it on a device and use it like a native application.

⸻

Offline Mode

A Service Worker caches the main application files.
When the internet connection is unavailable, the app still loads from cache.
The user is informed when the device is offline.

⸻

Native Device Features

The application uses native browser and device features:
	•	Geolocation – shows the user’s current latitude and longitude after permission is granted.
	•	Camera – allows the user to take a photo using the device camera.
	•	Vibration – the device vibrates when the user presses a button, providing simple interaction feedback.

⸻

Views and Navigation

The application contains three views:
	1.	Home
	2.	Features
	3.	About

Navigation between views is handled using JavaScript buttons.

⸻

Responsive Design

The layout is responsive and works correctly on mobile phones and desktop screens.

⸻

How to Run the App

Running Locally

You can run the application locally using any local web server, for example Live Server in Visual Studio Code.

Example address:

http://127.0.0.1:5500

Note: Some PWA features work fully only with HTTPS.

⸻

Deployment

The application can be deployed using GitHub Pages, which provides HTTPS by default.

Steps:
	1.	Upload the project files to a GitHub repository
	2.	Enable GitHub Pages in repository settings
	3.	Open the generated HTTPS link in a browser

⸻

Summary

This project demonstrates:
	•	PWA installation
	•	Offline functionality
	•	Use of native device features
	•	Simple navigation and responsive design

⸻