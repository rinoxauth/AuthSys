"""
AI Service for AuthSys
Multi-provider AI service supporting OpenAI, Gemini, Claude, and custom providers
API keys are loaded from database configuration instead of environment variables
"""
import os
import json
from typing import Optional, Dict, Any, List
from enum import Enum
import httpx
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class AIProvider(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    CLAUDE = "claude"
    CUSTOM = "custom"


class AIMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str


class AIResponse(BaseModel):
    content: str
    provider: str
    model: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None


class AIService:
    def __init__(self):
        self.providers = {
            AIProvider.OPENAI: OpenAIProvider(),
            AIProvider.GEMINI: GeminiProvider(),
            AIProvider.CLAUDE: ClaudeProvider(),
        }
        self.default_provider = AIProvider.OPENAI
        self._db: Optional[AsyncSession] = None
        
    def set_database(self, db: AsyncSession):
        """Set database session for fetching API keys"""
        self._db = db
        
    async def get_provider_config(self, provider: AIProvider) -> Optional[Dict[str, Any]]:
        """Fetch provider configuration from database"""
        if not self._db:
            return None
            
        try:
            from models.domain import AIProviderConfig
            
            result = await self._db.execute(
                select(AIProviderConfig)
                .where(AIProviderConfig.provider == provider.value)
                .where(AIProviderConfig.is_active == True)
                .order_by(AIProviderConfig.priority)
                .limit(1)
            )
            config = result.scalar_one_or_none()
            
            if config:
                return {
                    "api_key": config.api_key_encrypted,
                    "model": config.model_name,
                    "settings": config.settings or {}
                }
        except Exception as e:
            print(f"Error fetching provider config: {e}")
        
        return None
        
    async def chat(
        self,
        messages: List[AIMessage],
        provider: Optional[AIProvider] = None,
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AIResponse:
        """
        Send chat request to AI provider
        """
        provider = provider or self.default_provider
        ai_provider = self.providers.get(provider)
        
        if not ai_provider:
            raise ValueError(f"Provider {provider} not configured")
        
        # Load config from database
        config = await self.get_provider_config(provider)
        if config:
            ai_provider.load_config(config)
        
        return await ai_provider.chat(
            messages=messages,
            context=context,
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def chat_with_action(
        self,
        messages: List[AIMessage],
        action_context: Dict[str, Any],
        provider: Optional[AIProvider] = None
    ) -> AIResponse:
        """
        Chat with action context for intent recognition and parameter extraction
        """
        system_prompt = AIMessage(
            role="system",
            content=self._get_action_system_prompt()
        )
        
        messages_with_context = [system_prompt] + messages
        
        return await self.chat(
            messages=messages_with_context,
            provider=provider,
            context=action_context
        )
    
    def _get_action_system_prompt(self) -> str:
        """
        System prompt for action recognition and parameter extraction
        """
        return """You are an AI assistant for AuthSys, a license management platform. 
You can understand natural language commands and extract structured actions.

Available actions:
- create_license_keys: Create license keys
  Parameters: count (int, 1-100), duration_days (int), max_uses (int), note (str), expires_at (str)
- ban_user: Ban a user
  Parameters: username (str), reason (str), expires_at (str)
- create_application: Create a new application
  Parameters: name (str), version (str)
- get_analytics: Get analytics data
  Parameters: period (str), metric (str)
- get_documentation: Get help/documentation
  Parameters: topic (str)

When the user asks for something, respond with:
1. A natural language response
2. If an action is needed, include it in JSON format: {"action": "action_name", "parameters": {...}}

Example:
User: "Create 10 license keys with 30 days expiry"
Response: I'll create 10 license keys with 30 days expiry for you. {"action": "create_license_keys", "parameters": {"count": 10, "duration_days": 30}}"""
    
    def set_default_provider(self, provider: AIProvider):
        """Set default AI provider"""
        if provider in self.providers:
            self.default_provider = provider


class BaseAIProvider:
    """Base class for AI providers"""
    
    def __init__(self):
        self.api_key = None
        self.model = None
        self.base_url = None
        self.settings = {}
        
    def load_config(self, config: Dict[str, Any]):
        """Load configuration from database"""
        self.api_key = config.get("api_key")
        self.model = config.get("model")
        self.settings = config.get("settings", {})
        
    async def chat(
        self,
        messages: List[AIMessage],
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AIResponse:
        raise NotImplementedError
    
    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, str]]:
        """Format messages for API"""
        return [{"role": msg.role, "content": msg.content} for msg in messages]


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT provider"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.openai.com/v1"
        # Fallback to environment variable if database config not available
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        
    def load_config(self, config: Dict[str, Any]):
        """Load configuration from database"""
        if config.get("api_key"):
            self.api_key = config["api_key"]
        if config.get("model"):
            self.model = config["model"]
        self.settings = config.get("settings", {})
        
    async def chat(
        self,
        messages: List[AIMessage],
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AIResponse:
        if not self.api_key:
            raise ValueError("OpenAI API key not configured in database or environment")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Use settings if available
        temp = self.settings.get("temperature", temperature)
        max_tok = self.settings.get("max_tokens", max_tokens)
        
        payload = {
            "model": self.model,
            "messages": self._format_messages(messages),
            "temperature": temp,
            "max_tokens": max_tok
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            
            return AIResponse(
                content=data["choices"][0]["message"]["content"],
                provider="openai",
                model=self.model,
                tokens_used=data.get("usage", {}).get("total_tokens"),
                finish_reason=data["choices"][0].get("finish_reason")
            )


class GeminiProvider(BaseAIProvider):
    """Google Gemini provider"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        # Fallback to environment variable if database config not available
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-pro")
        
    def load_config(self, config: Dict[str, Any]):
        """Load configuration from database"""
        if config.get("api_key"):
            self.api_key = config["api_key"]
        if config.get("model"):
            self.model = config["model"]
        self.settings = config.get("settings", {})
        
    async def chat(
        self,
        messages: List[AIMessage],
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AIResponse:
        if not self.api_key:
            raise ValueError("Gemini API key not configured in database or environment")
        
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            if msg.role == "system":
                contents.append({"role": "user", "parts": [{"text": f"System: {msg.content}"}]})
            else:
                contents.append({"role": msg.role, "parts": [{"text": msg.content}]})
        
        headers = {"Content-Type": "application/json"}
        
        # Use settings if available
        temp = self.settings.get("temperature", temperature)
        max_tok = self.settings.get("max_tokens", max_tokens)
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temp,
                "maxOutputTokens": max_tok
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            
            return AIResponse(
                content=data["candidates"][0]["content"]["parts"][0]["text"],
                provider="gemini",
                model=self.model,
                tokens_used=data.get("usageMetadata", {}).get("totalTokenCount")
            )


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude provider"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.anthropic.com/v1"
        # Fallback to environment variable if database config not available
        self.api_key = os.getenv("CLAUDE_API_KEY")
        self.model = os.getenv("CLAUDE_MODEL", "claude-3-opus-20240229")
        
    def load_config(self, config: Dict[str, Any]):
        """Load configuration from database"""
        if config.get("api_key"):
            self.api_key = config["api_key"]
        if config.get("model"):
            self.model = config["model"]
        self.settings = config.get("settings", {})
        
    async def chat(
        self,
        messages: List[AIMessage],
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AIResponse:
        if not self.api_key:
            raise ValueError("Claude API key not configured in database or environment")
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Use settings if available
        temp = self.settings.get("temperature", temperature)
        max_tok = self.settings.get("max_tokens", max_tokens)
        
        payload = {
            "model": self.model,
            "messages": self._format_messages(messages),
            "temperature": temp,
            "max_tokens": max_tok
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            
            return AIResponse(
                content=data["content"][0]["text"],
                provider="claude",
                model=self.model,
                tokens_used=data.get("usage", {}).get("input_tokens") + data.get("usage", {}).get("output_tokens"),
                finish_reason=data.get("stop_reason")
            )


# Global AI service instance
ai_service = AIService()
