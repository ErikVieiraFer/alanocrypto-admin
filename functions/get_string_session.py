import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from dotenv import load_dotenv

load_dotenv()

API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')

async def main():
    async with TelegramClient(StringSession(), API_ID, API_HASH) as client:
        print('✅ Conectado!')
        print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print('📋 STRING SESSION:')
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print(client.session.save())
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print('\nCopie a string acima e adicione no Railway como TELEGRAM_STRING_SESSION')

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())