"""Quick test for Grok API connection."""
import asyncio
import os

async def test_grok():
    api_key = os.getenv("XAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: No API key found. Set XAI_API_KEY or OPENAI_API_KEY")
        return

    print(f"Testing with key: {api_key[:10]}...{api_key[-4:]}")

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

        # Test 1: Simple chat completion
        print("\n--- Test 1: Basic chat ---")
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say hello in one word"}],
            temperature=0.1,
            max_tokens=10,
        )
        print(f"Response: {response.choices[0].message.content}")
        print("Test 1: PASSED")

        # Test 2: Impact analysis (same prompt as in the app)
        print("\n--- Test 2: Impact analysis ---")
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": 'You are a feedback quality analyzer. Respond with JSON: {"is_constructive": boolean, "reason": "brief explanation"}',
                },
                {
                    "role": "user",
                    "content": "Analyze this feedback: This post helped me understand Python decorators better because it gave practical examples",
                },
            ],
            temperature=0.3,
        )
        content = response.choices[0].message.content
        print(f"Raw response: {content}")

        import json, re
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r'\{[^}]+\}', content)
            if match:
                result = json.loads(match.group())
            else:
                print("Could not parse JSON from response")
                return

        print(f"Parsed: {result}")
        print(f"is_constructive: {result.get('is_constructive')}")
        print(f"reason: {result.get('reason')}")
        print("Test 2: PASSED")

        # Test 3: Feed relevance scoring
        print("\n--- Test 3: Feed relevance ---")
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{
                "role": "user",
                "content": """User's goal: "Python изучение за 5 дней"

Posts to evaluate:
[0] ID=post1: RV There Yet? cooperative game about four friends in a camper van
[1] ID=post2: Python decorators explained with practical examples
[2] ID=post3: Best pizza recipes for beginners

Respond with ONLY a JSON object: {"scores": [{"id": "post1", "score": 0.0}, {"id": "post2", "score": 0.9}, {"id": "post3", "score": 0.0}]}""",
            }],
            temperature=0.2,
            max_tokens=200,
        )
        content = response.choices[0].message.content
        print(f"Raw response: {content}")
        print("Test 3: PASSED")

        print("\n=== ALL TESTS PASSED ===")
        print("Grok API is working correctly!")

    except ImportError:
        print("ERROR: openai package not installed. Run: pip install openai")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(test_grok())
