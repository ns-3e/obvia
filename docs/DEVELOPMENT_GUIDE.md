# Obvia — Development Guide

## Overview

This guide provides comprehensive information for developers and AI agents working on the Obvia project. It covers the project structure, development practices, documentation standards, and guidelines for effective collaboration.

## Project Structure

```
obvia/
├── backend/                    # Django backend application
│   ├── books/                 # Core book management
│   ├── libraries/             # Library organization
│   ├── notes/                 # Notes and reviews
│   ├── files/                 # File management
│   ├── search/                # Search functionality
│   ├── ingest/                # External API integration
│   └── obvia_core/            # Django project settings
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
├── docker/                    # Docker configuration
├── scripts/                   # Development and deployment scripts
├── ArchitectureDesignDoc.md   # High-level architecture
├── PROGRESS.md               # Development progress tracking
├── Bugs.md                   # Bug tracking and resolution
├── Enhancements.md           # Future feature tracking
├── README.md                 # Project overview and setup
├── MANUAL_RUNBOOK.md         # Manual testing procedures
└── docker-compose.yml        # Service orchestration
```

## Documentation Structure

### Root-Level Documentation

#### ArchitectureDesignDoc.md
- **Purpose**: High-level system architecture and design decisions
- **Audience**: Developers, architects, AI agents
- **Content**: Technology stack, module architecture, data flows, security considerations
- **Update Frequency**: When architectural decisions change

#### PROGRESS.md
- **Purpose**: Track development progress and completion status
- **Audience**: Project managers, developers, AI agents
- **Content**: Phase-based checklist, completion status, current focus areas
- **Update Frequency**: After each feature completion or bug fix

#### Bugs.md
- **Purpose**: Track and manage bugs and issues
- **Audience**: Developers, QA, AI agents
- **Content**: Bug severity levels, resolution steps, prevention guidelines
- **Update Frequency**: When bugs are discovered or resolved

#### Enhancements.md
- **Purpose**: Track future features and improvements
- **Audience**: Product managers, developers, AI agents
- **Content**: Feature requests, implementation complexity, priority levels
- **Update Frequency**: When new ideas emerge or priorities change

### Module-Level Documentation

#### Interface.md Files
- **Location**: Each major module directory
- **Purpose**: Module-specific interface documentation
- **Content**: Purpose, responsibilities, API endpoints, input/output specifications
- **Examples**: `backend/books/Interface.md`, `frontend/src/components/Interface.md`

## Development Philosophy

### Vibe Coding Principles
1. **Clear Summaries**: Every feature and change should have a clear, concise summary
2. **Comprehensive Docstrings**: All code should include detailed docstrings explaining purpose and usage
3. **Digestible Phases**: Break large features into smaller, manageable phases
4. **Continuous Tracking**: Update PROGRESS.md after each completed task
5. **Transparency**: Document all decisions, bugs, and scope changes

### AI + Human Collaboration
1. **Self-Documenting Code**: Write code that explains itself through clear naming and structure
2. **Context Preservation**: Maintain context in documentation for future AI agents
3. **Guardrails**: Document special instructions and limitations for AI agents
4. **Incremental Development**: Build and test features in small, verifiable steps
5. **Error Handling**: Comprehensive error handling with user-friendly messages

## Development Workflow

### Phase-Based Development
1. **Phase Planning**: Define clear objectives and acceptance criteria
2. **Implementation**: Build features in logical, testable increments
3. **Testing**: Verify functionality before marking as complete
4. **Documentation**: Update relevant documentation files
5. **Progress Tracking**: Mark completed items in PROGRESS.md

### Code Quality Standards
1. **Consistency**: Follow established patterns and conventions
2. **Readability**: Write code that's easy to understand and maintain
3. **Performance**: Consider performance implications of design decisions
4. **Security**: Implement proper validation and security measures
5. **Accessibility**: Ensure features are accessible to all users

### Testing Requirements
1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions and API endpoints
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test with realistic data volumes
5. **Accessibility Tests**: Ensure WCAG compliance

## AI Agent Guidelines

### Working with the Codebase
1. **Read Documentation First**: Always review relevant Interface.md files before making changes
2. **Follow Established Patterns**: Use existing code patterns and conventions
3. **Update Documentation**: Keep documentation current with code changes
4. **Test Thoroughly**: Verify changes work as expected before marking complete
5. **Ask for Clarification**: When uncertain, ask for clarification rather than making assumptions

### Code Implementation
1. **Clear Commit Messages**: Write descriptive commit messages explaining what and why
2. **Incremental Changes**: Make small, focused changes that are easy to review
3. **Error Handling**: Implement comprehensive error handling for all user-facing features
4. **Performance Consideration**: Consider performance implications of implementation choices
5. **Accessibility**: Ensure all new features are accessible

### Documentation Updates
1. **Interface.md Files**: Update when changing module interfaces or APIs
2. **PROGRESS.md**: Mark items as complete only after thorough testing
3. **Bugs.md**: Document any bugs discovered during development
4. **README.md**: Update setup and usage instructions when needed
5. **Code Comments**: Add inline comments for complex logic

## Common Development Tasks

### Adding New Features
1. **Plan the Feature**: Define requirements and acceptance criteria
2. **Update PROGRESS.md**: Add the feature to the appropriate phase
3. **Implement Backend**: Create models, APIs, and business logic
4. **Implement Frontend**: Create UI components and user interactions
5. **Test Thoroughly**: Verify functionality across different scenarios
6. **Update Documentation**: Update relevant Interface.md files
7. **Mark Complete**: Update PROGRESS.md when feature is fully implemented

### Fixing Bugs
1. **Reproduce the Bug**: Understand the exact conditions that cause the issue
2. **Update Bugs.md**: Document the bug with severity and reproduction steps
3. **Implement Fix**: Create a targeted fix that addresses the root cause
4. **Test the Fix**: Verify the fix resolves the issue without introducing new problems
5. **Update Documentation**: Document the fix and any lessons learned
6. **Mark Resolved**: Move the bug from open to resolved in Bugs.md

### Code Reviews
1. **Functionality**: Does the code work as intended?
2. **Code Quality**: Is the code readable, maintainable, and follows conventions?
3. **Performance**: Are there any performance concerns?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Is the code adequately tested?
6. **Documentation**: Is the documentation updated?

## Environment Setup

### Prerequisites
- Docker and Docker Compose
- Git
- Node.js (for frontend development)
- Python 3.11+ (for backend development)

### Quick Start
1. **Clone the Repository**: `git clone <repository-url>`
2. **Navigate to Project**: `cd obvia`
3. **Start Services**: `./scripts/dev.sh`
4. **Access Application**: 
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

### Development Commands
```bash
# Start development environment
./scripts/dev.sh

# Run backend tests
docker compose exec backend python manage.py test

# Run frontend tests
cd frontend && npm test

# Create database backup
./scripts/backup.sh

# Deploy to production
./scripts/deploy.sh
```

## Troubleshooting

### Common Issues
1. **Port Conflicts**: Check if ports 3306, 8000, or 5173 are in use
2. **Database Issues**: Ensure MySQL container is healthy before starting backend
3. **Camera Access**: Allow camera permissions for barcode scanning
4. **File Permissions**: Check file system permissions for media uploads
5. **Memory Issues**: Monitor resource usage with large libraries

### Debugging Tools
1. **Docker Logs**: `docker compose logs -f [service]`
2. **Database Access**: `docker compose exec mysql mysql -u obvia -p obvia`
3. **Backend Shell**: `docker compose exec backend python manage.py shell`
4. **Frontend Dev Tools**: Browser developer tools for frontend debugging

## Best Practices

### Code Organization
1. **Single Responsibility**: Each module and function should have a single, clear purpose
2. **Dependency Injection**: Use dependency injection for external services
3. **Error Boundaries**: Implement error boundaries for graceful error handling
4. **Configuration Management**: Use environment variables for configuration
5. **Logging**: Implement comprehensive logging for debugging and monitoring

### Performance Optimization
1. **Database Queries**: Optimize queries with proper indexing and eager loading
2. **Frontend Rendering**: Use React.memo and useMemo for expensive operations
3. **Image Optimization**: Implement lazy loading and compression for images
4. **Caching**: Use Redis for caching frequently accessed data
5. **Bundle Size**: Minimize JavaScript bundle size with code splitting

### Security Considerations
1. **Input Validation**: Validate all user inputs on both frontend and backend
2. **SQL Injection**: Use parameterized queries and ORM methods
3. **XSS Prevention**: Sanitize user-generated content
4. **File Uploads**: Validate file types and sizes
5. **API Security**: Implement rate limiting and authentication where needed

## Contributing

### Development Process
1. **Create Feature Branch**: `git checkout -b feature/feature-name`
2. **Implement Changes**: Follow the development guidelines
3. **Test Thoroughly**: Ensure all tests pass and functionality works
4. **Update Documentation**: Keep documentation current
5. **Create Pull Request**: Submit for review with clear description
6. **Address Feedback**: Respond to review comments and make necessary changes
7. **Merge**: Merge after approval and all checks pass

### Code Standards
1. **Python**: Follow PEP 8 style guide
2. **JavaScript**: Follow ESLint configuration
3. **React**: Follow React best practices and hooks guidelines
4. **Django**: Follow Django best practices and conventions
5. **Documentation**: Use clear, concise language with examples

---

*This development guide should be updated as the project evolves and new patterns emerge. All contributors should reference this guide to maintain consistency and quality.*
