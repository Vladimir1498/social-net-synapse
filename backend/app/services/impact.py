"""Impact service for feedback analysis and scoring.

The Impact Engine replaces traditional likes with constructive feedback.
Users give feedback -> LLM analyzes constructiveness -> Impact score increases.
"""

from abc import ABC, abstractmethod
from typing import Literal

from app.config import get_settings

settings = get_settings()


class FeedbackAnalyzer(ABC):
    """Abstract base class for feedback analysis."""

    @abstractmethod
    async def analyze(self, feedback: str) -> tuple[bool, str]:
        """Analyze if feedback is constructive.

        Args:
            feedback: The feedback text to analyze.

        Returns:
            Tuple of (is_constructive, reason).
        """
        pass


class LLMFeedbackAnalyzer(FeedbackAnalyzer):
    """LLM-based feedback analyzer using OpenAI."""

    def __init__(self, api_key: str) -> None:
        """Initialize with OpenAI API key.

        Args:
            api_key: OpenAI API key.
        """
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(api_key=api_key)

    async def analyze(self, feedback: str) -> tuple[bool, str]:
        """Analyze feedback using GPT model.

        Args:
            feedback: The feedback text to analyze.

        Returns:
            Tuple of (is_constructive, reason).
        """
        system_prompt = """You are a feedback quality analyzer. Your job is to determine if feedback is constructive.

Constructive feedback:
- Provides specific, actionable suggestions
- Is respectful and professional
- Explains why something could be improved
- Offers solutions or alternatives
- Is relevant to the context

Non-constructive feedback:
- Is vague or generic ("good job", "nice")
- Is disrespectful or hostile
- Provides no actionable information
- Is irrelevant or spam

Respond with JSON format: {"is_constructive": boolean, "reason": "brief explanation"}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze this feedback: {feedback}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            import json

            result = json.loads(response.choices[0].message.content)
            return result["is_constructive"], result["reason"]

        except Exception as e:
            # Default to not constructive on error
            return False, f"Analysis failed: {str(e)}"


class RuleBasedFeedbackAnalyzer(FeedbackAnalyzer):
    """Simple rule-based feedback analyzer for local use."""

    # Keywords that indicate constructive feedback
    CONSTRUCTIVE_KEYWORDS = [
        "suggest",
        "improve",
        "because",
        "consider",
        "would be better",
        "could",
        "should",
        "recommend",
        "specifically",
        "example",
        "however",
        "alternatively",
        "instead",
        "try",
        "next time",
    ]

    # Keywords that indicate non-constructive feedback
    NON_CONSTRUCTIVE_PATTERNS = [
        "good job",
        "nice work",
        "great",
        "awesome",
        "cool",
        "ok",
        "fine",
        "bad",
        "terrible",
        "sucks",
    ]

    async def analyze(self, feedback: str) -> tuple[bool, str]:
        """Analyze feedback using simple rules.

        Args:
            feedback: The feedback text to analyze.

        Returns:
            Tuple of (is_constructive, reason).
        """
        feedback_lower = feedback.lower().strip()

        # Check minimum length
        if len(feedback_lower) < 20:
            return False, "Feedback is too short to be constructive"

        # Check for constructive keywords
        constructive_count = sum(
            1 for keyword in self.CONSTRUCTIVE_KEYWORDS
            if keyword in feedback_lower
        )

        # Check for non-constructive patterns
        non_constructive_count = sum(
            1 for pattern in self.NON_CONSTRUCTIVE_PATTERNS
            if pattern in feedback_lower
        )

        # Decision logic
        if constructive_count >= 2:
            return True, "Feedback contains constructive suggestions"
        elif constructive_count >= 1 and non_constructive_count == 0:
            return True, "Feedback shows constructive intent"
        elif non_constructive_count > constructive_count:
            return False, "Feedback appears to be generic praise or criticism"
        else:
            # Neutral case - check for specificity
            words = feedback_lower.split()
            if len(words) >= 15:
                return True, "Feedback is detailed enough to be constructive"
            return False, "Feedback lacks specific actionable suggestions"


class ImpactService:
    """Service for managing impact scores and feedback."""

    def __init__(
        self,
        analyzer_type: Literal["llm", "rule"] = "rule",
        openai_api_key: str | None = None,
    ) -> None:
        """Initialize impact service.

        Args:
            analyzer_type: Type of feedback analyzer ('llm' or 'rule').
            openai_api_key: OpenAI API key (required if analyzer_type is 'llm').
        """
        if analyzer_type == "llm" and openai_api_key:
            self.analyzer = LLMFeedbackAnalyzer(api_key=openai_api_key)
        else:
            self.analyzer = RuleBasedFeedbackAnalyzer()

    async def analyze_feedback(self, feedback: str) -> tuple[bool, str]:
        """Analyze if feedback is constructive.

        Args:
            feedback: The feedback text.

        Returns:
            Tuple of (is_constructive, reason).
        """
        return await self.analyzer.analyze(feedback)

    def calculate_impact_points(
        self,
        is_constructive: bool,
        feedback_length: int,
    ) -> int:
        """Calculate impact points to award.

        Args:
            is_constructive: Whether the feedback was constructive.
            feedback_length: Length of the feedback text.

        Returns:
            Number of impact points (0, 1, or 2).
        """
        if not is_constructive:
            return 0

        # Base point for constructive feedback
        points = 1

        # Bonus point for detailed feedback (>200 chars)
        if feedback_length > 200:
            points = 2

        return points


# Global impact service instance
_impact_service: ImpactService | None = None


def get_impact_service() -> ImpactService:
    """Get or create the global impact service instance."""
    global _impact_service

    if _impact_service is None:
        analyzer_type = "llm" if settings.openai_api_key else "rule"
        _impact_service = ImpactService(
            analyzer_type=analyzer_type,
            openai_api_key=settings.openai_api_key,
        )

    return _impact_service
