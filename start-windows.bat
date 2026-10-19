@echo off
if not exist .env copy .env.example .env >nul
npm run dev
