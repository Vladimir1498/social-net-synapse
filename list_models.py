"""List available Grok models."""
import asyncio
import os

async def list_models():
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        print("Set XAI_API_KEY")
        return

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        models = await client.models.list()
        for m in models.data:
            print(m.id)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(list_models())
