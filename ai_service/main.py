from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from transformers import pipeline
import torch
from collections import Counter
import re

app = FastAPI(title="EPMS AI Feedback Analysis Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load pre-trained models (lazy loading for efficiency)
sentiment_analyzer = None
summarizer = None

def get_sentiment_analyzer():
    global sentiment_analyzer
    if sentiment_analyzer is None:
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=0 if torch.cuda.is_available() else -1
        )
    return sentiment_analyzer

def get_summarizer():
    global summarizer
    if summarizer is None:
        summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            device=0 if torch.cuda.is_available() else -1
        )
    return summarizer

# Request/Response Models
class ParameterAnalysisRequest(BaseModel):
    feedback: str = Field(..., description="Feedback text for a single parameter")

class ParameterAnalysisResponse(BaseModel):
    sentiment: str = Field(..., description="POSITIVE, NEGATIVE, or NEUTRAL")
    confidence: float = Field(..., description="Confidence score (0-1)")

class EvaluationParameter(BaseModel):
    parameter_id: int
    parameter_name: str
    rating: int = Field(..., ge=1, le=5)
    feedback: str
    recommendation: Optional[str] = None

class EvaluationAnalysisRequest(BaseModel):
    parameters: List[EvaluationParameter]

class Flag(BaseModel):
    type: str
    message: str
    parameter_id: Optional[int] = None
    parameter_name: Optional[str] = None

class EvaluationAnalysisResponse(BaseModel):
    summary: str
    overall_sentiment: str
    flags: List[Flag]

# Helper Functions
def normalize_sentiment(label: str) -> str:
    """Convert model output to POSITIVE/NEGATIVE/NEUTRAL"""
    label_lower = label.lower()
    if "pos" in label_lower:
        return "POSITIVE"
    elif "neg" in label_lower:
        return "NEGATIVE"
    else:
        return "NEUTRAL"

def count_unique_words(text: str) -> int:
    """Count unique meaningful words (excluding common stopwords)"""
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'be', 'been', 'being'}
    words = re.findall(r'\b\w+\b', text.lower())
    unique_words = [w for w in words if w not in stopwords]
    return len(set(unique_words))

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Simple Jaccard similarity for duplicate detection"""
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union) if union else 0.0

# API Endpoints
@app.get("/")
def root():
    return {
        "service": "EPMS AI Feedback Analysis",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/analyze-parameter", response_model=ParameterAnalysisResponse)
def analyze_parameter(request: ParameterAnalysisRequest):
    """
    Analyze sentiment for a single parameter's feedback.
    Uses BERT-based sentiment analysis.
    """
    try:
        if not request.feedback or len(request.feedback.strip()) < 3:
            return ParameterAnalysisResponse(
                sentiment="NEUTRAL",
                confidence=0.0
            )
        
        analyzer = get_sentiment_analyzer()
        result = analyzer(request.feedback[:512])[0]  # BERT max length
        
        sentiment = normalize_sentiment(result['label'])
        confidence = round(result['score'], 4)
        
        return ParameterAnalysisResponse(
            sentiment=sentiment,
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze-evaluation", response_model=EvaluationAnalysisResponse)
def analyze_evaluation(request: EvaluationAnalysisRequest):
    """
    Analyze complete evaluation with multiple parameters.
    Returns summary, overall sentiment, and quality flags.
    """
    try:
        if not request.parameters:
            raise HTTPException(status_code=400, detail="No parameters provided")
        
        flags = []
        sentiments = []
        all_feedback = []
        
        # Analyze each parameter
        for param in request.parameters:
            feedback_text = param.feedback.strip() if param.feedback else ""
            
            # Check for weak feedback
            if feedback_text:
                unique_word_count = count_unique_words(feedback_text)
                if unique_word_count < 8:
                    flags.append(Flag(
                        type="WEAK_FEEDBACK",
                        message=f"Feedback contains only {unique_word_count} unique words (minimum 8 recommended)",
                        parameter_id=param.parameter_id,
                        parameter_name=param.parameter_name
                    ))
                
                # Sentiment analysis
                analyzer = get_sentiment_analyzer()
                sentiment_result = analyzer(feedback_text[:512])[0]
                sentiment = normalize_sentiment(sentiment_result['label'])
                sentiments.append(sentiment)
                all_feedback.append(feedback_text)
                
                # Check rating-sentiment inconsistency
                if param.rating >= 4 and sentiment == "NEGATIVE":
                    flags.append(Flag(
                        type="INCONSISTENCY",
                        message=f"High rating ({param.rating}/5) but negative sentiment detected",
                        parameter_id=param.parameter_id,
                        parameter_name=param.parameter_name
                    ))
                elif param.rating <= 2 and sentiment == "POSITIVE":
                    flags.append(Flag(
                        type="INCONSISTENCY",
                        message=f"Low rating ({param.rating}/5) but positive sentiment detected",
                        parameter_id=param.parameter_id,
                        parameter_name=param.parameter_name
                    ))
            else:
                flags.append(Flag(
                    type="MISSING_FEEDBACK",
                    message="No feedback provided",
                    parameter_id=param.parameter_id,
                    parameter_name=param.parameter_name
                ))
        
        # Check for duplicate feedback across parameters
        for i in range(len(all_feedback)):
            for j in range(i + 1, len(all_feedback)):
                similarity = calculate_text_similarity(all_feedback[i], all_feedback[j])
                if similarity > 0.75:  # 75% similarity threshold
                    flags.append(Flag(
                        type="DUPLICATE_FEEDBACK",
                        message=f"Similar feedback detected between '{request.parameters[i].parameter_name}' and '{request.parameters[j].parameter_name}' ({int(similarity*100)}% similar)",
                        parameter_id=None,
                        parameter_name=None
                    ))
        
        # Generate overall summary
        combined_feedback = " ".join([f for f in all_feedback if f])
        summary = ""
        
        if combined_feedback and len(combined_feedback) > 50:
            try:
                summarizer_model = get_summarizer()
                # BART works best with 100-1024 tokens
                input_text = combined_feedback[:1024]
                summary_result = summarizer_model(
                    input_text,
                    max_length=60,
                    min_length=20,
                    do_sample=False
                )
                summary = summary_result[0]['summary_text']
            except Exception as e:
                # Fallback: simple extraction
                summary = combined_feedback[:200] + "..." if len(combined_feedback) > 200 else combined_feedback
        else:
            summary = "Insufficient feedback for summary generation."
        
        # Determine overall sentiment — weighted, not simple majority
        if sentiments:
            total = len(sentiments)
            pos = sentiments.count("POSITIVE")
            neg = sentiments.count("NEGATIVE")
            neu = sentiments.count("NEUTRAL")

            pos_ratio = pos / total
            neg_ratio = neg / total

            # Both positive and negative significantly present → MIXED
            if pos_ratio >= 0.3 and neg_ratio >= 0.3:
                overall_sentiment = "MIXED"
            elif neg_ratio >= 0.5:
                overall_sentiment = "NEGATIVE"
            elif pos_ratio >= 0.5:
                overall_sentiment = "POSITIVE"
            elif neu / total >= 0.5:
                overall_sentiment = "NEUTRAL"
            else:
                overall_sentiment = "MIXED"
        else:
            overall_sentiment = "NEUTRAL"
        
        return EvaluationAnalysisResponse(
            summary=summary,
            overall_sentiment=overall_sentiment,
            flags=flags
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation analysis failed: {str(e)}")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": {
            "sentiment_analyzer": sentiment_analyzer is not None,
            "summarizer": summarizer is not None
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
