---
title: AI VoiceSecretary
emoji: 📈
colorFrom: yellow
colorTo: green
sdk: docker
pinned: false
license: mit
---


# AI Voice Secretary

The AI Voice Secretary is a sophisticated virtual assistant designed to provide information about Abdullah Khaled's professional profile and GitHub projects. It leverages advanced technologies such as Retrieval-Augmented Generation (RAG), speech-to-text (STT), and text-to-speech (TTS) to deliver a seamless voice and text-based interaction experience. The project features a React-based frontend deployed on Vercel and a FastAPI backend hosted on HuggingFace Spaces, containerized using Docker.

## Features

- **Voice and Text Interaction**: Supports both voice and text queries for a versatile user experience.
- **GitHub Integration**: Retrieves and processes READMEs from specified GitHub repositories for context-aware responses.
- **RAG-Powered Responses**: Uses Retrieval-Augmented Generation to provide accurate information based on Abdullah Khaled's profile and projects.
- **Speech-to-Text (STT)**: Converts audio input to text using the Whisper model.
- **Text-to-Speech (TTS)**: Generates audio responses using the Kokoro-82M model.
- **Professional Profile Access**: Provides details about Abdullah's skills, experience, education, certifications, and contact information.
- **WebSocket Communication**: Enables real-time audio and text interaction between the frontend and backend.
- **Responsive UI**: Built with React and styled with Tailwind CSS for a modern and user-friendly interface.


## Step by step on how to make your own one:

- Fork the repo

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/forking_1.png)


- After creating your huggingface account (https://huggingface.co/) go to profile and get the HF_TOKEN (Create new one and save the value)

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/HF_Token_1.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/HF_Token_2.png)


- Add the huggingface token here with the name of HF_TOKEN

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/forking_2.png?raw=true)



- Go to my space and duplicate it (https://huggingface.co/spaces/abdullah-khaled/ai-voice-secretary/tree/main)

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_1.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_2.png?raw=true)


- To get the github token and Google api
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/getting_github_token.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/getting_gemini_key.png?raw=true)



- Now update the values based on your personal data (Important: update these values on github repo not huggingface repo)
- Note: you will get the value of Vercel URL after finishing this, and don't forget to change it after the creation

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_3.png?raw=true)


- And go to this file and update the specified values (the space name and your username are above beside your profile picture)

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_4.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_5.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_6.png?raw=true)



- Then go to this file and change these values based on yours

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_7.png?raw=true)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/github_link.png?raw=true)



- Go the main.yaml in workflow and change these values based on yours

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/forking_3.png?raw=true)


- Now its time to create the frontend (vercel)

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_vercel_1.png)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_vercel_2.png)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_vercel_3.png)
![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_vercel_4.png)



- Finally change this Vercel URL

![Image](https://github.com/abdullah0150/Images/blob/main/AI_Voice_Images/setup_space_3.png?raw=true)

## How It Works

The AI Voice Secretary integrates multiple components to process user queries and deliver responses:

1. **Frontend (React, Vercel)**:

   - Built with React for a dynamic and responsive user interface.
   - Uses Tailwind CSS for styling and integrates libraries like `date-fns` and `lucide-react` for enhanced functionality.
   - Communicates with the backend via WebSocket for real-time audio interactions and HTTP for text queries.
   - Deployed on Vercel for reliable hosting and automatic scaling.

2. **Backend (FastAPI, HuggingFace Spaces, Docker)**:

   - Developed using FastAPI for high-performance API and WebSocket endpoints.
   - Hosted on HuggingFace Spaces, with deployment managed via a Dockerfile for containerization.
   - Uses the Whisper model for STT, converting audio inputs to text.
   - Employs the Kokoro-82M model for TTS, generating audio responses.
   - Implements RAG by fetching GitHub READMEs, processing them with FAISS and SentenceTransformer embeddings, and generating responses using the Gemini LLM.
   - Stores and retrieves GitHub data in a FAISS vector store for efficient similarity searches.

3. **Data Flow**:

   - **Text Queries**: Users submit text queries via the React frontend, which are sent to the FastAPI backend. The backend processes the query using RAG and returns a JSON response with relevant information and media links.
   - **Voice Queries**: Audio inputs are sent via WebSocket, transcribed to text using Whisper, processed with RAG, and converted to audio responses using Kokoro-82M. The audio is streamed back to the frontend in segments.
   - **GitHub Integration**: The backend fetches READMEs from specified repositories, splits them into chunks, and indexes them in a FAISS vector store for retrieval during query processing.
   - **Profile Information**: The assistant provides details from Abdullah's professional profile (e.g., skills, contact info) when requested.

## Tech Stack

- **Frontend**:

  - React 19.0.0
  - Tailwind CSS 4.1.4
  - Vite 6.3.1 (build tool)
  - Libraries: `date-fns`, `lucide-react`
  - Deployed on Vercel

- **Backend**:

  - Python 3.10.9 (FastAPI)
  - Libraries: `speech_recognition`, `soundfile`, `pydub`, `langchain`, `sentence-transformers`, `faiss`, `torch`, `requests`
  - Models: Whisper (STT), Kokoro-82M (TTS), Gemini 2.0 Flash (LLM)
  - Containerized with Docker
  - Deployed on HuggingFace Spaces

- **Other**:

  - GitHub API for fetching READMEs
  - FAISS for vector storage and similarity search
  - SentenceTransformer (`all-MiniLM-L6-v2`) for embeddings

## Prerequisites

To run this project locally, ensure you have the following:

- **Node.js**: For the React frontend (version 18 or higher recommended).
- **Python**: Version 3.10.9 for the backend.
- **Docker**: For containerized deployment.
- **GitHub Personal Access Token**: For accessing GitHub API (add to `.env` file).
- **HuggingFace Account**: For deploying the backend on HuggingFace Spaces.
- **Vercel Account**: For deploying the frontend.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/abdullah-khaled0/ai-voice-secretary.git
cd ai-voice-secretary
```

### 2. Backend Setup

1. **Install Dependencies**:

   - Navigate to the backend directory (e.g., `src/backend`).
   - Create a virtual environment and install dependencies:

     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows: venv\Scripts\activate
     pip install -r requirements.txt
     python -m spacy download en_core_web_sm
     ```

2. **Set Environment Variables**:

   - Create a `.env` file in the backend directory with the following:

     ```
     GITHUB_TOKEN=your_github_personal_access_token
     GOOGLE_API_KEY=gemini_api_key_from_google_studio
     ```

3. **Run Locally**:

   - Start the FastAPI server:

     ```bash
     uvicorn src.backend.voice_assistant:app --host 0.0.0.0 --port 7860
     ```

4. **Docker Deployment**:

   - Build the Docker image:

     ```bash
     docker build -t ai-voice-secretary .
     ```
   - Run the container:

     ```bash
     docker run -p 7860:7860 --env-file .env ai-voice-secretary
     ```

5. **Deploy to HuggingFace Spaces**:

   - Push the repository to a HuggingFace Space.
   - Ensure the `Dockerfile` and `requirements.txt` are in the root directory.
   - Configure the Space to use the Docker runtime and expose port 7860.

### 3. Frontend Setup

1. **Install Dependencies**:

   - Navigate to the frontend directory (e.g., `frontend`).
   - Install Node.js dependencies:

     ```bash
     npm install
     ```

2. **Run Locally**:

   - Start the development server:

     ```bash
     npm run dev
     ```
   - The frontend will be available at `http://localhost:5173`.

3. **Build for Production**:

   - Generate production-ready assets:

     ```bash
     npm run build
     ```

4. **Deploy to Vercel**:

   - Install the Vercel CLI:

     ```bash
     npm install -g vercel
     ```
   - Deploy the frontend:

     ```bash
     vercel
     ```
   - Follow the prompts to configure and deploy to Vercel.

### 4. Connect Frontend and Backend

- Update the frontend code to point to the backend URL (e.g., `https://your-huggingface-space.hf.space/ws` for WebSocket and `/text_query` for HTTP).
- Ensure CORS is configured correctly in the backend to allow requests from the frontend URL (e.g., `https://your-vercel-app.vercel.app`).

## Usage

### Text Queries

- Access the frontend (e.g., `https://your-vercel-app.vercel.app`).
- Enter a text query (e.g., "Tell me about the Vocaby project" or "What are Abdullah's skills?").
- The assistant responds with a JSON object containing:
  - `response`: Details about the project or profile.
  - `links`: Relevant platform links (if requested).
  - `media_links`: Media URLs from GitHub READMEs (if applicable).
  - `personal_info`: Contact details (if requested).

### Voice Queries

- Use the microphone feature on the frontend to record a query.
- The audio is sent to the backend via WebSocket, transcribed, processed, and returned as audio segments.
- The frontend plays the audio response and displays the transcribed text and response details.

### Example Queries

- **Project Inquiry**: "What is the Film-Trailer-and-Summary-Generator project about?"
- **Profile Inquiry**: "What are Abdullah Khaled's skills?"
- **Contact Info**: "How can I contact Abdullah?"
- **Platform Links**: "What is Abdullah's LinkedIn profile?"



## Notes

- **GitHub Token**: Ensure the `GITHUB_TOKEN` is set in the `.env` file to avoid rate-limiting issues with the GitHub API.
- **CORS Configuration**: Update the `allow_origins` in `voice_assistant.py` to match your frontend's deployed URL.
- **Audio Processing**: The backend processes audio in segments for streaming; ensure a stable WebSocket connection for voice interactions.
- **HuggingFace Spaces**: Monitor resource usage on HuggingFace Spaces, as heavy computations (e.g., LLM inference) may require a paid plan.
- **Vercel Deployment**: Configure Vercel to handle environment variables for the frontend if needed.



## License

This project is licensed under the MIT License. See the LICENSE file for details.
