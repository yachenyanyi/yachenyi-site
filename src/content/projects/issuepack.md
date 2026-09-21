---
title: IssuePack
summary: A local-first context packaging tool that turns messy customer chats, screenshots and attachments into traceable issue packages for coding agents.
status: experimental
featured: true
github: https://github.com/yachenyanyi/IssuePack
updatedAt: 2026-08-21
seo:
  title: IssuePack — Customer Context Packaging for Coding Agents
  description: IssuePack preserves chats, images and attachments as structured issue packages that coding agents can inspect directly.
---

## Problem

Software maintenance work rarely arrives as a clean issue. Requirements are spread across chat messages, screenshots, images, documents and file attachments.

Copying only the text loses the relationship between those pieces of context, while summarizing too early can erase details the coding agent still needs.

## Design

IssuePack keeps the collector mechanical and the context traceable.

A package can contain:

- chronological conversation Markdown
- machine-readable raw conversation events
- original screenshots and images
- original attachments
- a result document written after the coding task is completed

The first workflow targets WeCom desktop conversations and keeps customer data local by default.

## Principle

Raw context comes first. Requirement interpretation belongs to the coding agent after it can inspect the repository and the complete issue package together.

## Status

The project is in early design and prototype work, with reliability of package generation prioritized before deeper orchestration or automatic summarization.
