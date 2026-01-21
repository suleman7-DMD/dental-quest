# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dental Quest is a collection of standalone HTML applications for dental students. Each HTML file is a complete, self-contained single-page application with embedded CSS and JavaScript.

## Architecture

- **No build system** - Files are plain HTML that can be opened directly in a browser
- **Firebase backend** - All apps use Firebase (v9.22.0 compat) for authentication and realtime database
- **Single-file apps** - Each HTML file contains all markup, styles, and scripts inline

## Files

- `index.html` - Main Dental Student Quest tracker app
- `d3-roadmap.html` - D3 Spring Roadmap planner
- `stimulant-elimination-calculator.html` - Stimulant elimination time calculator

## Development

To work on this project, simply open any HTML file in a browser. No server or build step required.
