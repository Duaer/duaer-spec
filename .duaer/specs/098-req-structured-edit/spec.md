# Feature Specification: Structured requirements edit

**Feature Branch**: `feat/req-structured-edit`  
**Brief**: `.duaer/specs/098-req-structured-edit/`  
**Status**: Accepted

## Goal

Requirements fields keep the same structured look while editing — row/list
items with add/remove — instead of collapsing into a raw textarea.

## Acceptance

1. Clicking a requirements field opens structured item rows (same chrome as view)
2. Enter /「添加一条」adds a row; empty Backspace / × removes a row
3. Blur commits text back to the card (bullet/numbered/para serialization)
4. Confirm + revise cards both use this editor
5. `npm test` + `npm run test:live` pass
