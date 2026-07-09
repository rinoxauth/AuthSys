"""
Action Registry for AI Assistant
Handles registration and execution of actions that AI can perform
"""
from typing import Dict, Any, Optional, Callable
from abc import ABC, abstractmethod
from enum import Enum
import json


class ActionType(str, Enum):
    CREATE_LICENSE_KEYS = "create_license_keys"
    BAN_USER = "ban_user"
    CREATE_APPLICATION = "create_application"
    GET_ANALYTICS = "get_analytics"
    GET_DOCUMENTATION = "get_documentation"
    UNBAN_USER = "unban_user"
    DELETE_LICENSE_KEY = "delete_license_key"
    UPDATE_LICENSE_KEY = "update_license_key"
    CREATE_USER = "create_user"
    DELETE_USER = "delete_user"


class ActionResult:
    """Result of an action execution"""
    def __init__(
        self,
        success: bool,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        self.success = success
        self.message = message
        self.data = data or {}
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data,
            "error": self.error
        }


class BaseAction(ABC):
    """Base class for all actions"""
    
    def __init__(self):
        self.name = self.__class__.__name__
    
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        """Execute the action with given parameters"""
        pass
    
    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate parameters before execution"""
        pass
    
    @abstractmethod
    def get_required_permissions(self) -> list[str]:
        """Get required permissions for this action"""
        pass
    
    def get_description(self) -> str:
        """Get action description for AI"""
        return ""


class CreateLicenseKeysAction(BaseAction):
    """Action to create license keys"""
    
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        try:
            count = parameters.get("count", 1)
            duration_days = parameters.get("duration_days", 30)
            max_uses = parameters.get("max_uses", 1)
            note = parameters.get("note", "")
            expires_at = parameters.get("expires_at")
            
            app_id = context.get("app_id")
            developer_id = context.get("developer_id")
            
            if not app_id:
                return ActionResult(False, "No application selected")
            
            return ActionResult(
                success=True,
                message=f"Created {count} license keys with {duration_days} days duration",
                data={
                    "count": count,
                    "duration_days": duration_days,
                    "max_uses": max_uses,
                    "keys": [f"KEY-{i}" for i in range(count)]
                }
            )
        except Exception as e:
            return ActionResult(False, f"Failed to create license keys: {str(e)}")
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        count = parameters.get("count", 1)
        if not isinstance(count, int) or count < 1 or count > 100:
            return False, "Count must be between 1 and 100"
        
        duration_days = parameters.get("duration_days", 30)
        if not isinstance(duration_days, int) or duration_days < 0:
            return False, "Duration days must be a positive integer"
        
        return True, None
    
    def get_required_permissions(self) -> list[str]:
        return ["license:create"]
    
    def get_description(self) -> str:
        return "Create license keys. Parameters: count (int, 1-100), duration_days (int), max_uses (int), note (str), expires_at (str)"


class BanUserAction(BaseAction):
    """Action to ban a user"""
    
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        try:
            username = parameters.get("username")
            reason = parameters.get("reason", "Violation of terms")
            expires_at = parameters.get("expires_at")
            
            if not username:
                return ActionResult(False, "Username is required")
            
            app_id = context.get("app_id")
            
            # This would need to be implemented with actual database calls
            return ActionResult(
                success=True,
                message=f"User '{username}' has been banned. Reason: {reason}",
                data={
                    "username": username,
                    "reason": reason,
                    "expires_at": expires_at
                }
            )
        except Exception as e:
            return ActionResult(False, f"Failed to ban user: {str(e)}")
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        username = parameters.get("username")
        if not username or not isinstance(username, str):
            return False, "Username is required and must be a string"
        
        return True, None
    
    def get_required_permissions(self) -> list[str]:
        return ["user:ban"]
    
    def get_description(self) -> str:
        return "Ban a user. Parameters: username (str, required), reason (str), expires_at (str)"


class CreateApplicationAction(BaseAction):
    """Action to create a new application"""
    
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        try:
            name = parameters.get("name")
            version = parameters.get("version", "1.0.0")
            
            if not name:
                return ActionResult(False, "Application name is required")
            
            developer_id = context.get("developer_id")
            
            # This would need to be implemented with actual database calls
            return ActionResult(
                success=True,
                message=f"Application '{name}' created successfully",
                data={
                    "name": name,
                    "version": version,
                    "app_secret": f"SECRET-{name.upper()}"
                }
            )
        except Exception as e:
            return ActionResult(False, f"Failed to create application: {str(e)}")
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        name = parameters.get("name")
        if not name or not isinstance(name, str):
            return False, "Application name is required and must be a string"
        
        return True, None
    
    def get_required_permissions(self) -> list[str]:
        return ["app:create"]
    
    def get_description(self) -> str:
        return "Create a new application. Parameters: name (str, required), version (str)"


class GetAnalyticsAction(BaseAction):
    """Action to get analytics data"""
    
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        try:
            period = parameters.get("period", "7d")
            metric = parameters.get("metric", "users")
            
            app_id = context.get("app_id")
            
            # This would need to be implemented with actual database calls
            return ActionResult(
                success=True,
                message=f"Analytics for {metric} over {period}",
                data={
                    "period": period,
                    "metric": metric,
                    "value": 1234  # Mock data
                }
            )
        except Exception as e:
            return ActionResult(False, f"Failed to get analytics: {str(e)}")
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None
    
    def get_required_permissions(self) -> list[str]:
        return ["analytics:view"]
    
    def get_description(self) -> str:
        return "Get analytics data. Parameters: period (str, default: 7d), metric (str, default: users)"


class GetDocumentationAction(BaseAction):
    """Action to get documentation/help"""
    
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        try:
            topic = parameters.get("topic", "")
            
            # This would need to be implemented with knowledge base
            return ActionResult(
                success=True,
                message=f"Documentation for: {topic}",
                data={
                    "topic": topic,
                    "content": f"Here's the documentation for {topic}..."
                }
            )
        except Exception as e:
            return ActionResult(False, f"Failed to get documentation: {str(e)}")
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None
    
    def get_required_permissions(self) -> list[str]:
        return []  # No special permissions needed
    
    def get_description(self) -> str:
        return "Get documentation/help. Parameters: topic (str)"


class ActionRegistry:
    """Registry for all available actions"""
    
    def __init__(self):
        self.actions: Dict[ActionType, BaseAction] = {}
        self._register_default_actions()
    
    def _register_default_actions(self):
        """Register default actions"""
        self.register_action(ActionType.CREATE_LICENSE_KEYS, CreateLicenseKeysAction())
        self.register_action(ActionType.BAN_USER, BanUserAction())
        self.register_action(ActionType.CREATE_APPLICATION, CreateApplicationAction())
        self.register_action(ActionType.GET_ANALYTICS, GetAnalyticsAction())
        self.register_action(ActionType.GET_DOCUMENTATION, GetDocumentationAction())
    
    def register_action(self, action_type: ActionType, action: BaseAction):
        """Register a new action"""
        self.actions[action_type] = action
    
    def get_action(self, action_type: ActionType) -> Optional[BaseAction]:
        """Get an action by type"""
        return self.actions.get(action_type)
    
    async def execute_action(
        self,
        action_type: ActionType,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionResult:
        """Execute an action with validation and permission checks"""
        action = self.get_action(action_type)
        
        if not action:
            return ActionResult(False, f"Action '{action_type}' not found")
        
        # Validate parameters
        is_valid, error_message = action.validate_parameters(parameters)
        if not is_valid:
            return ActionResult(False, f"Invalid parameters: {error_message}")
        
        # Check permissions (would need to implement permission system)
        required_permissions = action.get_required_permissions()
        user_permissions = context.get("permissions", [])
        
        # For now, skip permission check if no permissions required
        if required_permissions and not all(perm in user_permissions for perm in required_permissions):
            return ActionResult(False, "Insufficient permissions")
        
        # Execute action
        return await action.execute(parameters, context)
    
    def get_all_actions(self) -> Dict[str, str]:
        """Get all available actions with descriptions"""
        return {
            action_type.value: action.get_description()
            for action_type, action in self.actions.items()
        }
    
    def parse_action_from_response(self, ai_response: str) -> Optional[tuple[ActionType, Dict[str, Any]]]:
        """
        Parse action from AI response
        Expected format: {"action": "action_name", "parameters": {...}}
        """
        try:
            # Look for JSON in the response
            start_idx = ai_response.find("{")
            end_idx = ai_response.rfind("}") + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = ai_response[start_idx:end_idx]
                action_data = json.loads(json_str)
                
                action_name = action_data.get("action")
                parameters = action_data.get("parameters", {})
                
                if action_name:
                    try:
                        action_type = ActionType(action_name)
                        return action_type, parameters
                    except ValueError:
                        pass
            
            return None
        except Exception:
            return None


# Global action registry instance
action_registry = ActionRegistry()
