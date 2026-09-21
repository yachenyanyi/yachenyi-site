---
title: AutoScreenAgent
summary: An experimental Android agent that turns natural-language goals into screen actions through accessibility APIs and LLM tool calling.
status: experimental
featured: true
github: https://github.com/yachenyanyi/AutoScreenAgent
updatedAt: 2026-03-19
seo:
  title: AutoScreenAgent — Android AI Automation Agent
  description: AutoScreenAgent is an Android automation experiment using accessibility APIs, tool calling and multiple LLM providers.
---

## What it is

AutoScreenAgent is an Android automation experiment built around a simple loop: a user provides a goal, a language model chooses a tool, the app performs the screen action, and the result returns to the model for the next step.

## Capabilities

The current public implementation includes:

- natural-language task input
- Android accessibility-tree inspection
- text, view-ID and coordinate based interaction
- tapping, swiping, typing and app launching
- multi-turn tool calling
- configurable model providers, including OpenAI-compatible endpoints

## Architecture

The application is written in Kotlin with Jetpack Compose and separates model access, agent/tool execution, accessibility actions and UI state.

The design is intentionally explicit: model output becomes a bounded tool call rather than unrestricted direct device control.

## Status

The repository is public as an experimental Android agent and serves as a practical exploration of model-driven mobile UI automation.
