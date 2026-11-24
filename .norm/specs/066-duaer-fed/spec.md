# Feature Specification: Brand live desk as Duaer FED

**Feature Branch**: `feat/duaer-fed`  
**Brief**: `.duaer/specs/066-duaer-fed/`  
**Status**: Active

## Goal

User-facing name for the web confirm desk is **Duaer FED** (Field
Engineering Desk). Chinese keeps「现场开发」as the secondary mark.

## Acceptance

1. Desk header brand + document title show `Duaer FED`
2. zh mark is「现场开发」; en mark is `Field Engineering Desk`
3. README EN/ZH section titles use Duaer FED; CLI help / start banner say FED
4. Agent/system prompts refer to Duaer FED (not only「现场开发」)
5. `duaer live` command path unchanged; `npm test` + `npm run test:live` pass
