"""
AI Assistant Router
API endpoints for AI-powered chat and action execution
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select

from core.database import get_db
from services.ai_service import ai_service, AIMessage, AIProvider
from services.action_registry import action_registry, ActionResult
from models.domain import DeveloperAccount, AIProviderConfig
from core.deps import get_current_developer

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    provider: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    execute_actions: bool = True


class ChatResponse(BaseModel):
    content: str
    action_executed: Optional[Dict[str, Any]] = None
    action_result: Optional[Dict[str, Any]] = None
    provider: str
    model: str


class ProviderConfigCreate(BaseModel):
    provider: str
    api_key: str
    model_name: str
    is_active: bool = True
    priority: int = 0
    settings: Optional[Dict[str, Any]] = None


class ProviderConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None


class ProviderConfigResponse(BaseModel):
    id: int
    provider: str
    model_name: str
    is_active: bool
    priority: int
    settings: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class ConversationCreate(BaseModel):
    role: str  # 'admin' or 'user'


class ConversationResponse(BaseModel):
    id: int
    role: str
    messages: List[Dict[str, str]]
    context: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to AI assistant
    Only available for Enterprise and Seller tiers
    """
    # Check subscription tier - only Enterprise and Seller have AI access
    tier = current_user.subscription_tier.lower() if current_user.subscription_tier else ""
    if tier not in ['enterprise', 'seller']:
        raise HTTPException(
            status_code=403,
            detail="AI assistant is only available for Enterprise and Seller subscription tiers"
        )
    
    # Set database session for AI service to load API keys
    ai_service.set_database(db)
    
    try:
        # Convert messages to AIMessage format
        ai_messages = [
            AIMessage(role=msg.role, content=msg.content)
            for msg in request.messages
        ]
        
        # Determine provider
        provider = None
        if request.provider:
            try:
                provider = AIProvider(request.provider)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")
        
        # Prepare context
        context = request.context or {}
        context.update({
            "developer_id": current_user.id,
            "user_role": "admin" if current_user.is_verified else "user",
            "subscription_tier": current_user.subscription_tier
        })
        
        # Get AI response
        if request.execute_actions:
            # Use action-aware chat
            ai_response = await ai_service.chat_with_action(
                messages=ai_messages,
                action_context=context,
                provider=provider
            )
        else:
            # Regular chat
            ai_response = await ai_service.chat(
                messages=ai_messages,
                provider=provider,
                context=context
            )
        
        response_data = ChatResponse(
            content=ai_response.content,
            provider=ai_response.provider,
            model=ai_response.model
        )
        
        # Parse and execute action if requested
        if request.execute_actions:
            action_data = action_registry.parse_action_from_response(ai_response.content)
            if action_data:
                action_type, parameters = action_data
                
                # Execute action
                action_result = await action_registry.execute_action(
                    action_type=action_type,
                    parameters=parameters,
                    context=context
                )
                
                response_data.action_executed = {
                    "action": action_type.value,
                    "parameters": parameters
                }
                response_data.action_result = action_result.to_dict()
                
                # Log action execution (would need to implement)
                # await log_ai_action(db, current_user.id, action_type, parameters, action_result)
        
        return response_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.get("/actions")
async def get_available_actions(
    current_user: DeveloperAccount = Depends(get_current_developer)
):
    """
    Get list of available actions for AI
    """
    return {
        "actions": action_registry.get_all_actions()
    }


@router.get("/providers")
async def get_providers(
    current_user: DeveloperAccount = Depends(get_current_developer)
):
    """
    Get available AI providers
    """
    return {
        "providers": [
            {
                "id": provider.value,
                "name": provider.value.title(),
                "available": provider in ai_service.providers
            }
            for provider in AIProvider
        ],
        "default": ai_service.default_provider.value
    }


@router.post("/conversations")
async def create_conversation(
    request: ConversationCreate,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new AI conversation
    """
    try:
        # This would need to be implemented with actual database calls
        # For now, return a mock response
        return {
            "id": 1,
            "role": request.role,
            "messages": [],
            "context": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")


@router.get("/conversations")
async def get_conversations(
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's AI conversations
    """
    try:
        # This would need to be implemented with actual database calls
        return {
            "conversations": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific conversation
    """
    try:
        # This would need to be implemented with actual database calls
        return {
            "id": conversation_id,
            "role": "user",
            "messages": [],
            "context": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a conversation
    """
    try:
        # This would need to be implemented with actual database calls
        return {"message": "Conversation deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


# Admin-only endpoints for managing AI provider configurations
@router.get("/admin/providers")
async def get_provider_configs(
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all AI provider configurations (Admin only)
    """
    # Check if user is admin
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await db.execute(
            select(AIProviderConfig)
            .order_by(AIProviderConfig.priority, AIProviderConfig.id)
        )
        configs = result.scalars().all()
        
        return {
            "providers": [
                {
                    "id": config.id,
                    "provider": config.provider,
                    "model_name": config.model_name,
                    "is_active": config.is_active,
                    "priority": config.priority,
                    "settings": config.settings,
                    "created_at": config.created_at,
                    "updated_at": config.updated_at,
                    "api_key": config.api_key_encrypted[:8] + "..." if config.api_key_encrypted else None  # Partially masked
                }
                for config in configs
            ],
            "default": "ai"  # Default provider label
        }
    except Exception as e:
        # If table doesn't exist, return empty list instead of error
        if "does not exist" in str(e).lower() or "no such table" in str(e).lower():
            return {
                "providers": [],
                "default": "ai"
            }
        raise HTTPException(status_code=500, detail=f"Failed to get provider configs: {str(e)}")


@router.post("/admin/providers")
async def create_provider_config(
    config: ProviderConfigCreate,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new AI provider configuration (Admin only)
    """
    # Check if user is admin
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        new_config = AIProviderConfig(
            provider=config.provider,
            api_key_encrypted=config.api_key,
            model_name=config.model_name,
            is_active=config.is_active,
            priority=config.priority,
            settings=config.settings
        )
        
        db.add(new_config)
        await db.commit()
        await db.refresh(new_config)
        
        return {
            "id": new_config.id,
            "provider": new_config.provider,
            "model_name": new_config.model_name,
            "is_active": new_config.is_active,
            "priority": new_config.priority,
            "settings": new_config.settings,
            "created_at": new_config.created_at,
            "updated_at": new_config.updated_at
        }
    except Exception as e:
        await db.rollback()
        # If table doesn't exist, provide helpful error
        if "does not exist" in str(e).lower() or "no such table" in str(e).lower():
            raise HTTPException(
                status_code=500,
                detail="AI provider config table not found. Please run the database migration script."
            )
        raise HTTPException(status_code=500, detail=f"Failed to create provider config: {str(e)}")


@router.put("/admin/providers/{config_id}")
async def update_provider_config(
    config_id: int,
    config: ProviderConfigUpdate,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an AI provider configuration (Admin only)
    """
    # Check if user is admin
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await db.execute(
            select(AIProviderConfig).where(AIProviderConfig.id == config_id)
        )
        existing_config = result.scalar_one_or_none()
        
        if not existing_config:
            raise HTTPException(status_code=404, detail="Provider config not found")
        
        # Update fields
        if config.api_key is not None:
            existing_config.api_key_encrypted = config.api_key
        if config.model_name is not None:
            existing_config.model_name = config.model_name
        if config.is_active is not None:
            existing_config.is_active = config.is_active
        if config.priority is not None:
            existing_config.priority = config.priority
        if config.settings is not None:
            existing_config.settings = config.settings
        
        await db.commit()
        await db.refresh(existing_config)
        
        return {
            "id": existing_config.id,
            "provider": existing_config.provider,
            "model_name": existing_config.model_name,
            "is_active": existing_config.is_active,
            "priority": existing_config.priority,
            "settings": existing_config.settings,
            "created_at": existing_config.created_at,
            "updated_at": existing_config.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        # If table doesn't exist, provide helpful error
        if "does not exist" in str(e).lower() or "no such table" in str(e).lower():
            raise HTTPException(
                status_code=500,
                detail="AI provider config table not found. Please run the database migration script."
            )
        raise HTTPException(status_code=500, detail=f"Failed to update provider config: {str(e)}")


@router.delete("/admin/providers/{config_id}")
async def delete_provider_config(
    config_id: int,
    current_user: DeveloperAccount = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an AI provider configuration (Admin only)
    """
    # Check if user is admin
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await db.execute(
            select(AIProviderConfig).where(AIProviderConfig.id == config_id)
        )
        config = result.scalar_one_or_none()
        
        if not config:
            raise HTTPException(status_code=404, detail="Provider config not found")
        
        await db.delete(config)
        await db.commit()
        
        return {"message": "Provider config deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        # If table doesn't exist, provide helpful error
        if "does not exist" in str(e).lower() or "no such table" in str(e).lower():
            raise HTTPException(
                status_code=500,
                detail="AI provider config table not found. Please run the database migration script."
            )
        raise HTTPException(status_code=500, detail=f"Failed to delete provider config: {str(e)}")
