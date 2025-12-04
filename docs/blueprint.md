# **App Name**: PokeQuest

## Core Features:

- Task System: Manage tasks with difficulty levels (Easy, Medium, Hard) which translate to base XP rewards (10, 25, 50 XP respectively).
- Daily Streak & Multiplier: Implement a daily streak system that rewards users with an XP multiplier (up to 2.0x at 7+ days) for consistent activity.
- Pokemon Rival Personalities: Four AI rival characters (Team Rocket's Jessie, James, Meowth and Giovanni) each with different passive XP gain behaviors (Lazy, Focused, Hardcore, Chaotic) which impact the gameplay.
- Offline Rival Progression: The Pokemon rivals should persistently gain XP even when the app is closed, based on actual timestamps, providing a sense of real-time competition. Use calculateOfflineRivalXP to catchup rival experience
- Daily Summary Screen: Present a summary each midnight, detailing completed tasks, earned XP, the rival's XP gain, the day's outcome (win/loss/tie), and streak changes.
- Leveling System: Both the user (Ash) and rival characters should progress through a leveling system with increasing XP requirements per level (starts at 100 XP, +75 per level).
- Time-Locked Tasks: Time-locked tasks must require a specified time to complete and cannot be instantly finished.
- Basic Achievement System: Add some unlockable badges with icons to reward user for game actions.
- Anti-Cheat System: This system monitors client behavior and makes a reasoning decision about banning completion if actions don't follow security checks, preventing cheating via clock manipulation or task spam.
- Local & FCM Notifications: The LLM app tool sends timely updates via push notifications to increase engagement, like alerting the user when the rival gains XP or the streak is in danger.

## Style Guidelines:

- Primary color: Electric Yellow (#FFEA00). Inspired by Pikachu's vibrant color. Provides an energetic and attention-grabbing feel.
- Background color: Light beige (#F5F5DC). This evokes a classic Pokemon game environment without being overly distracting.
- Accent color: Vermillion (#E34234). Mimicking the color of a Poke Ball, used to draw attention to calls to action.
- Body and headline font: 'PT Sans', sans-serif for a blend of modern readability with a touch of warmth.
- Icons should be pixel-art styled, reminiscent of classic Pokemon games.
- Use a tile-based layout to evoke the look and feel of the original gameboy game. Prioritize putting main navigation on the bottom of the layout.
- Implement short, cheerful animations like sparkles and flashes when users complete tasks or level up. Think about using 8-bit styled animations for a throwback effect.