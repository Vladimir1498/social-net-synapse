"""Run database migrations for new columns."""
import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgresql_lx8r_user:dIKLtsNRWTlVU2Y9zLa0MTTy6FSJuFZE@dpg-d75elnmslomc7384abcg-a/postgresql_lx8r"

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text'",
    "ALTER TABLE messages ALTER COLUMN content SET DEFAULT ''",
    "UPDATE messages SET message_type = 'text' WHERE message_type IS NULL",
]

async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    for sql in MIGRATIONS:
        try:
            await conn.execute(sql)
            print(f"OK: {sql[:60]}...")
        except Exception as e:
            print(f"SKIP: {sql[:60]}... ({e})")
    await conn.close()
    print("Done!")

asyncio.run(run())
