# ExpenseSplit

ExpenseSplit is a full-stack personal finance and shared expense management platform designed for individuals, friend groups, roommates, travelers, and small teams.

The application combines personal expense tracking, group expense management, and participant-based expense sharing into a single system. Users can track their own spending, organize expenses into categories, create groups, manage participants, and maintain a structured record of financial activity.

A key design goal of ExpenseSplit is flexibility. Group participants do not need registered accounts. Users can create groups and add manual participants by name, making it suitable for real-world scenarios such as trips, events, shared households, office outings, and informal expense sharing.

## Core Features

### Personal Expense Management

* Record daily expenses
* Organize expenses with custom categories
* Search and filter expenses
* Track spending by date range
* Upload and store expense receipts
* Monitor personal spending history
* View expense summaries and dashboard insights

### Group Management

* Create and manage expense groups
* Add and remove group members
* Archive inactive groups
* Maintain participant records
* Support multiple groups per user

### Participant Management

* Manual participants supported
* Registered user linking
* Participant activity tracking
* Group-based participant organization
* Flexible membership management

### Dashboard & Insights

* Expense summaries
* Monthly spending overview
* Category-based spending breakdowns
* Recent activity tracking
* Quick financial overview

## Example Use Cases

### Personal Budget Tracking

Track everyday spending such as:

* Food
* Transport
* Shopping
* Bills
* Entertainment
* Health
* Travel

### Trip Expense Management

Create a trip group and add participants:

Goa Trip

* Rahul
* Aman
* Priya
* Neha

Only one person needs an account. Others can be added as participants.

### Shared Living Expenses

Manage household spending for:

* Rent
* Utilities
* Groceries
* Internet
* Maintenance

### Event Planning

Track expenses for:

* Parties
* Team outings
* Weddings
* Community events

## Technology Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB Atlas
* Mongoose ODM

### Infrastructure

* Docker
* Docker Compose

### Security

* JWT Authentication
* Helmet
* CORS
* Rate Limiting
* Request Logging

## Architecture

ExpenseSplit follows a modular MVC architecture:

* Models handle database entities
* Controllers manage business logic
* Routes expose API endpoints
* Middleware provides security and request processing
* Services encapsulate reusable functionality
* Utilities provide shared helpers

This architecture supports long-term scalability and maintainability.

## Current Development Status

Implemented:

* Project foundation
* MongoDB integration
* Authentication system
* User management
* Group management
* Participant management
* Personal expense tracking
* Category management
* Dashboard APIs
* Receipt uploads

Planned:

* Group expense splitting
* Settlement calculations
* Cash ledger system
* Friend management
* Financial analytics
* Reports and exports
* Notifications
* Production deployment enhancements

## Vision

ExpenseSplit aims to provide a simple, reliable, and scalable platform for managing both personal and shared finances. The platform is designed to grow from a personal expense tracker into a complete financial collaboration system capable of handling everyday spending, group activities, settlements, and financial insights within a single application.
