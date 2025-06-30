import asyncio
import os
import logging
import base64
import numpy as np
from dotenv import load_dotenv
import speech_recognition as sr
import soundfile as sf
import torch

from kokoro import KPipeline
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import JsonOutputParser
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import websockets
from pydub import AudioSegment
import requests
from langchain.docstore.document import Document
from pydantic import BaseModel
from typing import List


# Set up logging
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

# Initialize Whisper for STT
recognizer = sr.Recognizer()

# Initialize Kokoro-82M for TTS
device = 'cuda' if torch.cuda.is_available() else 'cpu'
kokoro_pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
voice = 'af_heart'

# Initialize Gemini LLM and embeddings
try:
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.7)
    embeddings = SentenceTransformerEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
except Exception as e:
    logger.error(f"Failed to initialize LLM or embeddings: {e}", exc_info=True)
    raise Exception("Initialization of language model or embeddings failed")

# GitHub API setup
GITHUB_USERNAME = "abdullah-khaled0"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")  # Add your GitHub Personal Access Token in .env
if not GITHUB_TOKEN:
    logger.warning("GITHUB_TOKEN not found in .env. API requests may be rate-limited.")

REPOS = [
    "Film-Trailer-and-Summary-Generator",
    "Vocaby",
    "YOLO11-Custom-Object-Detection-for-PPE-Detection",
    "Advanced-Retail-Analytics-using-Excel-and-Python",
    "Pix2Pix-Sketch-to-Image-Colorization",
    "PDF-Quiz-Generator-with-AI-and-React",
    "Fine-Tuning-DeepSeek-R1-Distill-Llama-8B-on-Medical-CoT-Dataset",
    "Hotels-AI-Agent",
    "Fine-Tuning-Llama-2-Using-QLoRA",
    "Customer-Segmentation",
    "AI-Powered-Search-and-Recommendation-System",
    "Exam-Generator",
    "Walmart-Analytics",
    "ts-forecasting-with-prophet",
    "Credit-Fraud-Detector",
    "Supply-Chain-Analysis-using-R",
    "A-B-Testing-with-Cookie-Cats-mobile-game-dataset",
    "ETL-Project-with-SSIS-and-PowerBI",
    "ELT-Pipeline-with-Airflow-DBT-Soda-Snowflake"
]

# Profile information
profile_str = """
Abdullah Khaled | AI Engineer - Data Scientist

=== PERSONAL INFORMATION ===
Phone: +201557504902
WhatsApp: +201557504902
Gmail: dev.abdullah.khaled@gmail.com

=== LEARNING PLATFORMS ===
LinkedIn: https://linkedin.com/in/abdullah-khaled-0608a9236
Kaggle: https://kaggle.com/abdullah7aled
HackerRank: https://www.hackerrank.com/abdullah_7aled
LeetCode: https://leetcode.com/u/3bdullah_7aled/
Microsoft Learn: https://learn.microsoft.com/en-us/users/abdullahkhaled-4050/
Streamlit: https://share.streamlit.io/user/abdullah-khaled0
Coursera: https://www.coursera.org/user/a417b4d4afc4a0d67abb5bacc39083a5
365DataScience: https://learn.365datascience.com/profile/abdullah-khaled-4/
DataCamp: https://www.datacamp.com/portfolio/3bdullah

=== SKILLS ===
• Programming: Python (Pandas, Matplotlib, Numpy, PySpark), R, JavaScript, SQL
• AI/ML: Scikit-Learn, PyTorch, Tensorflow, Transformers, NLP (Spacy, NLTK), Langchain, LangGraph, Prompt Engineering, Fine-tuning LLMs, RAG, MCP
• MLOps & Deployment: Flask, FastAPI, MLFlow, DVC, CI/CD, Railway, Docker
• BI & Visualization Tools: SQL, Tableau, Power BI, Excel, Data warehouse, Statistics, Statistical Analysis, Time Series Analysis, Hypothesis Testing, AB Testing, Web Scraping
• Cloud & Data Engineering: Azure (ML, AI Services, Databricks), ETL(Airflow, DBT, SSIS)

=== EXPERIENCE ===
WorldQuant University - Remote May 2023 - May 2023
Data Scientist Intern
• Completed a practical program in data science, focusing on Python, machine learning, and statistical modeling.
• Applied data analysis and visualization tools to real-world projects, gaining hands-on experience.

Software Engineer (Self-Employed) | Nov 2021 – Dec 2022
• Built and launched 6+ Android applications using Flutter and native technologies
• Developed full-stack web applications with HTML, CSS, JavaScript, PHP, and SQL

=== EDUCATION ===
BSc in Information Systems | Beni Suef University | Oct 2021 – Jul 2025

=== CERTIFICATIONS ===
• Deep Learning Specialization – Coursera (Mar 2023)
• Machine Learning Specialization – Coursera (Feb 2023)
"""

# Pydantic model for response structure
class AssistantResponse(BaseModel):
    response: str
    links: List[dict]
    media_links: List[str]
    personal_info: List[dict]

# Pydantic model for text query input
class TextQuery(BaseModel):
    query: str

# Fetch README content from GitHub
def fetch_readme(repo_name):
    logger.debug(f"Fetching README for {repo_name}")
    try:
        url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{repo_name}/readme"
        headers = {"Accept": "application/vnd.github.v3+json"}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"token {GITHUB_TOKEN}"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            content = base64.b64decode(response.json()["content"]).decode("utf-8")
            return Document(page_content=content, metadata={"source": "github", "repo_name": repo_name})
        else:
            logger.error(f"Failed to fetch README for {repo_name}: HTTP {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error fetching README for {repo_name}: {e}", exc_info=True)
        return None

# Load and process GitHub READMEs for RAG
def load_documents(query):
    try:
        directory = "knowledge/indexes/repos"
        logger.debug("Loading documents from GitHub")
        if not os.path.exists(directory):
            logger.info(f"Directory {directory} does not exist, creating and populating with documents")
            os.makedirs(directory, exist_ok=True)
            documents = []
            for repo in REPOS:
                doc = fetch_readme(repo)
                if doc:
                    documents.append(doc)
                else:
                    logger.warning(f"Skipping repository {repo} due to fetch failure")
            
            if not documents:
                logger.warning("No documents loaded from GitHub. Proceeding with empty retriever.")
                return FAISS.from_texts(texts=["No GitHub READMEs available"], embedding=embeddings).as_retriever()
            
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=500)
            splits = text_splitter.split_documents(documents)
            vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
            vectorstore.save_local(directory)
            logger.info(f"Saved FAISS index to {directory}")

        vectorstore = FAISS.load_local(directory, embeddings, allow_dangerous_deserialization=True)
        results = vectorstore.similarity_search(query, k=5)

        # Structure the results without metadata
        structured_results = [
            {
                "result_number": i + 1,
                "content": doc.page_content
            }
            for i, doc in enumerate(results)
        ]

        logger.info("✅ FAISS index loaded successfully.")
        return structured_results
    except Exception as e:
        logger.error(f"Failed to load FAISS index: {e}", exc_info=True)
        return None

async def process_text(query, websocket: WebSocket = None):
    output_file = "output.wav"
    
    try:
        if not query or not isinstance(query, str) or query.strip() == "":
            logger.error("Invalid or empty query provided")
            raise ValueError("Query cannot be empty or invalid")

        # Detect repository name in query
        repo_name = None
        for repo in REPOS:
            if repo.lower() in query.lower():
                repo_name = repo
                break

        prompt = ChatPromptTemplate([(
                "system",
                """
                You are a professional and courteous AI secretary for Abdullah Khaled. Your role is to provide clear, concise, and polished responses about Abdullah's GitHub projects or his professional profile in JSON format. Structure the response as follows:\n

                {{
                "response": "Details about the project or general response if no project is mentioned",
                "links": [
                    {{"platform": "Platform name", "url": "URL"}},
                    ...
                ],
                "media_links": [
                    "media_url_1",
                    "media_url_2",
                    ...
                ],
                "personal_info": [
                    {{"type": "Contact type (e.g., Gmail, Phone)", "value": "Contact value"}},
                    ...
                ]
                }}
                \n

                Based on the following contexts:

                === Abdullah Profile Information ===\n
                {profile}

                === GitHub Project Context ===\n
                {context}

                === GitHub Repos' names ===\n
                {repos}

                \n
                Important: My github username is abdullah-khaled0\n

                if the path of media (images or videos) dont have https, make the path url like this:
                https://raw.githubusercontent.com/abdullah-khaled0/repo_name/main/the_path_without_https

                Generate the response based on the user query. If the query mentions a specific project (e.g., Film-Trailer-and-Summary-Generator, Vocaby, YOLO11-Custom-Object-Detection-for-PPE-Detection, Pix2Pix-Sketch-to-Image-Colorization), include details from the corresponding GitHub README in `response` and include any media URLs (images or videos) from the README in `media_links`. For queries about Abdullah's skills, experience, education, certifications, or contact info, use the profile information in `response`. 

                For the `links` array, include relevant social or platform links (e.g., LinkedIn, Kaggle, HackerRank, LeetCode, Microsoft Learn, Streamlit, Coursera, 365DataScience, DataCamp) only if the query explicitly asks for social media, platforms, or specific platform names (e.g., "LinkedIn", "Kaggle"). For the `personal_info` array, include Gmail and/or Phone details only if the query explicitly asks for contact information (e.g., "email", "phone", "Gmail", "WhatsApp", "personal information"). The `media_links` array should include any media URLs (images or videos) from the GitHub READMEs if relevant to the query; otherwise, keep it empty. 

                Answer in a professional, friendly, and articulate manner, as if representing Abdullah to colleagues, clients, or stakeholders. If the context lacks relevant information, respond based on your knowledge, maintaining a professional tone. Ensure the response is a valid JSON object conforming to the structure above.
                """),
                ("user", f"{query}, with media links and project link if available")])

        # Get context
        context = load_documents(query)
        if context is None:
            logger.error("Failed to load documents for query")
            raise ValueError("Failed to load document context")

        logger.info(f"context: {context}")

        # Create RAG chain with JSON output parser
        rag_chain = (
            RunnablePassthrough()
            | prompt
            | llm
            | JsonOutputParser()
        )
        
        # Process with RAG chain
        response = rag_chain.invoke({"context": context, "profile": profile_str, "repos": REPOS})

        logger.info(f"Raw response from LLM: {response}")
        
        # Ensure response is a valid JSON object and conforms to Pydantic model
        if not isinstance(response, dict):
            logger.warning("Response is not a valid JSON object. Converting to default structure.")
            response = AssistantResponse(
                response=str(response),
                links=[],
                media_links=[],
                personal_info=[]
            ).model_dump()
        else:
            response = AssistantResponse(
                response=response.get("response", "No relevant information found."),
                links=response.get("links", []),
                media_links=response.get("media_links", []),
                personal_info=response.get("personal_info", [])
            ).model_dump()
        
        logger.info(f"Processed response: {response}")

        if websocket:
            # Convert response field to speech for WebSocket clients
            generator = kokoro_pipeline(response["response"], voice=voice)
            audio_chunks = []
            for i, (gs, ps, audio) in enumerate(generator):
                logger.debug(f"Segment {i}: gs={gs}, ps={ps}")
                audio_chunks.append(audio)
                segment_file = f"segment_{i}.wav"
                sf.write(segment_file, audio, 24000)
                with open(segment_file, "rb") as f:
                    audio_base64 = base64.b64encode(f.read()).decode('utf-8')
                await websocket.send_json({
                    "transcript": query,
                    "response": response,
                    "audio_segment": audio_base64,
                    "segment_index": i,
                    "is_last_segment": False,
                    "repo_name": repo_name or ""
                })
                os.remove(segment_file)
            
            # Combine audio chunks for final storage
            combined_audio = np.concatenate(audio_chunks)
            sf.write(output_file, combined_audio, 24000)
            logger.info(f"Generated audio saved as {output_file}")

            # Send final segment confirmation
            with open(output_file, "rb") as f:
                audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            await websocket.send_json({
                "transcript": query,
                "response": response,
                "audio_segment": audio_base64,
                "segment_index": len(audio_chunks),
                "is_last_segment": True,
                "repo_name": repo_name or ""
            })

        return response  # Return response for HTTP endpoint

    except Exception as e:
        logger.error(f"Error in processing or TTS: {e}", exc_info=True)
        error_response = AssistantResponse(
            response=f"Error: {str(e)}",
            links=[],
            media_links=[],
            personal_info=[]
        ).model_dump()
        if websocket:
            await websocket.send_json({
                "transcript": "",
                "response": error_response,
                "audio_segment": "",
                "segment_index": -1,
                "is_last_segment": True,
                "repo_name": ""
            })
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")
    finally:
        if websocket and os.path.exists(output_file):
            os.remove(output_file)

async def process_audio(audio_data, websocket: WebSocket):
    temp_input_file = "temp_audio_input.wav"
    temp_output_file = "temp_audio_converted.wav"
    output_file = "output.wav"
    
    try:
        # Convert base64 audio to WAV
        audio_bytes = base64.b64decode(audio_data)
        with open(temp_input_file, "wb") as f:
            f.write(audio_bytes)
        
        # Convert to PCM WAV using pydub
        audio = AudioSegment.from_file(temp_input_file)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(temp_output_file, format="wav")
        
        # Speech recognition
        with sr.AudioFile(temp_output_file) as source:
            audio = recognizer.record(source)
            logger.debug("Recognizing audio...")
            query = recognizer.recognize_whisper(audio, model="base.en")
            logger.info(f"Transcribed text: {query}")
        
        await process_text(query, websocket)

    except Exception as e:
        logger.error(f"Error in processing or TTS: {e}", exc_info=True)
        await websocket.send_json({
            "transcript": "",
            "response": AssistantResponse(
                response=f"Error: {str(e)}",
                links=[],
                media_links=[],
                personal_info=[]
            ).model_dump(),
            "audio_segment": "",
            "segment_index": -1,
            "is_last_segment": True,
            "repo_name": ""
        })
    finally:
        for file in [temp_input_file, temp_output_file, output_file]:
            if os.path.exists(file):
                os.remove(file)

@app.post("/text_query", response_model=AssistantResponse)
async def text_query_endpoint(query: TextQuery):
    logger.info(f"Received text query: {query.query}")
    response = await process_text(query.query)
    return response

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    try:
        while True:
            data = await websocket.receive_text()
            await process_audio(data, websocket)
            await asyncio.sleep(0.1)
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        await websocket.close()

async def main():
    logger.info("Starting AI Voice Agent with GitHub RAG and Profile Context...")